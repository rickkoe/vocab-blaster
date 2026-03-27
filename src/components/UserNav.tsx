"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Zap, BookOpen, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

interface Props {
  /** Extra element rendered at the far right, before sign-out (e.g. mute toggle). */
  rightExtra?: React.ReactNode;
}

export default function UserNav({ rightExtra }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  };

  if (!user) return null;

  const onHistory = pathname === "/history";
  const onHome = pathname === "/";

  return (
    <nav style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "10px 0",
      marginBottom: "4px",
      borderBottom: "1px solid rgba(255,255,255,0.06)",
      gap: "12px",
    }}>
      {/* Brand */}
      <Link
        href="/"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          textDecoration: "none",
          color: onHome ? "var(--primary)" : "#888",
          fontFamily: "'Fredoka One', cursive",
          fontSize: "1.15em",
          flexShrink: 0,
          transition: "color 0.2s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = "var(--primary)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = onHome ? "var(--primary)" : "#888"; }}
      >
        <Zap size={18} style={{ flexShrink: 0 }} />
        <span style={{ display: "inline" }}>Vocab Blaster</span>
      </Link>

      {/* Right side */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        {/* My Quizzes */}
        <Link
          href="/history"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "7px 14px",
            borderRadius: "20px",
            textDecoration: "none",
            fontFamily: "'Fredoka One', cursive",
            fontSize: "0.95em",
            background: onHistory ? "rgba(108,92,231,0.18)" : "rgba(255,255,255,0.05)",
            color: onHistory ? "var(--primary)" : "#888",
            border: `1px solid ${onHistory ? "rgba(108,92,231,0.35)" : "rgba(255,255,255,0.08)"}`,
            transition: "all 0.2s",
            whiteSpace: "nowrap",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(108,92,231,0.15)";
            e.currentTarget.style.color = "var(--primary)";
            e.currentTarget.style.borderColor = "rgba(108,92,231,0.35)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = onHistory ? "rgba(108,92,231,0.18)" : "rgba(255,255,255,0.05)";
            e.currentTarget.style.color = onHistory ? "var(--primary)" : "#888";
            e.currentTarget.style.borderColor = onHistory ? "rgba(108,92,231,0.35)" : "rgba(255,255,255,0.08)";
          }}
        >
          <BookOpen size={15} />
          My Quizzes
        </Link>

        {/* Extra slot (e.g. mute button) */}
        {rightExtra}

        {/* Sign out */}
        <button
          onClick={signOut}
          title={`Sign out (${user.email})`}
          style={{
            background: "none",
            border: "none",
            color: "#555",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            padding: "7px",
            borderRadius: "8px",
            transition: "all 0.2s",
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "var(--danger)";
            e.currentTarget.style.background = "rgba(225,112,85,0.08)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "#555";
            e.currentTarget.style.background = "none";
          }}
        >
          <LogOut size={16} />
        </button>
      </div>
    </nav>
  );
}
