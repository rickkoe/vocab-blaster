"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trash2, BookOpen, Upload } from "lucide-react";
import { getQuizzes, deleteQuiz } from "@/lib/storage";
import type { QuizData } from "@/lib/types";

export default function HistoryPage() {
  const [quizzes, setQuizzes] = useState<QuizData[]>([]);

  useEffect(() => {
    setQuizzes(getQuizzes());
  }, []);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm("Delete this quiz?")) {
      deleteQuiz(id);
      setQuizzes(getQuizzes());
    }
  };

  return (
    <main style={{ minHeight: "100vh" }}>
      <div style={{ maxWidth: "700px", margin: "0 auto", padding: "40px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "30px" }}>
          <div>
            <h1 style={{
              fontFamily: "'Fredoka One', cursive",
              fontSize: "2.2em",
              background: "linear-gradient(135deg, var(--primary), var(--secondary))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>
              My Quizzes
            </h1>
            <p style={{ color: "#888", marginTop: "4px" }}>
              {quizzes.length} quiz{quizzes.length !== 1 ? "zes" : ""} saved
            </p>
          </div>
          <Link href="/" style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "12px 20px",
            background: "linear-gradient(135deg, var(--primary), #a855f7)",
            color: "white",
            textDecoration: "none",
            borderRadius: "50px",
            fontFamily: "'Fredoka One', cursive",
            fontSize: "1em",
            transition: "all 0.3s",
          }}>
            <Upload size={18} />
            New Quiz
          </Link>
        </div>

        {quizzes.length === 0 ? (
          <div style={{
            background: "var(--card)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "24px",
            padding: "60px 40px",
            textAlign: "center",
          }}>
            <BookOpen size={52} style={{ color: "#555", margin: "0 auto 16px" }} />
            <p style={{ color: "#888", fontSize: "1.1em" }}>No quizzes yet!</p>
            <p style={{ color: "#555", marginTop: "8px" }}>Upload a vocab worksheet to get started.</p>
            <Link href="/" style={{
              display: "inline-block",
              marginTop: "20px",
              padding: "12px 28px",
              background: "linear-gradient(135deg, var(--primary), #a855f7)",
              color: "white",
              textDecoration: "none",
              borderRadius: "50px",
              fontFamily: "'Fredoka One', cursive",
              fontSize: "1em",
            }}>
              Upload a Worksheet
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {quizzes.map((quiz) => (
              <Link
                key={quiz.id}
                href={`/quiz/${quiz.id}`}
                style={{ textDecoration: "none" }}
              >
                <div
                  style={{
                    background: "var(--card)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "18px",
                    padding: "20px 24px",
                    cursor: "pointer",
                    transition: "all 0.3s",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--primary)";
                    e.currentTarget.style.transform = "translateX(4px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                    e.currentTarget.style.transform = "translateX(0)";
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontFamily: "'Fredoka One', cursive",
                      fontSize: "1.2em",
                      color: "var(--secondary)",
                    }}>
                      {quiz.title}
                    </div>
                    <div style={{ fontSize: "0.85em", color: "#666", marginTop: "4px" }}>
                      {quiz.words.length} words
                      {quiz.sourceFileName && ` • ${quiz.sourceFileName}`}
                      {" • "}{new Date(quiz.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{
                      background: "rgba(108,92,231,0.15)",
                      color: "var(--primary)",
                      padding: "4px 12px",
                      borderRadius: "20px",
                      fontSize: "0.8em",
                      fontWeight: 700,
                      whiteSpace: "nowrap",
                    }}>
                      Play →
                    </div>
                    <button
                      onClick={(e) => handleDelete(quiz.id, e)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#555",
                        cursor: "pointer",
                        padding: "4px",
                        transition: "color 0.2s",
                        display: "flex",
                        alignItems: "center",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = "var(--danger)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = "#555"; }}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
