import { NextResponse } from "next/server";
import type { GameState, NpcState } from "@/lib/game/types";

type ArtRequestBody = {
  kind: "map" | "location" | "npc";
  state: GameState;
  npcId?: string;
};

type ImagenPrediction = {
  bytesBase64Encoded?: string;
  mimeType?: string;
  raiFilteredReason?: string;
};

type ImagenPredictResponse = {
  predictions?: ImagenPrediction[];
  error?: {
    message?: string;
  };
};

const imageApiKey =
  process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY ?? null;
const imageModel = process.env.IMAGE_MODEL ?? "imagen-4.0-fast-generate-001";

function buildArtDirection() {
  return [
    "Consistent style bible: hand-painted fantasy illustration, earthy palette, moss green, parchment tan, ember orange, crisp silhouettes, readable composition, no modern objects.",
    "Avoid text, captions, labels, UI panels, speech bubbles, watermarks, logos, and photorealism.",
    "Keep the camera focused, cinematic, and game-friendly.",
  ].join(" ");
}

function buildLocationPrompt(state: GameState) {
  return [
    "Create a fantasy environment painting for a solo RPG companion screen.",
    `Location name: ${state.world.location}.`,
    `Scene: ${state.world.scene}.`,
    `Objective: ${state.world.currentObjective}.`,
    `Story memory: ${state.world.summary.join(" ")}`,
    buildArtDirection(),
    "Show the current place as a moody location illustration rather than a battle scene.",
  ].join(" ");
}

function buildMapPrompt(state: GameState) {
  const activeNpcs = state.world.npcs
    .filter((npc) => npc.status === "active" || npc.status === "missing")
    .map((npc) => `${npc.name} near ${npc.location}, ${npc.notes}`)
    .join(" | ");

  return [
    "Create a top-down 2D fantasy encounter map for a solo RPG companion screen.",
    `Location name: ${state.world.location}.`,
    `Current scene: ${state.world.scene}.`,
    `Important people nearby: ${activeNpcs || "No active nearby NPCs listed."}`,
    "Style: painted tabletop map, top-down perspective, clear terrain shapes, forest paths, wagon wrecks, campfires, bridges, brush, and landmarks when appropriate.",
    buildArtDirection(),
    "No labels, no legend, no compass rose, no text.",
  ].join(" ");
}

function buildNpcPrompt(state: GameState, npc: NpcState) {
  return [
    "Create a fantasy character portrait for a solo RPG companion screen.",
    `Character: ${npc.name}, ${npc.role}.`,
    `Disposition: ${npc.disposition}.`,
    `Traits: ${npc.traits.join(", ")}.`,
    `Goal: ${npc.goal}.`,
    `Notes: ${npc.notes}.`,
    `Current location context: ${state.world.location}. ${state.world.scene}`,
    buildArtDirection(),
    "Portrait framing, chest-up or waist-up, expressive face, fantasy clothing, no text.",
  ].join(" ");
}

function buildPrompt(body: ArtRequestBody) {
  if (body.kind === "map") {
    return buildMapPrompt(body.state);
  }

  if (body.kind === "location") {
    return buildLocationPrompt(body.state);
  }

  const npc = body.state.world.npcs.find((candidate) => candidate.id === body.npcId);
  if (!npc) {
    throw new Error("NPC not found for portrait generation.");
  }

  return buildNpcPrompt(body.state, npc);
}

function buildImagenParameters(kind: ArtRequestBody["kind"]) {
  return {
    sampleCount: 1,
    aspectRatio: kind === "npc" ? "3:4" : "16:9",
    ...(kind === "npc" ? { personGeneration: "allow_adult" } : {}),
  };
}

function getGeneratedImage(payload: ImagenPredictResponse) {
  for (const prediction of payload.predictions ?? []) {
    if (prediction.bytesBase64Encoded) {
      return {
        data: prediction.bytesBase64Encoded,
        mimeType: prediction.mimeType ?? "image/png",
      };
    }
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ArtRequestBody;

    if (!body.state || !body.kind) {
      return NextResponse.json(
        { error: "Art generation needs both a game state and art kind." },
        { status: 400 },
      );
    }

    if (!imageApiKey) {
      return NextResponse.json(
        {
          error:
            "Imagen image generation is not configured. Add GEMINI_API_KEY to .env.local and restart the dev server.",
        },
        { status: 503 },
      );
    }

    const prompt = buildPrompt(body);
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${imageModel}:predict`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": imageApiKey,
        },
        body: JSON.stringify({
          instances: [
            {
              prompt,
            },
          ],
          parameters: buildImagenParameters(body.kind),
        }),
      },
    );

    const payload = (await response.json().catch(() => null)) as ImagenPredictResponse | null;

    if (!response.ok) {
      const message =
        payload?.error?.message ?? `Imagen image generation failed with status ${response.status}.`;

      return NextResponse.json(
        {
          error: `Imagen image generation failed: ${imageModel}: ${message}`,
        },
        { status: response.status },
      );
    }

    const image = payload ? getGeneratedImage(payload) : null;
    if (!image) {
      const blockReason = payload?.predictions?.find((prediction) => prediction.raiFilteredReason)
        ?.raiFilteredReason;

      return NextResponse.json(
        {
          error: blockReason
            ? `Imagen blocked the image prompt: ${blockReason}`
            : `Imagen did not return image data for ${imageModel}.`,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      imageDataUrl: `data:${image.mimeType};base64,${image.data}`,
      mimeType: image.mimeType,
      model: imageModel,
      prompt,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Something went wrong while generating art.",
      },
      { status: 500 },
    );
  }
}
