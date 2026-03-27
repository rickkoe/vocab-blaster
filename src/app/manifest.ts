import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Vocab Blaster",
    short_name: "Vocab Blaster",
    description: "Turn any vocabulary worksheet into a fun quiz game — 6 game modes instantly",
    start_url: "/",
    display: "standalone",
    background_color: "#0f0f1a",
    theme_color: "#6c5ce7",
    orientation: "portrait-primary",
    categories: ["education", "games"],
    icons: [
      {
        src: "/icons/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        // @ts-expect-error purpose is valid in the spec
        purpose: "any maskable",
      },
    ],
  };
}
