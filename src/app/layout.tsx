import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SolGate — Creator Paywall & Membership on Solana",
  description: "Sell memberships, digital products, and gated content with near-zero fees. Powered by Solana.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
