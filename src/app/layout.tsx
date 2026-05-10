import type { Metadata } from "next";
import { Inter, Cormorant_Garamond } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Veritas — AI Trust Infrastructure for the Legal Profession",
  description:
    "Every citation defensible. Veritas verifies, adversarially reviews, and audits AI-assisted legal work before it leaves the firm.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${inter.variable} ${cormorant.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col bg-paper text-ink">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
