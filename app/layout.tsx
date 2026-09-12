import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Ocean Atlas — A marine field guide",
  description:
    "Explore a source-grounded collection of stylised marine animals, compare sourced lengths and inspect the evidence behind a marine AI guide.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
