"use client";

import { useEffect } from "react";

export default function PwaRegister() {
  useEffect(() => {
    // Only register in production to avoid disrupting dev hot-reload
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js")
      .catch((err) => console.error("SW registration failed:", err));
  }, []);

  return null;
}
