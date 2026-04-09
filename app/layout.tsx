import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "SCAI Article Generator",
  description: "Visualize and generate SEO-optimized articles with AI",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} dark`}>
      <body className="min-h-screen bg-scai-page text-scai-text antialiased">
        {/* Skip to main content link for accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-scai-brand1 focus:text-scai-page focus:rounded-lg focus:font-medium"
        >
          Skip to main content
        </a>
        {children}
        <Toaster
          theme="dark"
          position="bottom-right"
          expand={false}
          richColors
          toastOptions={{
            style: {
              background: "#0A0A0A",
              border: "1px solid #222222",
              color: "#fff",
              fontSize: "13px",
              padding: "12px 16px",
            },
            className: "!max-w-[320px]",
          }}
        />
      </body>
    </html>
  );
}
