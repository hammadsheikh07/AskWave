import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "AskWave",
  description: "Live Q&A, powered by the crowd.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-stone-50 text-neutral-900 antialiased">
        {children}
      </body>
    </html>
  );
}
