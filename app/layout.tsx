/*
 * Root layout — Socimo-inspired
 * Maintains semantic HTML with professional typography
 */
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Dime Social Network",
    template: "%s · Dime Social Network",
  },
  description:
    "Professional networking: share updates, connect with peers, discover jobs, and build your network.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="socimo-font">
      <body className="socimo-body">{children}</body>
    </html>
  );
}
