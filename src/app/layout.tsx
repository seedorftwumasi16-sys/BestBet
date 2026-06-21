import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/Providers";
import { BRAND } from "@/lib/constants";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${BRAND.name} - ${BRAND.slogan}`,
    template: `%s | ${BRAND.name}`,
  },
  description: "Premium sportsbook platform. Bet on football, basketball, tennis, and more with the best odds. Bet Smarter. Win Bigger.",
  keywords: ["sportsbook", "betting", "odds", "football", "basketball", "live betting", "BestBet"],
  authors: [{ name: BRAND.name }],
  manifest: "/manifest.json",
  icons: {
    icon: "/logos/icon.svg",
    apple: "/logos/app-icon.svg",
  },
  openGraph: {
    title: `${BRAND.name} - ${BRAND.slogan}`,
    description: "Premium sportsbook platform with the best odds.",
    siteName: BRAND.name,
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFD700" },
    { media: "(prefers-color-scheme: dark)", color: "#0A0A0A" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/logos/app-icon.svg" />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
