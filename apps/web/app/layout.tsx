import type { Metadata, Viewport } from "next";
import { ThemeScript } from "@/components/ThemeScript";
import { ToastProvider } from "@/components/Toast";
import { publicSiteUrl } from "@/lib/urls";
import "./globals.css";

const siteUrl = publicSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Termina Icons",
    template: "%s · Termina Icons",
  },
  description:
    "A free, open-source pixel icon set drawn on a 13 by 13 grid and exported as SVG that inherits currentColor.",
  applicationName: "Termina Icons",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Termina", statusBarStyle: "default" },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/icon-180.png",
  },
  openGraph: {
    type: "website",
    siteName: "Termina Icons",
    title: "Termina Icons",
    description: "A free, open-source pixel icon set drawn on a 13 by 13 grid.",
    url: siteUrl,
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FBFBFA" },
    { media: "(prefers-color-scheme: dark)", color: "#191919" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    /* ThemeScript stamps data-theme on this element before React hydrates, so
       the server markup and the client DOM differ here by design. Scoped to
       <html> itself — it does not suppress warnings deeper in the tree. */
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
        <link rel="preload" href="/fonts/WorkSans-Variable.woff2" as="font" type="font/woff2" crossOrigin="" />
      </head>
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
