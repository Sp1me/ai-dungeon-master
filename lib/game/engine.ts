import type { GameState, InventoryItem, ResolvedTurn } from "@/lib/game/types";

const actionKeywords = {
  attack: ["attack", "strike", "swing", "shoot", "stab"],
  search: ["search", "inspect", "look", "investigate", "examine"],
  sneak: ["sneak", "hide", "stealth", "creep"],
  talk: ["talk", "persuade", "ask", "speak", "convince", "threaten"],
  travel: ["travel", "move", "walk", "run", "cross", "return"],
};

function rollD20() {
  return Math.floor(Math.random() * 20) + 1;
}

function getActionType(action: string): ResolvedTurn["actionType"] {
  const lowerAction = action.toLowerCase();

  for (const [type, keywords] of Object.entries(actionKeywords)) {
    if (keywords.some((keyword) => lowerAction.includes(keyword))) {
      return type as ResolvedTurn["actionType"];
    }
  }

  return "general";
}

function getStatForAction(actionType: ResolvedTurn["actionType"]): ResolvedTurn["statUsed"] {
  switch (actionType) {
    case "attack":
      return "strength";
    case "search":
      return "mind";
    case "sneak":
      return "agility";
    case "talk":
      return "mind";
    case "travel":
      return "agility";
    default:
      return "mind";
  }
}

function getStatBonus(state: GameState, statUsed: ResolvedTurn["statUsed"]) {
  const stat = state.player.stats.find(
    (entry) => entry.name.toLowerCase() === statUsed,
  );

  const itemBonus = state.inventory
    .filter((item: InventoryItem) => item.equipped)
    .reduce((sum, item) => sum + (item.bonuses[statUsed] ?? 0), 0);

  return (stat?.value ?? 0) + itemBonus;
}

function getDifficultyClass(action: string, actionType: ResolvedTurn["actionType"]) {
  const lowerAction = action.toLowerCase();

  if (lowerAction.includes("carefully") || lowerAction.includes("quietly")) {
    return 11;
  }

  if (lowerAction.includes("hard") || lowerAction.includes("jump")) {
    return 16;
  }

  switch (actionType) {
    case "attack":
      return 13;
    case "search":
      return 12;
    case "sneak":
      return 14;
    case "talk":
      return 13;
    case "travel":
      return 12;
    default:
      return 12;
  }
}

function pushSummary(state: GameState, line: string) {
  state.world.summary = [line, ...state.world.summary].slice(0, 6);
}

function updateNpc(
  state: GameState,
  npcId: string,
  updater: (npc: GameState["world"]["npcs"][number]) => GameState["world"]["npcs"][number],
) {
  state.world.npcs = state.world.npcs.map((npc) =>
    npc.id === npcId ? updater(npc) : npc,
  );
}

function updateQuestSummary(state: GameState) {
  state.quests = state.quests.map((quest) => {
    if (quest.id !== "missing-courier") {
      return quest;
    }

    if (state.world.flags.questComplete) {
      return {
        ...quest,
        status: "completed",
        summary: "The satchel was recovered and returned. Mosslight Road is safe for now.",
      };
    }

    if (state.world.flags.foundSatchel) {
      return {
        ...quest,
        summary: "You recovered the satchel. Now return it safely.",
      };
    }

    return quest;
  });
}

export function resolveTurn(action: string, currentState: GameState): ResolvedTurn {
  const nextState: GameState = structuredClone(currentState);
  const actionType = getActionType(action);
  const statUsed = getStatForAction(actionType);
  const modifier = getStatBonus(nextState, statUsed);
  const dc = getDifficultyClass(action, actionType);
  const roll = rollD20();
  const total = roll + modifier;
  const success = total >= dc;
  let consequence = "";

  nextState.world.turn += 1;

  if (!success) {
    const damage = actionType === "attack" ? 3 : 2;
    nextState.player.hp = Math.max(0, nextState.player.hp - damage);
    consequence =
      nextState.player.hp > 0
        ? `Failure costs ${damage} HP.`
        : "Failure drops your HP to 0. The adventure ends here.";
    nextState.world.currentObjective =
      nextState.player.hp > 0
        ? "Recover, reassess the scene, and keep pushing toward the satchel."
        : "Your current run has ended. Start over or load an earlier save.";
    pushSummary(nextState, `You failed at "${action.trim()}" and lost ${damage} HP.`);
  } else if (
    actionType === "attack" &&
    nextState.world.flags.goblinAlive &&
    !nextState.world.flags.foundSatchel
  ) {
    nextState.world.flags.goblinAlive = false;
    nextState.world.flags.foundSatchel = true;
    nextState.world.location = "Mosslight Road";
    nextState.world.scene =
      "The goblin ambusher lies defeated near the wagon, and the stolen satchel is finally within reach.";
    nextState.world.currentObjective = "Return the recovered satchel to Briar Glen.";
    nextState.inventory.push({
      id: "courier-satchel",
      name: "Courier's Satchel",
      description: "Mud-stained, sealed, and important to someone in town.",
      equipped: false,
      bonuses: {},
    });
    updateNpc(nextState, "skrit", (npc) => ({
      ...npc,
      status: "defeated",
      disposition: "hostile",
      notes: "Defeated near the wagon after the ambush.",
    }));
    consequence = "You defeat the goblin and recover the courier's satchel.";
    pushSummary(nextState, "The goblin ambusher was defeated and the satchel recovered.");
  } else if (actionType === "search" && !nextState.world.flags.foundSatchel) {
    nextState.world.flags.foundSatchel = true;
    nextState.inventory.push({
      id: "courier-satchel",
      name: "Courier's Satchel",
      description: "Recovered from a thorny bush beside the wreck.",
      equipped: false,
      bonuses: {},
    });
    nextState.world.scene =
      "Tracks lead away from the wagon, but the satchel itself was hidden under brambles close by.";
    nextState.world.currentObjective = "Bring the satchel back to Briar Glen before someone else finds it.";
    updateNpc(nextState, "tobin-reed", (npc) => ({
      ...npc,
      notes: "Still missing, but the satchel has been recovered from the crash site.",
    }));
    consequence = "You uncover the missing satchel hidden near the crash.";
    pushSummary(nextState, "You searched the wreckage and found the courier's satchel.");
  } else if (
    actionType === "travel" &&
    nextState.world.flags.foundSatchel &&
    !nextState.world.flags.questComplete &&
    action.toLowerCase().includes("return")
  ) {
    nextState.world.flags.questComplete = true;
    nextState.world.location = "Briar Glen";
    nextState.world.scene =
      "Warm lantern light spills from the inn as relieved townsfolk gather to see the satchel returned.";
    nextState.world.currentObjective = "Rest in town, ask questions, and prepare for the next lead.";
    updateNpc(nextState, "mara-fen", (npc) => ({
      ...npc,
      notes: "Grateful that the satchel made it back to town.",
    }));
    updateNpc(nextState, "tobin-reed", (npc) => ({
      ...npc,
      status: "safe",
      location: "Briar Glen",
      notes: "Reported back to town after escaping the ambush.",
    }));
    consequence = "You return the satchel and complete the first quest.";
    pushSummary(nextState, "You returned to Briar Glen and completed the courier quest.");
  } else if (actionType === "travel" && !nextState.world.flags.bridgeCrossed) {
    nextState.world.flags.bridgeCrossed = true;
    nextState.world.location = "Old Stone Bridge";
    nextState.world.scene =
      "Ahead, an old bridge spans a black stream. Mist curls under the stones, and fresh footprints mark the way.";
    nextState.world.currentObjective = "Search the bridge area for clues about the ambush.";
    consequence = "You press deeper into the woods and reach the old bridge.";
    pushSummary(nextState, "You advanced from the wagon toward the old stone bridge.");
  } else if (actionType === "talk" && nextState.world.flags.goblinAlive) {
    nextState.world.scene =
      "The goblin hesitates in the underbrush, yellow eyes narrowed, listening for the first time.";
    nextState.world.currentObjective = "Decide whether to press the advantage, bargain, or recover the satchel.";
    updateNpc(nextState, "skrit", (npc) => ({
      ...npc,
      disposition: "afraid",
      notes: "Shaken by your confidence and now willing to speak from cover.",
    }));
    consequence = "Your words buy a brief pause and reveal the goblin's position.";
    pushSummary(nextState, "You managed to draw the hidden goblin into conversation.");
  } else {
    consequence = "Your action moves the scene in your favor.";
    pushSummary(nextState, `You acted: "${action.trim()}"`);
  }

  updateQuestSummary(nextState);

  const modifierText = modifier >= 0 ? `+ ${modifier}` : `- ${Math.abs(modifier)}`;
  const rollSummary = `Rolled ${roll} ${modifierText} ${statUsed} = ${total} vs DC ${dc} (${success ? "success" : "failure"})`;

  return {
    nextState,
    roll,
    modifier,
    total,
    dc,
    statUsed,
    success,
    actionType,
    consequence,
    rollSummary,
  };
}
