import OpenAI from "openai";
import { NextResponse } from "next/server";
import { buildFallbackNarration } from "@/lib/game/fallback-dm";
import { resolveTurn } from "@/lib/game/engine";
import type { GameState } from "@/lib/game/types";

type TurnRequestBody = {
  action: string;
  state: GameState;
};

const client = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

function createPrompt(action: string, turn: ReturnType<typeof resolveTurn>) {
  return `Player action: ${action}
Roll summary: ${turn.rollSummary}
Success: ${turn.success}
Used stat: ${turn.statUsed}
Current location: ${turn.nextState.world.location}
Turn number: ${turn.nextState.world.turn}
Current objective: ${turn.nextState.world.currentObjective}
Player HP: ${turn.nextState.player.hp}/${turn.nextState.player.maxHp}
Quest status: ${turn.nextState.quests.map((quest) => `${quest.title}: ${quest.status}`).join("; ")}
NPCs: ${turn.nextState.world.npcs
  .map((npc) => `${npc.name} (${npc.role}) at ${npc.location}, ${npc.disposition}, ${npc.status}. Goal: ${npc.goal}. Notes: ${npc.notes}`)
  .join(" | ")}
World notes: ${turn.nextState.world.summary.join(" | ")}`;
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
    let narration = buildFallbackNarration(body.action, turn);

    if (client) {
      try {
        const response = await client.responses.create({
          model: "gpt-5.2",
          input: [
            {
              role: "developer",
              content:
                "You are a warm, cinematic fantasy dungeon master for a beginner-friendly web game. Respect the supplied dice result and updated game state. Use NPC personalities and the current objective in your narration. Write vivid but concise text. Return strict JSON with keys narration and outcome. Never invent a different roll result.",
            },
            {
              role: "user",
              content: createPrompt(body.action, turn),
            },
          ],
          text: {
            format: {
              type: "json_schema",
              name: "dm_turn",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  narration: { type: "string" },
                  outcome: { type: "string" },
                },
                required: ["narration", "outcome"],
                additionalProperties: false,
              },
            },
          },
        });

        const parsed = JSON.parse(response.output_text) as {
          narration: string;
          outcome: string;
        };

        narration = `${parsed.narration}\n\n${parsed.outcome}`;
      } catch (error) {
        console.error("OpenAI request failed, falling back to local narrator.", error);
      }
    }

    const nextState: GameState = {
      ...turn.nextState,
      messages: [
        ...turn.nextState.messages,
        { id: crypto.randomUUID(), role: "user", text: body.action.trim() },
        { id: crypto.randomUUID(), role: "system", text: turn.rollSummary },
        { id: crypto.randomUUID(), role: "assistant", text: narration },
      ],
    };

    return NextResponse.json({
      nextState,
      rollSummary: turn.rollSummary,
      success: turn.success,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Something went wrong while resolving the turn." },
      { status: 500 },
    );
  }
}
