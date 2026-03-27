"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Plus, Check, ArrowLeft, AlertCircle, LogIn } from "lucide-react";
import { getPending, clearPending } from "@/lib/storage";
import { saveQuiz } from "@/lib/supabase/quizzes";
import { createClient } from "@/lib/supabase/client";
import type { VocabWord } from "@/lib/types";
import type { User } from "@supabase/supabase-js";

const POS_OPTIONS = ["noun", "verb", "adjective", "adverb", "pronoun", "preposition", "conjunction", "interjection"];

interface EditableWord extends VocabWord {
  _id: string; // local key for stable React keys
}

function makeEditable(w: VocabWord, index: number): EditableWord {
  return { ...w, _id: `word-${index}-${w.word}` };
}

function blankWord(): EditableWord {
  return { _id: `new-${Date.now()}`, word: "", pos: "noun", def: "", short: "", root: "", sentences: [] };
}

export default function ReviewPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [rootInfo, setRootInfo] = useState("");
  const [sourceFileName, setSourceFileName] = useState<string | undefined>();
  const [words, setWords] = useState<EditableWord[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [user, setUser] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const pending = getPending();
    if (!pending) {
      router.replace("/");
      return;
    }
    setTitle(pending.title);
    setRootInfo(pending.rootInfo);
    setSourceFileName(pending.sourceFileName);
    setWords(pending.words.map((w, i) => makeEditable(w, i)));
    setLoaded(true);

    // Check auth status (non-blocking)
    createClient().auth.getUser().then(({ data }) => setUser(data.user));
  }, [router]);

  const updateWord = (id: string, field: keyof VocabWord, value: string) => {
    setWords((prev) => prev.map((w) => w._id === id ? { ...w, [field]: value } : w));
    // Clear error on edit
    if (errors[`${id}-${field}`]) {
      setErrors((prev) => { const next = { ...prev }; delete next[`${id}-${field}`]; return next; });
    }
  };

  const deleteWord = (id: string) => {
    setWords((prev) => prev.filter((w) => w._id !== id));
  };

  const addWord = () => {
    const blank = blankWord();
    setWords((prev) => [...prev, blank]);
    // Scroll to bottom after render
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    words.forEach((w) => {
      if (!w.word.trim()) newErrors[`${w._id}-word`] = "Word is required";
      if (!w.def.trim()) newErrors[`${w._id}-def`] = "Definition is required";
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleConfirm = async () => {
    if (!validate()) return;
    if (!user) {
      router.push("/auth/login?next=/review");
      return;
    }

    setSaving(true);
    try {
      const saved = await saveQuiz({
        title: title.trim() || "Vocabulary Quiz",
        rootInfo: rootInfo.trim(),
        words: words.map(({ _id: _, ...w }) => ({
          ...w,
          word: w.word.trim(),
          def: w.def.trim(),
          short: w.short.trim() || w.def.split(" ").slice(0, 6).join(" "),
          root: w.root.trim(),
          pos: w.pos.trim() || "noun",
        })),
        sourceFileName,
      });
      clearPending();
      router.push(`/quiz/${saved.id}`);
    } catch (err) {
      setErrors({ _save: err instanceof Error ? err.message : "Failed to save quiz" });
      setSaving(false);
    }
  };

  if (!loaded) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "#888" }}>Loading...</p>
      </div>
    );
  }

  const hasErrors = Object.keys(errors).filter((k) => k !== "_save").length > 0;

  return (
    <main style={{ minHeight: "100vh", paddingBottom: "120px" }}>
      <div style={{ maxWidth: "760px", margin: "0 auto", padding: "30px 20px" }}>

        {/* Header */}
        <div style={{ marginBottom: "28px" }}>
          <button
            onClick={() => router.push("/")}
            style={{
              background: "none", border: "none", color: "#888", cursor: "pointer",
              fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: "0.95em",
              display: "flex", alignItems: "center", gap: "6px", padding: 0, marginBottom: "16px",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#888"; }}
          >
            <ArrowLeft size={16} /> Back to Upload
          </button>

          <h1 style={{
            fontFamily: "'Fredoka One', cursive",
            fontSize: "2.2em",
            background: "linear-gradient(135deg, var(--primary), var(--secondary))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            marginBottom: "6px",
          }}>
            Review Your Words
          </h1>
          <p style={{ color: "#a0a0c0", fontSize: "0.95em" }}>
            Check what Claude extracted. Fix any mistakes, delete bad entries, or add missing words — then confirm to build your quiz.
          </p>
          {sourceFileName && (
            <div style={{
              display: "inline-flex", alignItems: "center", gap: "6px",
              marginTop: "10px", padding: "4px 12px",
              background: "rgba(0,206,201,0.08)", border: "1px solid rgba(0,206,201,0.2)",
              borderRadius: "20px", fontSize: "0.8em", color: "var(--secondary)",
            }}>
              📄 {sourceFileName}
            </div>
          )}
        </div>

        {/* Quiz metadata */}
        <div style={{
          background: "var(--card)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "20px",
          padding: "20px 24px",
          marginBottom: "20px",
          position: "relative",
          overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: "3px",
            background: "linear-gradient(90deg, var(--primary), var(--secondary), var(--accent))",
          }} />
          <div style={{ fontSize: "0.75em", color: "#888", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "12px" }}>
            Quiz Info
          </div>
          <div style={{ display: "grid", gap: "12px" }}>
            <div>
              <label style={{ fontSize: "0.78em", color: "#888", display: "block", marginBottom: "4px" }}>
                Title / Root Theme
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. TRACT = pull"
                style={inputStyle()}
              />
            </div>
            <div>
              <label style={{ fontSize: "0.78em", color: "#888", display: "block", marginBottom: "4px" }}>
                Root Info (optional)
              </label>
              <input
                value={rootInfo}
                onChange={(e) => setRootInfo(e.target.value)}
                placeholder="e.g. Latin root TRACT means to pull"
                style={inputStyle()}
              />
            </div>
          </div>
        </div>

        {/* Word count + top confirm */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: "16px", flexWrap: "wrap", gap: "10px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{
              fontFamily: "'Fredoka One', cursive", fontSize: "1.5em",
              color: "var(--accent)",
            }}>
              {words.length}
            </span>
            <span style={{ color: "#888", fontSize: "0.95em" }}>
              word{words.length !== 1 ? "s" : ""} ready to quiz
            </span>
          </div>
          <ConfirmButton onClick={handleConfirm} hasErrors={hasErrors} wordCount={words.length} saving={saving} />
        </div>

        {/* Auth prompt — shown when not logged in */}
        {loaded && !user && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            gap: "12px", flexWrap: "wrap",
            marginBottom: "16px", padding: "14px 18px",
            background: "rgba(108,92,231,0.08)", border: "1px solid rgba(108,92,231,0.25)",
            borderRadius: "14px",
          }} className="animate-fade-up">
            <span style={{ color: "#a0a0c0", fontSize: "0.9em" }}>
              🔑 Sign in to save your quiz and play across devices.
            </span>
            <button
              onClick={() => router.push("/auth/login?next=/review")}
              style={{
                display: "flex", alignItems: "center", gap: "6px",
                padding: "8px 16px",
                background: "var(--primary)", color: "white", border: "none",
                borderRadius: "20px", cursor: "pointer",
                fontFamily: "'Fredoka One', cursive", fontSize: "0.9em",
                whiteSpace: "nowrap",
              }}
            >
              <LogIn size={15} /> Sign In
            </button>
          </div>
        )}

        {(hasErrors || errors._save) && (
          <div style={{
            display: "flex", alignItems: "center", gap: "8px",
            marginBottom: "16px", padding: "12px 16px",
            background: "rgba(225,112,85,0.1)", border: "1px solid rgba(225,112,85,0.3)",
            borderRadius: "14px", color: "var(--danger)", fontSize: "0.9em", fontWeight: 700,
          }} className="animate-fade-up">
            <AlertCircle size={18} />
            {errors._save ?? "Fix the highlighted fields before continuing."}
          </div>
        )}

        {/* Word cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {words.map((word, index) => (
            <WordCard
              key={word._id}
              word={word}
              index={index}
              errors={errors}
              onChange={updateWord}
              onDelete={deleteWord}
              canDelete={words.length > 1}
            />
          ))}
        </div>

        {/* Add word button */}
        <button
          onClick={addWord}
          style={{
            width: "100%", marginTop: "14px",
            padding: "14px",
            background: "rgba(108,92,231,0.06)",
            border: "2px dashed rgba(108,92,231,0.3)",
            borderRadius: "18px",
            color: "var(--primary)",
            fontFamily: "'Fredoka One', cursive",
            fontSize: "1em", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(108,92,231,0.12)";
            e.currentTarget.style.borderColor = "var(--primary)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(108,92,231,0.06)";
            e.currentTarget.style.borderColor = "rgba(108,92,231,0.3)";
          }}
        >
          <Plus size={18} /> Add Word
        </button>

        <div ref={bottomRef} />
      </div>

      {/* Sticky bottom bar */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: "rgba(15,15,26,0.92)",
        backdropFilter: "blur(12px)",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        padding: "14px 20px",
        display: "flex", alignItems: "center", justifyContent: "center", gap: "14px",
        zIndex: 50,
      }}>
        <span style={{ color: "#666", fontSize: "0.9em" }}>
          {words.length} word{words.length !== 1 ? "s" : ""}
        </span>
        <ConfirmButton onClick={handleConfirm} hasErrors={hasErrors} wordCount={words.length} saving={saving} large />
      </div>
    </main>
  );
}

/* ─── Sub-components ─────────────────────────────────────── */

function ConfirmButton({
  onClick, hasErrors, wordCount, saving = false, large = false,
}: {
  onClick: () => void;
  hasErrors: boolean;
  wordCount: number;
  saving?: boolean;
  large?: boolean;
}) {
  const disabled = wordCount === 0 || saving;
  void hasErrors; // validated before onClick fires
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: large ? "14px 36px" : "10px 24px",
        fontFamily: "'Fredoka One', cursive",
        fontSize: large ? "1.15em" : "1em",
        background: disabled
          ? "rgba(255,255,255,0.06)"
          : "linear-gradient(135deg, var(--success), #00cec9)",
        color: disabled ? "#555" : "white",
        border: "none", borderRadius: "50px",
        cursor: disabled ? "not-allowed" : "pointer",
        display: "flex", alignItems: "center", gap: "8px",
        transition: "all 0.2s",
        boxShadow: disabled ? "none" : "0 4px 20px rgba(0,184,148,0.3)",
      }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.transform = "scale(1.04)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
    >
      <Check size={large ? 20 : 16} />
      {saving ? "Saving..." : "Confirm & Build Quiz"}
    </button>
  );
}

function WordCard({
  word, index, errors, onChange, onDelete, canDelete,
}: {
  word: EditableWord;
  index: number;
  errors: Record<string, string>;
  onChange: (id: string, field: keyof VocabWord, value: string) => void;
  onDelete: (id: string) => void;
  canDelete: boolean;
}) {
  const wordErr = errors[`${word._id}-word`];
  const defErr = errors[`${word._id}-def`];

  return (
    <div style={{
      background: "var(--card)",
      border: `1px solid ${wordErr || defErr ? "rgba(225,112,85,0.4)" : "rgba(255,255,255,0.08)"}`,
      borderRadius: "20px",
      padding: "18px 20px",
      position: "relative",
      transition: "border-color 0.2s",
    }}>
      {/* Card number */}
      <div style={{
        position: "absolute", top: "12px", left: "16px",
        fontFamily: "'Fredoka One', cursive",
        fontSize: "0.75em", color: "#555",
      }}>
        #{index + 1}
      </div>

      {/* Delete button */}
      {canDelete && (
        <button
          onClick={() => onDelete(word._id)}
          title="Remove this word"
          style={{
            position: "absolute", top: "10px", right: "12px",
            background: "none", border: "none",
            color: "#444", cursor: "pointer", padding: "6px",
            borderRadius: "8px", transition: "all 0.2s",
            display: "flex", alignItems: "center",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "var(--danger)";
            e.currentTarget.style.background = "rgba(225,112,85,0.1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "#444";
            e.currentTarget.style.background = "none";
          }}
        >
          <Trash2 size={16} />
        </button>
      )}

      {/* Row 1: Word + POS */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr auto",
        gap: "10px", marginTop: "6px", marginBottom: "12px",
      }}>
        <div>
          <label style={labelStyle}>Word</label>
          <input
            value={word.word}
            onChange={(e) => onChange(word._id, "word", e.target.value)}
            placeholder="vocabulary word"
            style={{
              ...inputStyle(),
              fontSize: "1.15em",
              fontFamily: "'Fredoka One', cursive",
              color: "var(--secondary)",
              borderColor: wordErr ? "var(--danger)" : undefined,
            }}
          />
          {wordErr && <div style={errorStyle}>{wordErr}</div>}
        </div>
        <div style={{ minWidth: "130px" }}>
          <label style={labelStyle}>Part of Speech</label>
          <select
            value={POS_OPTIONS.includes(word.pos) ? word.pos : "noun"}
            onChange={(e) => onChange(word._id, "pos", e.target.value)}
            style={{
              ...inputStyle(),
              cursor: "pointer",
              appearance: "none" as React.CSSProperties["appearance"],
            }}
          >
            {POS_OPTIONS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Row 2: Definition */}
      <div style={{ marginBottom: "12px" }}>
        <label style={labelStyle}>Definition</label>
        <textarea
          value={word.def}
          onChange={(e) => onChange(word._id, "def", e.target.value)}
          placeholder="Full definition"
          rows={2}
          style={{
            ...inputStyle(),
            resize: "vertical",
            minHeight: "60px",
            borderColor: defErr ? "var(--danger)" : undefined,
          }}
        />
        {defErr && <div style={errorStyle}>{defErr}</div>}
      </div>

      {/* Row 3: Root + Short def */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
        <div>
          <label style={labelStyle}>Root Breakdown</label>
          <input
            value={word.root}
            onChange={(e) => onChange(word._id, "root", e.target.value)}
            placeholder="e.g. tract + ion"
            style={inputStyle()}
          />
        </div>
        <div>
          <label style={labelStyle}>Short Definition</label>
          <input
            value={word.short}
            onChange={(e) => onChange(word._id, "short", e.target.value)}
            placeholder="5-7 word summary"
            style={inputStyle()}
          />
        </div>
      </div>
    </div>
  );
}

/* ─── Shared styles ──────────────────────────────────────── */

function inputStyle(): React.CSSProperties {
  return {
    width: "100%",
    padding: "9px 12px",
    fontSize: "0.95em",
    fontFamily: "'Nunito', sans-serif",
    background: "rgba(255,255,255,0.04)",
    border: "1.5px solid rgba(255,255,255,0.1)",
    borderRadius: "10px",
    color: "var(--text)",
    outline: "none",
    transition: "border-color 0.2s",
  };
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.72em",
  color: "#666",
  textTransform: "uppercase",
  letterSpacing: "0.8px",
  marginBottom: "4px",
};

const errorStyle: React.CSSProperties = {
  fontSize: "0.78em",
  color: "var(--danger)",
  marginTop: "4px",
};
