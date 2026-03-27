import type { Metadata, Viewport } from "next";
import "./globals.css";
import PwaRegister from "@/components/PwaRegister";

export const viewport: Viewport = {
  themeColor: "#6c5ce7",
};

export const metadata: Metadata = {
  title: "Vocab Blaster!",
  description: "Upload a vocab worksheet and blast through quiz games!",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Vocab Blaster",
  },
  icons: {
    apple: "/icons/icon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
