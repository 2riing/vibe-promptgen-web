import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "vibe-promptgen",
  description: "Claude Code 바이브코딩용 개발 프로세스 정의서 프롬프트 생성기",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="antialiased min-h-screen">{children}</body>
    </html>
  );
}
