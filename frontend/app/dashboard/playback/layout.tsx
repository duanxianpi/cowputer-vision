import type { Metadata } from "next";

export const metadata: Metadata = { title: "Playback" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
