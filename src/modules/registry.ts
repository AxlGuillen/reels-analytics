import type { Platform, PlatformProvider } from "@/core/domain";
import { tiktokProvider } from "./tiktok/provider";
import { instagramProvider } from "./instagram/provider";

/**
 * Punto único donde el core resuelve el adapter de cada plataforma.
 * La capa de ingesta/analítica pide `getProvider("tiktok")` sin conocer la clase.
 */
const REGISTRY: Record<Platform, PlatformProvider> = {
  tiktok: tiktokProvider,
  instagram: instagramProvider,
};

export function getProvider(platform: Platform): PlatformProvider {
  return REGISTRY[platform];
}

export function allProviders(): PlatformProvider[] {
  return Object.values(REGISTRY);
}
