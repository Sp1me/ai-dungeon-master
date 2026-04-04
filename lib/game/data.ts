import type {
  CharacterClass,
  GameMessage,
  GameState,
  InventoryItem,
  NpcState,
  PlayerState,
  Quest,
} from "@/lib/game/types";

function createStarterPlayer(name: string, className: CharacterClass): PlayerState {
  const baseStats: Record<CharacterClass, Omit<PlayerState, "name" | "className">> = {
    Warrior: {
      hp: 16,
      maxHp: 16,
      stats: [
        { name: "Strength", value: 3 },
        { name: "Agility", value: 1 },
        { name: "Mind", value: 0 },
      ],
    },
    Rogue: {
      hp: 13,
      maxHp: 13,
      stats: [
        { name: "Strength", value: 1 },
        { name: "Agility", value: 3 },
        { name: "Mind", value: 1 },
      ],
    },
    Mage: {
      hp: 11,
      maxHp: 11,
      stats: [
        { name: "Strength", value: 0 },
        { name: "Agility", value: 1 },
        { name: "Mind", value: 3 },
      ],
    },
  };

  return {
    name,
    className,
    ...baseStats[className],
  };
}

function createStarterInventory(className: CharacterClass): InventoryItem[] {
  const classItems: Record<CharacterClass, InventoryItem[]> = {
    Warrior: [
      {
        id: "iron-sword",
        name: "Iron Sword",
        description: "A dependable blade that adds force to close combat.",
        equipped: true,
        bonuses: { strength: 1 },
      },
      {
        id: "travel-shield",
        name: "Travel Shield",
        description: "Scarred oak and iron, good for the road.",
        equipped: true,
        bonuses: {},
      },
    ],
    Rogue: [
      {
        id: "quiet-dagger",
        name: "Quiet Dagger",
        description: "Balanced for quick strikes and stealthy work.",
        equipped: true,
        bonuses: { agility: 1 },
      },
      {
        id: "lockpick-roll",
        name: "Lockpick Roll",
        description: "Slim tools tucked into worn leather.",
        equipped: false,
        bonuses: {},
      },
    ],
    Mage: [
      {
        id: "ash-staff",
        name: "Ash Staff",
        description: "A rune-burned staff that sharpens focus.",
        equipped: true,
        bonuses: { mind: 1 },
      },
      {
        id: "field-notes",
        name: "Field Notes",
        description: "Loose pages full of old symbols and observations.",
        equipped: false,
        bonuses: {},
      },
    ],
  };

  return classItems[className];
}

function createStarterQuests(): Quest[] {
  return [
    {
      id: "missing-courier",
      title: "Recover the Courier's Satchel",
      summary:
        "A courier was ambushed near Mosslight Road. Recover the stolen satchel and bring it safely back to Briar Glen.",
      status: "active",
    },
  ];
}

function createStarterNpcs(): NpcState[] {
  return [
    {
      id: "skrit",
      name: "Skrit",
      role: "Goblin scavenger",
      location: "Mosslight Road",
      disposition: "hostile",
      traits: ["nervous", "greedy", "quick-footed"],
      goal: "Keep the satchel long enough to trade it for food and safety.",
      secret: "He is frightened and easier to scare or bargain with than he first appears.",
      status: "active",
      notes: "Hiding in the brush near the wrecked wagon.",
    },
    {
      id: "mara-fen",
      name: "Mara Fen",
      role: "Innkeeper of Briar Glen",
      location: "Briar Glen",
      disposition: "friendly",
      traits: ["steady", "practical", "protective"],
      goal: "Keep travelers safe and the road open.",
      secret: "She has quietly been paying couriers extra because the woods have grown more dangerous.",
      status: "safe",
      notes: "A trusted face waiting back in town.",
    },
    {
      id: "tobin-reed",
      name: "Tobin Reed",
      role: "Courier",
      location: "Somewhere beyond the road",
      disposition: "neutral",
      traits: ["tired", "dutiful", "secretive"],
      goal: "Make sure the satchel reaches Briar Glen intact.",
      secret: "The satchel contains a map fragment stitched into the lining.",
      status: "missing",
      notes: "Missing after the ambush. Recovering the satchel is the first priority.",
    },
  ];
}

function createStarterMessages(name: string): GameMessage[] {
  return [
    {
      id: crypto.randomUUID(),
      role: "assistant",
      text:
        `Rain taps softly on the leaves as ${name} arrives at Mosslight Road. ` +
        "A smashed courier wagon leans in the mud, one wheel splintered, and the nearby brush shifts with the sound of something still watching.",
    },
    {
      id: crypto.randomUUID(),
      role: "system",
      text: "Quest started: Recover the Courier's Satchel.",
    },
  ];
}

export function createNewGame(name: string, className: CharacterClass): GameState {
  return {
    player: createStarterPlayer(name, className),
    inventory: createStarterInventory(className),
    world: {
      location: "Mosslight Road",
      scene:
        "A broken wagon, wet forest air, and fresh signs of a struggle. Somewhere nearby, a goblin thief may still be hiding with the courier's satchel.",
      turn: 1,
      currentObjective: "Inspect the wagon, deal with the goblin ambusher, and recover the satchel.",
      flags: {
        goblinAlive: true,
        foundSatchel: false,
        bridgeCrossed: false,
        questComplete: false,
      },
      summary: [
        "You reached the wrecked wagon on Mosslight Road.",
        "The missing courier's satchel has not been recovered yet.",
      ],
      npcs: createStarterNpcs(),
    },
    quests: createStarterQuests(),
    messages: createStarterMessages(name),
  };
}
