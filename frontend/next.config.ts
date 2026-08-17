import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "s1.ticketm.net" },
      { protocol: "https", hostname: "*.ticketmaster.com" },
      { protocol: "https", hostname: "image.tmdb.org" },
    ],
  },
  // O backend já usa Helmet; o frontend (que é quem de fato serve HTML
  // pro navegador de quem loga como cliente/organizador/portaria) não
  // tinha nenhum header de segurança configurado. Sem CSP de propósito —
  // a portaria precisa de acesso à câmera pra ler QR (html5-qrcode), e um
  // CSP mal calibrado quebraria isso sem dar tempo de testar cada
  // caminho; os headers abaixo cobrem o básico sem esse risco.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
        ],
      },
    ];
  },
};

export default nextConfig;
