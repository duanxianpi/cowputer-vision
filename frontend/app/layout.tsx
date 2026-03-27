'use client";'

import type { Metadata } from "next";
import { Exo_2, Inter, Roboto_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers/QueryProvider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const robotoMono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin"],
});

const exo2 = Exo_2({
  variable: "--font-exo-2",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    template: "%s | Cowputer Vision",
    default: "Cowputer Vision",
  },
  description: "AI-powered cow monitoring and behavior analysis",
  icons: {
    icon: "/images/favicon.svg",
  },
};


export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${robotoMono.variable} ${exo2.variable}`}>
      <body>
            <Providers>
              {children}
            </Providers>
      </body>
    </html>
  );
}
