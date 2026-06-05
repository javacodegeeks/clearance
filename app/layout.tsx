import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import NavBar from "@/components/layout/nav-bar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Clearance",
  description: "PR review queue with risk scoring and Advisor",
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased h-full flex flex-col`}>
        <NavBar />
        <div className="flex-1 min-h-0">
          {children}
        </div>
        <footer className="border-t" style={{
          backgroundColor: 'var(--surface-base)',
          borderColor: 'var(--border-subtle)'
        }}>
          <div className="container mx-auto px-6 py-6 text-center">
            <p className="font-mono text-[11px]" style={{
              color: 'var(--text-tertiary)',
              opacity: 0.5
            }}>
              Your_Company | © {new Date().getFullYear()}
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
