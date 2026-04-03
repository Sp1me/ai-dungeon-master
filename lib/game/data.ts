import type {
  CharacterClass,
  GameMessage,
  GameState,
  InventoryItem,
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
      title: "Find the Missing Courier",
      summary:
        "A courier vanished near Mosslight Road. Search the broken wagon, track the thief, and return what was taken.",
      status: "active",
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
      text: "Quest started: Find the Missing Courier.",
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
    },
    quests: createStarterQuests(),
    messages: createStarterMessages(name),
  };
}

