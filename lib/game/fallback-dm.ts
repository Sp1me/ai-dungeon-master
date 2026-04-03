import type { ResolvedTurn } from "@/lib/game/types";

export function buildFallbackNarration(action: string, turn: ResolvedTurn) {
  const opening = turn.success
    ? "The moment bends in your favor."
    : "The scene pushes back with real danger.";

  const detail =
    turn.actionType === "attack"
      ? turn.success
        ? "Steel flashes, the underbrush erupts, and the threat finally breaks."
        : "Your strike comes a heartbeat late, and the enemy punishes the opening."
      : turn.actionType === "search"
        ? turn.success
          ? "With patient focus, you notice what panic would have missed."
          : "Mud, rain, and broken wood turn every clue into confusion."
        : turn.actionType === "talk"
          ? turn.success
            ? "Your voice cuts through the fear in the clearing."
            : "Whatever is hiding nearby answers with suspicion instead of trust."
          : turn.success
            ? "Your choice changes the rhythm of the road."
            : "The forest resists easy progress.";

  return `${opening} ${detail}\n\nYou attempted: "${action.trim()}". ${turn.consequence}`;
}

