import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = process.env.CLAUDE_MODEL ?? "claude-sonnet-4-6";
const FREE_MONTHLY_LIMIT = 5;

const SYSTEM_PROMPT = `You are a vocabulary worksheet parser. Extract all vocabulary words from the provided content and return a JSON object.

Return ONLY valid JSON, no markdown, no explanation. The format must be:
{
  "title": "root word(s) and meaning, e.g. TRACT = pull",
  "rootInfo": "brief description of the root, e.g. Latin root TRACT means to pull",
  "words": [
    {
      "word": "the vocabulary word",
      "pos": "part of speech (noun/verb/adjective/adverb)",
      "def": "full definition from the worksheet",
      "short": "5-7 word short definition",
      "root": "root breakdown, e.g. tract + ion",
      "sentences": [
        "Example sentence with ___ as blank placeholder for the word.",
        "Another example sentence with ___ as blank.",
        "A third example sentence with ___ as blank."
      ]
    }
  ]
}

If the worksheet doesn't have a clear root word theme, set title to the main topic and rootInfo to a brief description.
Generate 3 example sentences per word if none are provided, using ___ as placeholder for the word.
Extract ALL words you can find — typically 5-20 words.`;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

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

        const isPro = (profile.subscription_status as string) === "pro";
        if (!isPro && count >= FREE_MONTHLY_LIMIT) {
          return NextResponse.json(
            {
              error: `You've used all ${FREE_MONTHLY_LIMIT} free quizzes this month. Upgrade to Pro for unlimited access.`,
              upgradeRequired: true,
            },
            { status: 402 }
          );
        }
      }
    }
    // ─────────────────────────────────────────────────────────

    // Multi-image path: staged pages sent as repeated "files" field
    const multiFiles = formData.getAll("files") as File[];
    if (multiFiles.length > 0) {
      const imageBlocks = await Promise.all(
        multiFiles.map(async (f) => {
          const bytes = await f.arrayBuffer();
          return {
            type: "image" as const,
            source: {
              type: "base64" as const,
              media_type: f.type as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
              data: Buffer.from(bytes).toString("base64"),
            },
          };
        })
      );

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
        console.error("No JSON found in response:", text);
        return NextResponse.json({ error: "Failed to extract vocabulary from file" }, { status: 500 });
      }
      const data = JSON.parse(jsonMatch[0]);
      if (!data.words || !Array.isArray(data.words) || data.words.length === 0) {
        return NextResponse.json({ error: "No vocabulary words found in the file" }, { status: 422 });
      }
      return NextResponse.json(data);
    }

    // Single-file path
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const mimeType = file.type;
    const fileName = file.name.toLowerCase();

    let messages: Anthropic.MessageParam[];

    const isPdf = mimeType === "application/pdf" || fileName.endsWith(".pdf");
    const isImage = mimeType.startsWith("image/");

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
      messages = [
        {
          role: "user",
          content: [
            {
              type: "image" as const,
              source: {
                type: "base64" as const,
                media_type: mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
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
      // Extract text from Word doc
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
        { status: 400 }
      );
    }

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages,
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("No JSON found in response:", text);
      return NextResponse.json({ error: "Failed to extract vocabulary from file" }, { status: 500 });
    }

    const data = JSON.parse(jsonMatch[0]);

    // Validate structure
    if (!data.words || !Array.isArray(data.words) || data.words.length === 0) {
      return NextResponse.json({ error: "No vocabulary words found in the file" }, { status: 422 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("Extract vocab error:", err);
    // Surface the actual API error message so it's debuggable
    const message =
      err instanceof Error ? err.message : "Failed to process file. Please try again.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
