import { NextResponse } from "next/server";
import { resolveTurn } from "@/lib/game/engine";
import type { DmTurnUpdate, GameState } from "@/lib/game/types";

type TurnRequestBody = {
  action: string;
  state: GameState;
};

type GeminiGenerateContentResponse = {
  candidates?: {
    content?: {
      parts?: {
        text?: string;
      }[];
    };
    finishReason?: string;
  }[];
  promptFeedback?: {
    blockReason?: string;
  };
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
};

const geminiApiKey =
  process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY ?? null;
const dmModel = "gemini-2.5-flash";

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Unknown Gemini API error.";
}

function buildRecentTranscript(state: GameState) {
  return state.messages
    .slice(-6)
    .map((message) => `${message.role.toUpperCase()}: ${message.text}`)
    .join("\n");
}

function createPrompt(action: string, previousState: GameState, turn: ReturnType<typeof resolveTurn>) {
  return `You are resolving one tabletop RPG turn.

Recent transcript:
${buildRecentTranscript(previousState)}

Player character:
- Name: ${previousState.player.name}
- Class: ${previousState.player.className}
- HP after rules resolution: ${turn.nextState.player.hp}/${turn.nextState.player.maxHp}
- Stats: ${previousState.player.stats.map((stat) => `${stat.name} ${stat.value >= 0 ? `+${stat.value}` : stat.value}`).join(", ")}
- Inventory: ${previousState.inventory.map((item) => item.name).join(", ")}

The player just said:
${action}

Mechanical result that you must respect:
Roll summary: ${turn.rollSummary}
Success: ${turn.success}
Used stat: ${turn.statUsed}
Rule consequence already applied by the game engine: ${turn.consequence}

Current scene after rules resolution:
- Location: ${turn.nextState.world.location}
- Scene: ${turn.nextState.world.scene}
- Objective: ${turn.nextState.world.currentObjective}
- Quest status: ${turn.nextState.quests.map((quest) => `${quest.title}: ${quest.status} | ${quest.summary}`).join(" || ")}
- NPCs: ${turn.nextState.world.npcs
  .map((npc) => `${npc.id}: ${npc.name} (${npc.role}) at ${npc.location}, disposition ${npc.disposition}, status ${npc.status}. Traits: ${npc.traits.join(", ")}. Goal: ${npc.goal}. Secret: ${npc.secret}. Notes: ${npc.notes}`)
  .join(" | ")}
- Story memory: ${turn.nextState.world.summary.join(" | ")}

Act like a real human dungeon master, not a script.
- Progress the fiction every turn.
- React specifically to the player's words.
- Reveal new information, shift NPC attitudes, or change the situation.
- Do not reset back to the same generic scene description.
- Introduce consequences, clues, complications, and momentum.
- Treat broad actions like "check the wagon" as concrete in-world behavior and describe what the character actually discovers.
- If the player succeeds, reward them with meaningful information, positioning, leverage, or a new problem.
- If the player fails, make the world push back in a specific way instead of stalling.
- Keep the tone grounded, adventurous, and responsive.
- Never contradict the supplied roll result or the already-applied mechanical consequence.
- Keep the response concise but alive: 2-4 short paragraphs worth of content total.
- End by giving the player a clear opening for what to do next.`;
}

function applyDmTurnUpdate(state: GameState, update: DmTurnUpdate) {
  const nextState = structuredClone(state);

  nextState.world.location = update.updatedLocation.trim() || nextState.world.location;
  nextState.world.scene = update.updatedScene.trim() || nextState.world.scene;
  nextState.world.currentObjective =
    update.updatedObjective.trim() || nextState.world.currentObjective;

  if (update.summaryEntry.trim()) {
    nextState.world.summary = [
      update.summaryEntry.trim(),
      ...nextState.world.summary.filter((entry) => entry !== update.summaryEntry.trim()),
    ].slice(0, 6);
  }

  nextState.world.npcs = nextState.world.npcs.map((npc) => {
    const patch = update.npcUpdates.find((candidate) => candidate.id === npc.id);
    if (!patch) {
      return npc;
    }

    return {
      ...npc,
      disposition: patch.disposition,
      status: patch.status,
      location: patch.location.trim() || npc.location,
      notes: patch.notes.trim() || npc.notes,
    };
  });

  nextState.quests = nextState.quests.map((quest) => {
    const patch = update.questUpdates.find((candidate) => candidate.id === quest.id);
    if (!patch) {
      return quest;
    }

    return {
      ...quest,
      status: patch.status,
      summary: patch.summary.trim() || quest.summary,
    };
  });

  return nextState;
}

async function requestGeminiDmTurn(action: string, state: GameState, turn: ReturnType<typeof resolveTurn>) {
  if (!geminiApiKey) {
    return {
      ok: false as const,
      status: 503,
      error:
        "Gemini narration is not configured. Add GEMINI_API_KEY to .env.local and restart the dev server.",
    };
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${dmModel}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": geminiApiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: createPrompt(action, state, turn),
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseJsonSchema: {
            type: "object",
            properties: {
              narration: { type: "string" },
              outcome: { type: "string" },
              updatedLocation: { type: "string" },
              updatedScene: { type: "string" },
              updatedObjective: { type: "string" },
              summaryEntry: { type: "string" },
              closingPrompt: { type: "string" },
              npcUpdates: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    disposition: {
                      type: "string",
                      enum: ["friendly", "neutral", "hostile", "afraid"],
                    },
                    status: {
                      type: "string",
                      enum: ["active", "safe", "missing", "defeated"],
                    },
                    location: { type: "string" },
                    notes: { type: "string" },
                  },
                  required: ["id", "disposition", "status", "location", "notes"],
                  additionalProperties: false,
                },
              },
              questUpdates: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    status: {
                      type: "string",
                      enum: ["active", "completed"],
                    },
                    summary: { type: "string" },
                  },
                  required: ["id", "status", "summary"],
                  additionalProperties: false,
                },
              },
            },
            required: [
              "narration",
              "outcome",
              "updatedLocation",
              "updatedScene",
              "updatedObjective",
              "summaryEntry",
              "closingPrompt",
              "npcUpdates",
              "questUpdates",
            ],
            additionalProperties: false,
          },
          temperature: 0.9,
        },
      }),
    },
  );

  const payload = (await response.json().catch(() => null)) as GeminiGenerateContentResponse | null;

  if (!response.ok) {
    return {
      ok: false as const,
      status: response.status,
      error:
        payload?.error?.message ??
        `Gemini API request failed with status ${response.status}.`,
    };
  }

  const text = payload?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim();

  if (!text) {
    const finishReason = payload?.candidates?.[0]?.finishReason;
    const blockReason = payload?.promptFeedback?.blockReason;

    return {
      ok: false as const,
      status: 502,
      error:
        blockReason
          ? `Gemini did not return a DM turn because the request was blocked: ${blockReason}.`
          : finishReason
            ? `Gemini did not return DM text. Finish reason: ${finishReason}.`
            : "Gemini returned an empty response.",
    };
  }

  try {
    return {
      ok: true as const,
      dmTurn: JSON.parse(text) as DmTurnUpdate,
    };
  } catch (error) {
    return {
      ok: false as const,
      status: 502,
      error: `Gemini returned invalid JSON: ${getErrorMessage(error)}`,
    };
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as TurnRequestBody;

    if (!body.action?.trim() || !body.state) {
      return NextResponse.json(
        { error: "An action and a game state are required." },
        { status: 400 },
      );
    }

    const turn = resolveTurn(body.action, body.state);
    const dmResult = await requestGeminiDmTurn(body.action, body.state, turn);

    if (!dmResult.ok) {
      return NextResponse.json(
        {
          error: dmResult.error,
          dmModel,
          dmSource: "error",
          dmError: dmResult.error,
        },
        { status: dmResult.status },
      );
    }

    const updatedState = applyDmTurnUpdate(turn.nextState, dmResult.dmTurn);
    const narration = `${dmResult.dmTurn.narration}\n\n${dmResult.dmTurn.outcome}\n\n${dmResult.dmTurn.closingPrompt}`;

    const nextState: GameState = {
      ...updatedState,
      messages: [
        ...updatedState.messages,
        { id: crypto.randomUUID(), role: "user", text: body.action.trim() },
        { id: crypto.randomUUID(), role: "system", text: turn.rollSummary },
        { id: crypto.randomUUID(), role: "assistant", text: narration },
      ],
    };

    return NextResponse.json({
      nextState,
      rollSummary: turn.rollSummary,
      success: turn.success,
      dmSource: "gemini",
      dmError: null,
      dmModel,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Something went wrong while resolving the turn." },
      { status: 500 },
    );
  }
}
