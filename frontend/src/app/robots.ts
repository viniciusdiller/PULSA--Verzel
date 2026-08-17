import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://projeto-de-desenvolvimento-verzel.vercel.app";

// Bloqueia só o que exige login e não tem valor de indexação (o guard real
// continua sendo o backend, isso é só uma dica pra crawler não perder tempo).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/profile", "/my-tickets", "/organizer", "/gate", "/t/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
