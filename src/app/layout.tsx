import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lumea — 조명 디자인 스튜디오",
  description: "Lumea는 주거·상업·호스피탈리티 공간을 위한 조명 디자인 스튜디오입니다. 공간에 맞는 빛을 설계합니다.",
  openGraph: {
    title: "Lumea — 조명 디자인 스튜디오",
    description: "빛으로 공간의 온도를 설계합니다.",
    type: "website",
    locale: "ko_KR",
  },
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#07070a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Syncopate:wght@700&display=swap" />
      </head>
      <body>{children}</body>
    </html>
  );
}
