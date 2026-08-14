import type { Metadata } from "next";
import { Space_Grotesk, Manrope, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";

// Display/heading — "cartaz de show": condensada o suficiente pra nomes
// longos de line-up sem perder impacto (ver identidade PULSA no plano).
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["500", "700"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PULSA — Ingressos para festivais, festas e grandes jogos",
  description: "Publique eventos, reserve seu lugar, receba seu ingresso.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${spaceGrotesk.variable} ${manrope.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col pb-20 sm:pb-0">
        <Providers>
          <SiteHeader />
          {children}
          <SiteFooter />
          <MobileBottomNav />
        </Providers>
      </body>
    </html>
  );
}
