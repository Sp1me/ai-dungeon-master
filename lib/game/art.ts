import { loadGame } from "@/lib/game/save";
import type { GameState, NpcState } from "@/lib/game/types";

export const ART_CACHE_KEY = "solo-dm-art-cache";
const MAX_ART_ASSETS = 12;
const MAX_ART_CACHE_BYTES = 4_000_000;

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

function sortAssets(cache: ArtCache) {
  return Object.values(cache).sort(
    (left, right) =>
      new Date(right.generatedAt).getTime() - new Date(left.generatedAt).getTime(),
  );
}

function buildCache(entries: CachedArtAsset[]) {
  return entries.reduce<ArtCache>((accumulator, current) => {
    accumulator[current.key] = current;
    return accumulator;
  }, {});
}

function getSerializedSize(value: string) {
  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(value).length;
  }

  return value.length * 2;
}

function isQuotaExceededError(error: unknown) {
  return (
    error instanceof DOMException &&
    (error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED")
  );
}

export function loadArtCache() {
  const browser = safeWindow();
  if (!browser) {
    return {};
  }

  try {
    return parseCache(browser.localStorage.getItem(ART_CACHE_KEY));
  } catch (error) {
    console.error("Failed to load art cache.", error);
    return {};
  }
}

export function saveArtAsset(asset: CachedArtAsset) {
  const browser = safeWindow();
  if (!browser) {
    return null;
  }

  const nextCache = loadArtCache();
  nextCache[asset.key] = asset;

  const candidates = sortAssets(nextCache).slice(0, MAX_ART_ASSETS);

  for (let count = candidates.length; count > 0; count -= 1) {
    const trimmed = buildCache(candidates.slice(0, count));
    const serialized = JSON.stringify(trimmed);

    if (getSerializedSize(serialized) > MAX_ART_CACHE_BYTES) {
      continue;
    }

    try {
      browser.localStorage.setItem(ART_CACHE_KEY, serialized);
      return asset;
    } catch (error) {
      if (!isQuotaExceededError(error)) {
        console.error("Failed to save art cache.", error);
        break;
      }
    }
  }

  console.warn("Art cache skipped because the generated image payload exceeded browser storage limits.");
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

  try {
    browser.localStorage.removeItem(ART_CACHE_KEY);
  } catch (error) {
    console.error("Failed to clear art cache.", error);
  }
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
