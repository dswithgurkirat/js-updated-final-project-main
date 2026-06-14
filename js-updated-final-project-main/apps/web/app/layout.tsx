import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Smart DSR Portal",
  description: "District Survey Report Automation System"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
