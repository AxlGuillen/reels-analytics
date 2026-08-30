import type { MetadataRoute } from "next";
import { appUrl } from "@/modules/oauth/config";

/**
 * Solo la landing es pública e indexable: la raíz redirige (a /landing o al
 * dashboard según sesión) y el resto vive tras el login.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${appUrl()}/landing`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
