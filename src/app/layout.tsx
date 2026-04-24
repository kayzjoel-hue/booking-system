import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Booking System",
  description: "Hospitality CV services booking",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body suppressHydrationWarning className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
