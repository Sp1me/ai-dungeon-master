export type CharacterClass = "Warrior" | "Rogue" | "Mage";

export type StatName = "Strength" | "Agility" | "Mind";

export type PlayerStat = {
  name: StatName;
  value: number;
};

export type InventoryItem = {
  id: string;
  name: string;
  description: string;
  equipped: boolean;
  bonuses: Partial<Record<Lowercase<StatName>, number>>;
};

export type QuestStatus = "active" | "completed";

export type Quest = {
  id: string;
  title: string;
  summary: string;
  status: QuestStatus;
};

export type GameMessage = {
  id: string;
  role: "assistant" | "user" | "system";
  text: string;
};

export type NpcDisposition = "friendly" | "neutral" | "hostile" | "afraid";

export type NpcStatus = "active" | "safe" | "missing" | "defeated";

export type NpcState = {
  id: string;
  name: string;
  role: string;
  location: string;
  disposition: NpcDisposition;
  traits: string[];
  goal: string;
  secret: string;
  status: NpcStatus;
  notes: string;
};

export type WorldState = {
  location: string;
  scene: string;
  turn: number;
  currentObjective: string;
  flags: Record<string, boolean>;
  summary: string[];
  npcs: NpcState[];
};

export type PlayerState = {
  name: string;
  className: CharacterClass;
  hp: number;
  maxHp: number;
  stats: PlayerStat[];
};

export type GameState = {
  player: PlayerState;
  inventory: InventoryItem[];
  quests: Quest[];
  world: WorldState;
  messages: GameMessage[];
};

export type SaveGameData = {
  version: number;
  savedAt: string;
  state: GameState;
};

export type DmTurnUpdate = {
  narration: string;
  outcome: string;
  updatedLocation: string;
  updatedScene: string;
  updatedObjective: string;
  summaryEntry: string;
  closingPrompt: string;
  npcUpdates: {
    id: string;
    disposition: NpcDisposition;
    status: NpcStatus;
    location: string;
    notes: string;
  }[];
  questUpdates: {
    id: string;
    status: QuestStatus;
    summary: string;
  }[];
};

export type ResolvedTurn = {
  nextState: GameState;
  roll: number;
  modifier: number;
  total: number;
  dc: number;
  statUsed: Lowercase<StatName>;
  success: boolean;
  actionType: "attack" | "search" | "sneak" | "talk" | "travel" | "general";
  consequence: string;
  rollSummary: string;
};
