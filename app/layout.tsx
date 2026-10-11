import type { Metadata } from "next";
import "./globals.css";
import "./forms.css";
export const metadata: Metadata = { title: "Church Management", description: "Church member, family, fellowship and accounts management" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body suppressHydrationWarning>{children}</body></html>;
}