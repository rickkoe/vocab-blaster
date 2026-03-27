"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut, History, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export default function UserNav() {
  const router = useRouter();
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

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "10px 0",
      marginBottom: "4px",
      borderBottom: "1px solid rgba(255,255,255,0.05)",
      marginTop: "0",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
        <Link href="/" title="Upload new worksheet" style={{ color: "#666", display: "flex", alignItems: "center", transition: "color 0.2s" }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "#666"; }}>
          <Upload size={17} />
        </Link>
        <Link href="/history" title="My Quizzes" style={{ color: "#666", display: "flex", alignItems: "center", transition: "color 0.2s" }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "#666"; }}>
          <History size={17} />
        </Link>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <span style={{ fontSize: "0.78em", color: "#555", maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {user.email}
        </span>
        <button
          onClick={signOut}
          title="Sign out"
          style={{
            background: "none", border: "none", color: "#555",
            cursor: "pointer", display: "flex", alignItems: "center",
            padding: "4px", borderRadius: "6px", transition: "all 0.2s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "var(--danger)"; e.currentTarget.style.background = "rgba(225,112,85,0.08)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "#555"; e.currentTarget.style.background = "none"; }}
        >
          <LogOut size={16} />
        </button>
      </div>
    </div>
  );
}
