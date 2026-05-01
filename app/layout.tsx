import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { TerminalShell } from "@/components/TerminalShell";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

const instrument = Instrument_Serif({
  variable: "--font-instrument-serif",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Pulse Terminal",
  description:
    "A career terminal. Rank skills by demand, scarcity, and price — then learn what to learn next.",
  openGraph: {
    title: "Pulse Terminal",
    description:
      "A career terminal. Rank skills by demand, scarcity, and price — then learn what to learn next.",
  },
};

export const viewport = {
  themeColor: "oklch(0.16 0.012 65)",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrains.variable} ${instrument.variable}`}
      data-density="comfortable"
      suppressHydrationWarning
    >
      <body className="min-h-screen flex flex-col">
        <TerminalShell>
          <Header />
          <main className="flex-1 flex flex-col">{children}</main>
        </TerminalShell>
      </body>
    </html>
  );
}
