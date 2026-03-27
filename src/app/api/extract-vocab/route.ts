import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = process.env.CLAUDE_MODEL ?? "claude-sonnet-4-6";
const FREE_MONTHLY_LIMIT = 5;

const SYSTEM_PROMPT = `You are a vocabulary worksheet parser. Extract all vocabulary words from the provided content and return a JSON object.

Return ONLY valid JSON, no markdown, no explanation. The format must be:
{
  "title": "the topic or theme, e.g. 'Household Vocabulary' or 'TRACT = pull'",
  "rootInfo": "brief description of the topic, e.g. 'Common household items and rooms' or 'Latin root TRACT means to pull'",
  "words": [
    {
      "word": "the vocabulary word",
      "pos": "part of speech (noun/verb/adjective/adverb) — infer from context if not stated, default to noun",
      "def": "full definition or description from the worksheet",
      "short": "5-7 word short definition",
      "root": "root breakdown only if a root-word theme is present (e.g. 'tract + ion'), otherwise use empty string",
      "sentences": [
        "Example sentence with ___ as blank placeholder for the word.",
        "Another example sentence with ___ as blank.",
        "A third example sentence with ___ as blank."
      ]
    }
  ]
}

This works with ANY vocabulary worksheet format:
- Root-word worksheets (TRACT, PORT, SPEC, etc.) — fill in root with the breakdown
- Simple word/definition or word/clue lists — leave root as empty string ""
- Matching worksheets, fill-in-the-blank, picture-based, thematic lists, etc.
- Any subject: household, science, history, foreign language, etc.

Always infer part of speech from context even if not stated. Generate 3 natural example sentences per word using ___ as the placeholder. Extract ALL words you can find — typically 5-20 words.`;

type SupportedImageType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";
const SUPPORTED_IMAGE_TYPES: SupportedImageType[] = ["image/jpeg", "image/png", "image/gif", "image/webp"];

/**
 * Detects the real image format from magic bytes (file signature).
 * Returns the MIME type if supported, "image/heic" if HEIC/HEIF, or "unknown".
 */
function detectImageType(buf: Buffer): SupportedImageType | "image/heic" | "unknown" {
  if (buf.length < 12) return "unknown";
  // JPEG: FF D8 FF
  if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return "image/jpeg";
  // PNG: 89 50 4E 47
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) return "image/png";
  // GIF: 47 49 46 38
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return "image/gif";
  // WEBP: RIFF????WEBP
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
      buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return "image/webp";
  // HEIC/HEIF: ISO Base Media File Format — bytes 4-7 are "ftyp"
  if (buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70) return "image/heic";
  return "unknown";
}

const HEIC_ERROR =
  'Your photo is in HEIC format, which can\'t be processed. On your iPhone go to Settings → Camera → Formats and choose "Most Compatible" to shoot in JPEG, then try again.';

/** Humanise cryptic SDK/API error messages into something useful. */
function humaniseError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (
    msg.includes("did not match the expected pattern") ||
    msg.includes("Invalid URL") ||
    msg.includes("Could not process image") ||
    msg.includes("invalid image")
  ) {
    return "The image could not be processed. Make sure your photo is in JPEG or PNG format and try again.";
  }
  return msg || "Failed to process file. Please try again.";
}

export async function POST(req: NextRequest) {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch (err) {
    console.error("[extract-vocab] Failed to parse form data:", err);
    return NextResponse.json(
      { error: "Could not read the uploaded file. Please try again." },
      { status: 400 },
    );
  }

  try {
    // ── Quota check for logged-in users ──────────────────────
    const supabase = await createSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("subscription_status, monthly_quiz_count, quiz_count_reset_at")
        .eq("id", user.id)
        .single();

      if (profile) {
        const resetAt = new Date(profile.quiz_count_reset_at as string);
        const now = new Date();
        const monthsElapsed =
          (now.getFullYear() - resetAt.getFullYear()) * 12 +
          (now.getMonth() - resetAt.getMonth());

        let count = profile.monthly_quiz_count as number;
        if (monthsElapsed >= 1) {
          await supabase.from("profiles").update({
            monthly_quiz_count: 0,
            quiz_count_reset_at: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
          }).eq("id", user.id);
          count = 0;
        }

        const hasFullAccess = ["pro", "promo"].includes(profile.subscription_status as string);
        if (!hasFullAccess && count >= FREE_MONTHLY_LIMIT) {
          return NextResponse.json(
            {
              error: `You've used all ${FREE_MONTHLY_LIMIT} free quizzes this month. Upgrade to Pro for unlimited access.`,
              upgradeRequired: true,
            },
            { status: 402 },
          );
        }
      }
    }
    // ─────────────────────────────────────────────────────────

    // ── Multi-image path: staged pages sent as repeated "files" field ──
    const multiFiles = formData.getAll("files") as File[];
    if (multiFiles.length > 0) {
      console.log(`[extract-vocab] Multi-file upload: ${multiFiles.length} file(s)`);

      const imageBlocks: Anthropic.ImageBlockParam[] = [];
      for (const f of multiFiles) {
        const bytes = await f.arrayBuffer();
        const buf = Buffer.from(bytes);

        console.log(`[extract-vocab] File: name=${f.name} declaredType=${f.type} size=${buf.length}`);

        if (buf.length === 0) {
          return NextResponse.json(
            { error: "One of the uploaded files appears to be empty. Please try again." },
            { status: 400 },
          );
        }

        const detected = detectImageType(buf);
        console.log(`[extract-vocab] Detected type: ${detected}`);

        // Map any unsupported type (including HEIC that slipped through) to jpeg.
        // Client-side canvas conversion handles HEIC on upload; this is a safety net.
        const mediaType: SupportedImageType =
          detected !== "unknown" && detected !== "image/heic"
            ? detected
            : (SUPPORTED_IMAGE_TYPES as string[]).includes(f.type)
              ? f.type as SupportedImageType
              : "image/jpeg";

        imageBlocks.push({
          type: "image",
          source: {
            type: "base64",
            media_type: mediaType,
            data: buf.toString("base64"),
          },
        });
      }

      const messages: Anthropic.MessageParam[] = [
        {
          role: "user",
          content: [
            ...imageBlocks,
            {
              type: "text",
              text: `These are ${multiFiles.length} page${multiFiles.length > 1 ? "s" : ""} of the same vocabulary worksheet. Extract all vocabulary words across all pages. Follow the JSON format exactly as specified.`,
            },
          ],
        },
      ];

      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages,
      });

      const text = response.content[0].type === "text" ? response.content[0].text : "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error("[extract-vocab] No JSON in multi-file response:", text);
        return NextResponse.json({ error: "Failed to extract vocabulary from file" }, { status: 500 });
      }
      const data = JSON.parse(jsonMatch[0]);
      if (!data.words || !Array.isArray(data.words) || data.words.length === 0) {
        return NextResponse.json({ error: "No vocabulary words found in the file" }, { status: 422 });
      }
      return NextResponse.json(data);
    }

    // ── Single-file path ──────────────────────────────────────────────
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const mimeType = file.type;
    const fileName = file.name.toLowerCase();

    console.log(`[extract-vocab] Single file: name=${file.name} declaredType=${mimeType} size=${buffer.length}`);

    if (buffer.length === 0) {
      return NextResponse.json(
        { error: "The uploaded file appears to be empty. Please try again." },
        { status: 400 },
      );
    }

    let messages: Anthropic.MessageParam[];

    const isPdf = mimeType === "application/pdf" || fileName.endsWith(".pdf");
    const isImage = mimeType.startsWith("image/") || (!mimeType && !fileName.endsWith(".pdf") && !fileName.endsWith(".doc") && !fileName.endsWith(".docx") && !fileName.endsWith(".txt"));

    if (isPdf) {
      messages = [
        {
          role: "user",
          content: [
            {
              type: "document" as const,
              source: {
                type: "base64" as const,
                media_type: "application/pdf",
                data: buffer.toString("base64"),
              },
            },
            {
              type: "text",
              text: "Extract all vocabulary words from this worksheet. Follow the JSON format exactly as specified.",
            },
          ],
        },
      ];
    } else if (isImage) {
      const detected = detectImageType(buffer);
      console.log(`[extract-vocab] Single image detected type: ${detected}`);

      // Map any unsupported type (including HEIC that slipped through) to jpeg.
      const mediaType: SupportedImageType =
        detected !== "unknown" && detected !== "image/heic"
          ? detected
          : (SUPPORTED_IMAGE_TYPES as string[]).includes(mimeType)
            ? mimeType as SupportedImageType
            : "image/jpeg";

      messages = [
        {
          role: "user",
          content: [
            {
              type: "image" as const,
              source: {
                type: "base64" as const,
                media_type: mediaType,
                data: buffer.toString("base64"),
              },
            },
            {
              type: "text",
              text: "Extract all vocabulary words from this worksheet. Follow the JSON format exactly as specified.",
            },
          ],
        },
      ];
    } else if (fileName.endsWith(".docx") || fileName.endsWith(".doc")) {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      messages = [
        {
          role: "user",
          content: `Extract all vocabulary words from this worksheet text:\n\n${result.value}\n\nFollow the JSON format exactly as specified.`,
        },
      ];
    } else if (fileName.endsWith(".txt")) {
      const text = buffer.toString("utf-8");
      messages = [
        {
          role: "user",
          content: `Extract all vocabulary words from this worksheet text:\n\n${text}\n\nFollow the JSON format exactly as specified.`,
        },
      ];
    } else {
      return NextResponse.json(
        { error: "Unsupported file type. Please upload a PDF, image, Word doc, or text file." },
        { status: 400 },
      );
    }

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages,
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("[extract-vocab] No JSON in single-file response:", text);
      return NextResponse.json({ error: "Failed to extract vocabulary from file" }, { status: 500 });
    }

    const data = JSON.parse(jsonMatch[0]);
    if (!data.words || !Array.isArray(data.words) || data.words.length === 0) {
      return NextResponse.json({ error: "No vocabulary words found in the file" }, { status: 422 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("[extract-vocab] Unhandled error:", err);
    return NextResponse.json({ error: humaniseError(err) }, { status: 500 });
  }
}
