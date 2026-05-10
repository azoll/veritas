import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono, Instrument_Serif } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import "./globals.css";

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Veritas · Trust, Verified.",
  description:
    "AI Verification Infrastructure for Law. Veritas verifies citations, validates holdings, and produces a defensible audit trail for every AI-assisted brief, before it leaves the firm.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider appearance={{ baseTheme: dark }}>
      <html
        lang="en"
        data-theme="dark"
        className={`${plexSans.variable} ${plexMono.variable} ${instrumentSerif.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col bg-bg text-fg">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
