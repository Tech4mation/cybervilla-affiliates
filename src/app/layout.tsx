import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  // latin-ext carries the currency block (U+20A0–U+20AB), which is where the
  // naira sign ₦ lives. With only `latin` the browser substituted a fallback
  // font for that one character, whose crossbars ran into the digits and made
  // every amount look struck through.
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: "CyberVilla Affiliate Portal",
  description: "Track your performance, links, codes, transactions, and payouts as a CyberVilla affiliate.",
  icons: {
    icon: "/images/Login-bg.png",
    shortcut: "/images/Login-bg.png",
    apple: "/images/Login-bg.png",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col dark">{children}</body>
    </html>
  );
}
