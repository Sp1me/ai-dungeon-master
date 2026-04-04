import { deleteDoc, doc, getDoc, setDoc } from "firebase/firestore";
import { getFirebaseServices, ensureAnonymousUser } from "@/lib/firebase/client";
import { createNewGame } from "@/lib/game/data";
import type { CharacterClass, GameState, SaveGameData } from "@/lib/game/types";

export const SAVE_KEY = "solo-dm-save";
const SAVE_VERSION = 1;

export type CloudSaveStatus = "disabled" | "connecting" | "ready" | "error";

function normalizeGameState(raw: unknown): GameState | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const maybeState = raw as Partial<GameState> & {
    player?: Partial<GameState["player"]>;
    world?: Partial<GameState["world"]>;
  };

  const playerName = maybeState.player?.name ?? "Aria";
  const playerClass = (maybeState.player?.className ?? "Warrior") as CharacterClass;
  const baseState = createNewGame(playerName, playerClass);

  return {
    player: {
      ...baseState.player,
      ...maybeState.player,
      stats: maybeState.player?.stats ?? baseState.player.stats,
    },
    inventory: maybeState.inventory ?? baseState.inventory,
    quests: maybeState.quests ?? baseState.quests,
    world: {
      ...baseState.world,
      ...maybeState.world,
      flags: {
        ...baseState.world.flags,
        ...(maybeState.world?.flags ?? {}),
      },
      summary: maybeState.world?.summary ?? baseState.world.summary,
      npcs: maybeState.world?.npcs ?? baseState.world.npcs,
    },
    messages: maybeState.messages ?? baseState.messages,
  };
}

export function loadGame(): SaveGameData | null {
  if (typeof window === "undefined") {
    return null;
  }

  const rawSave = window.localStorage.getItem(SAVE_KEY);
  if (!rawSave) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawSave) as Partial<SaveGameData> | GameState;

    if ("state" in parsed) {
      const normalizedState = normalizeGameState(parsed.state);
      if (!normalizedState) {
        return null;
      }

      return {
        version: parsed.version ?? SAVE_VERSION,
        savedAt: parsed.savedAt ?? new Date().toISOString(),
        state: normalizedState,
      };
    }

    const normalizedState = normalizeGameState(parsed);
    if (!normalizedState) {
      return null;
    }

    return {
      version: SAVE_VERSION,
      savedAt: new Date().toISOString(),
      state: normalizedState,
    };
  } catch (error) {
    console.error("Failed to parse saved game.", error);
    return null;
  }
}

export function saveGame(state: GameState): SaveGameData | null {
  if (typeof window === "undefined") {
    return null;
  }

  const payload: SaveGameData = {
    version: SAVE_VERSION,
    savedAt: new Date().toISOString(),
    state,
  };

  window.localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
  return payload;
}

export function clearGameSave() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(SAVE_KEY);
}

export function hasCloudSaveConfig() {
  return Boolean(getFirebaseServices());
}

export function compareSaves(
  first: SaveGameData | null,
  second: SaveGameData | null,
): SaveGameData | null {
  if (!first) {
    return second;
  }

  if (!second) {
    return first;
  }

  return new Date(first.savedAt).getTime() >= new Date(second.savedAt).getTime()
    ? first
    : second;
}

export async function loadCloudGame(): Promise<SaveGameData | null> {
  const services = getFirebaseServices();
  if (!services) {
    return null;
  }

  const user = await ensureAnonymousUser();
  if (!user) {
    return null;
  }

  const snapshot = await getDoc(doc(services.db, "gameSaves", user.uid));
  if (!snapshot.exists()) {
    return null;
  }

  const normalizedState = normalizeGameState(snapshot.data().state);
  if (!normalizedState) {
    return null;
  }

  return {
    version: Number(snapshot.data().version ?? SAVE_VERSION),
    savedAt: String(snapshot.data().savedAt ?? new Date().toISOString()),
    state: normalizedState,
  };
}

export async function saveGameToCloud(state: GameState): Promise<SaveGameData | null> {
  const services = getFirebaseServices();
  if (!services) {
    return null;
  }

  const user = await ensureAnonymousUser();
  if (!user) {
    return null;
  }

  const payload: SaveGameData = {
    version: SAVE_VERSION,
    savedAt: new Date().toISOString(),
    state,
  };

  await setDoc(doc(services.db, "gameSaves", user.uid), payload);
  return payload;
}

export async function clearCloudSave() {
  const services = getFirebaseServices();
  if (!services) {
    return;
  }

  const user = await ensureAnonymousUser();
  if (!user) {
    return;
  }

  await deleteDoc(doc(services.db, "gameSaves", user.uid));
}
