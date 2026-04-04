"use client";

import {
  getArtAsset,
  getLocationArtKey,
  getMapArtKey,
  getNpcArtKey,
  saveArtAsset,
  type ArtAssetKind,
  type CachedArtAsset,
} from "@/lib/game/art";
import type { GameState } from "@/lib/game/types";

type GenerateArtParams = {
  kind: ArtAssetKind;
  state: GameState;
  npcId?: string;
  force?: boolean;
};

type GenerateArtResult = {
  asset: CachedArtAsset;
  cached: boolean;
  model: string;
};

function getAssetKey(params: GenerateArtParams) {
  if (params.kind === "map") {
    return getMapArtKey(params.state);
  }

  if (params.kind === "location") {
    return getLocationArtKey(params.state);
  }

  const npc = params.state.world.npcs.find((candidate) => candidate.id === params.npcId);
  if (!npc) {
    throw new Error("NPC not found for portrait generation.");
  }

  return getNpcArtKey(npc);
}

function buildAssetTitle(params: GenerateArtParams) {
  if (params.kind === "map") {
    return {
      title: `${params.state.world.location} map`,
      subtitle: params.state.world.location,
    };
  }

  if (params.kind === "location") {
    return {
      title: `${params.state.world.location} illustration`,
      subtitle: params.state.world.location,
    };
  }

  const npc = params.state.world.npcs.find((candidate) => candidate.id === params.npcId);
  if (!npc) {
    throw new Error("NPC not found for portrait generation.");
  }

  return {
    title: `${npc.name} portrait`,
    subtitle: `${npc.role} at ${npc.location}`,
  };
}

export async function requestGeneratedArt(params: GenerateArtParams): Promise<GenerateArtResult> {
  const key = getAssetKey(params);
  const cachedAsset = getArtAsset(key);

  if (cachedAsset && !params.force) {
    return {
      asset: cachedAsset,
      cached: true,
      model: "cache",
    };
  }

  const response = await fetch("/api/game/art", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      kind: params.kind,
      state: params.state,
      npcId: params.kind === "npc" ? params.npcId : undefined,
    }),
  });

  const payload = (await response.json()) as
    | {
        imageDataUrl: string;
        mimeType: string;
        model: string;
        prompt: string;
      }
    | { error: string };

  if (!response.ok || "error" in payload) {
    throw new Error("error" in payload ? payload.error : "Image generation failed.");
  }

  const metadata = buildAssetTitle(params);
  const asset: CachedArtAsset = {
    id: crypto.randomUUID(),
    key,
    kind: params.kind,
    title: metadata.title,
    subtitle: metadata.subtitle,
    imageDataUrl: payload.imageDataUrl,
    generatedAt: new Date().toISOString(),
  };

  saveArtAsset(asset);

  return {
    asset,
    cached: false,
    model: payload.model,
  };
}
