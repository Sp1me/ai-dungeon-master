import { NextResponse } from "next/server";
import type { GameState, NpcState } from "@/lib/game/types";

type ArtRequestBody = {
  kind: "map" | "location" | "npc";
  state: GameState;
  npcId?: string;
};

type GeminiImageResponse = {
  candidates?: {
    content?: {
      parts?: Array<{
        text?: string;
        inlineData?: {
          mimeType?: string;
          data?: string;
        };
        inline_data?: {
          mime_type?: string;
          data?: string;
        };
      }>;
    };
    finishReason?: string;
  }[];
  promptFeedback?: {
    blockReason?: string;
  };
  error?: {
    message?: string;
  };
};

const geminiApiKey =
  process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY ?? null;
const imageModels = [
  "gemini-2.0-flash-preview-image-generation",
  "gemini-2.5-flash-image",
] as const;

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

function getInlineImageData(payload: GeminiImageResponse) {
  const parts = payload.candidates?.[0]?.content?.parts ?? [];

  for (const part of parts) {
    const modern = part.inlineData;
    const legacy = part.inline_data;

    if (modern?.data && modern.mimeType) {
      return {
        data: modern.data,
        mimeType: modern.mimeType,
      };
    }

    if (legacy?.data && legacy.mime_type) {
      return {
        data: legacy.data,
        mimeType: legacy.mime_type,
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

    if (!geminiApiKey) {
      return NextResponse.json(
        {
          error:
            "Gemini image generation is not configured. Add GEMINI_API_KEY to .env.local and restart the dev server.",
        },
        { status: 503 },
      );
    }

    const prompt = buildPrompt(body);
    let lastError = "Gemini image generation failed.";

    for (const imageModel of imageModels) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${imageModel}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": geminiApiKey,
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: prompt }],
              },
            ],
          }),
        },
      );

      const payload = (await response.json().catch(() => null)) as GeminiImageResponse | null;

      if (!response.ok) {
        const message =
          payload?.error?.message ??
          `Gemini image generation failed with status ${response.status}.`;

        lastError = `${imageModel}: ${message}`;

        if (response.status === 401 || response.status === 403) {
          return NextResponse.json(
            {
              error: `Gemini image generation failed: ${lastError}`,
            },
            { status: response.status },
          );
        }

        continue;
      }

      const image = payload ? getInlineImageData(payload) : null;
      if (!image) {
        const finishReason = payload?.candidates?.[0]?.finishReason;
        const blockReason = payload?.promptFeedback?.blockReason;

        lastError = blockReason
          ? `${imageModel}: Gemini blocked the image prompt: ${blockReason}.`
          : finishReason
            ? `${imageModel}: Gemini did not return an image. Finish reason: ${finishReason}.`
            : `${imageModel}: Gemini returned no image data.`;

        continue;
      }

      return NextResponse.json({
        imageDataUrl: `data:${image.mimeType};base64,${image.data}`,
        mimeType: image.mimeType,
        model: imageModel,
        prompt,
      });
    }

    return NextResponse.json({
      error: `Gemini image generation failed after trying ${imageModels.join(", ")}. Last error: ${lastError}`,
    }, { status: 429 });
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
