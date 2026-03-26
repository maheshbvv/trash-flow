import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TrashFlow - Bulk Delete Gmail Emails | Clean Inbox Fast",
  description: "TrashFlow helps you bulk delete Gmail emails from specific senders or date ranges. Clean your cluttered Gmail inbox in seconds. Free trial available.",
  keywords: "bulk delete gmail, delete emails, clean gmail inbox, gmail cleanup, bulk email deletion, email management",
  openGraph: {
    title: "TrashFlow - Bulk Delete Gmail Emails",
    description: "Bulk delete emails from specific senders or date ranges. Clean your Gmail inbox in seconds.",
    type: "website",
    siteName: "TrashFlow",
  },
  twitter: {
    card: "summary_large_image",
    title: "TrashFlow - Bulk Delete Gmail Emails",
    description: "Bulk delete emails from specific senders or date ranges. Clean your Gmail inbox in seconds.",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: '/trashflow-icon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
        <script async data-uid="7aa23f5a1a" src="https://pendura.kit.com/7aa23f5a1a/index.js"></script>
      </head>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
