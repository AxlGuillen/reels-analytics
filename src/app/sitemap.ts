import type { MetadataRoute } from "next";
import { appUrl } from "@/modules/oauth/config";

/**
 * Solo la landing es pública e indexable (en sus dos idiomas): la raíz redirige
 * (a /landing o al dashboard según sesión) y el resto vive tras el login.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const languages = {
    es: `${appUrl()}/landing`,
    en: `${appUrl()}/en/landing`,
  };

  return [
    {
      url: languages.es,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
      alternates: { languages },
    },
    {
      url: languages.en,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
      alternates: { languages },
    },
  ];
}
