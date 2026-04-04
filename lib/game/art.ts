import { loadGame } from "@/lib/game/save";
import type { GameState, NpcState } from "@/lib/game/types";

export const ART_CACHE_KEY = "solo-dm-art-cache";
const MAX_ART_ASSETS = 12;

export type ArtAssetKind = "map" | "location" | "npc";

export type CachedArtAsset = {
  id: string;
  key: string;
  kind: ArtAssetKind;
  title: string;
  subtitle: string;
  imageDataUrl: string;
  generatedAt: string;
};

type ArtCache = Record<string, CachedArtAsset>;

function safeWindow() {
  return typeof window === "undefined" ? null : window;
}

function parseCache(raw: string | null): ArtCache {
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as ArtCache;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    console.error("Failed to parse art cache.", error);
    return {};
  }
}

export function loadArtCache() {
  const browser = safeWindow();
  if (!browser) {
    return {};
  }

  return parseCache(browser.localStorage.getItem(ART_CACHE_KEY));
}

export function saveArtAsset(asset: CachedArtAsset) {
  const browser = safeWindow();
  if (!browser) {
    return null;
  }

  const nextCache = loadArtCache();
  nextCache[asset.key] = asset;

  const trimmed = Object.values(nextCache)
    .sort(
      (left, right) =>
        new Date(right.generatedAt).getTime() - new Date(left.generatedAt).getTime(),
    )
    .slice(0, MAX_ART_ASSETS)
    .reduce<ArtCache>((accumulator, current) => {
      accumulator[current.key] = current;
      return accumulator;
    }, {});

  browser.localStorage.setItem(ART_CACHE_KEY, JSON.stringify(trimmed));
  return asset;
}

export function getArtAsset(key: string) {
  return loadArtCache()[key] ?? null;
}

export function clearArtCache() {
  const browser = safeWindow();
  if (!browser) {
    return;
  }

  browser.localStorage.removeItem(ART_CACHE_KEY);
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function getLocationArtKey(state: GameState) {
  return `location:${slugify(state.world.location)}`;
}

export function getMapArtKey(state: GameState) {
  return `map:${slugify(state.world.location)}`;
}

export function getNpcArtKey(npc: NpcState) {
  return `npc:${npc.id}:${slugify(npc.location)}`;
}

export function loadLatestSceneState() {
  return loadGame()?.state ?? null;
}
