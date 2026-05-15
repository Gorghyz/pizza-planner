import type { MetadataRoute } from "next";

const siteUrl = "https://atabletonton.fr";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date("2026-05-15");

  return [
    {
      url: `${siteUrl}/`,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteUrl}/carte`,
      lastModified,
      changeFrequency: "daily",
      priority: 0.95,
    },
    {
      url: `${siteUrl}/nos-partenaires`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.75,
    },
    {
      url: `${siteUrl}/mentions-legales`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${siteUrl}/politique-confidentialite`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}