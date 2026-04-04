"use client";

import Link from "next/link";
import { startTransition, useEffect, useMemo, useState, type FormEvent } from "react";
import { createNewGame } from "@/lib/game/data";
import { requestGeneratedArt } from "@/lib/game/art-client";
import {
  clearCloudSave,
  clearGameSave,
  compareSaves,
  hasCloudSaveConfig,
  loadCloudGame,
  loadGame,
  saveGame,
  saveGameToCloud,
  type CloudSaveStatus,
} from "@/lib/game/save";
import type { CharacterClass, GameState, SaveGameData } from "@/lib/game/types";

const classDescriptions: Record<CharacterClass, string> = {
  Warrior: "Tough, direct, and best when steel meets trouble.",
  Rogue: "Quick, subtle, and excellent at sneaking or scouting ahead.",
  Mage: "Fragile, clever, and strongest when knowledge changes the scene.",
};

const sidebarSections = [
  { id: "overview", label: "Overview" },
  { id: "character", label: "Stats" },
  { id: "quests", label: "Quests" },
  { id: "inventory", label: "Inventory" },
  { id: "npcs", label: "NPCs" },
  { id: "world", label: "World" },
] as const;

type SidebarSection = (typeof sidebarSections)[number]["id"];

function ChatPanel({
  state,
  action,
  onActionChange,
  onSubmit,
  isSubmitting,
  status,
}: {
  state: GameState;
  action: string;
  onActionChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  isSubmitting: boolean;
  status: string;
}) {
  return (
    <div className="panel-card chat-panel p-5">
      <div className="border-b border-[rgba(255,245,227,0.12)] pb-4">
        <p className="section-title">Current Scene</p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="m-0 text-2xl font-semibold">{state.world.location}</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-[rgba(245,237,220,0.76)]">
              {state.world.scene}
            </p>
          </div>
          <div className="rounded-2xl bg-[rgba(255,255,255,0.06)] px-3 py-2 text-sm">
            Turn {state.world.turn}
          </div>
        </div>
      </div>

      <div className="message-list py-5">
        {state.messages.map((message) => (
          <div key={message.id} className={`message-bubble message-${message.role}`}>
            <p className="m-0 whitespace-pre-wrap">{message.text}</p>
          </div>
        ))}
      </div>

      <form className="chat-form border-t border-[rgba(255,245,227,0.12)] pt-4" onSubmit={onSubmit}>
        <label className="block text-sm text-[rgba(245,237,220,0.82)]" htmlFor="action">
          What do you do next?
        </label>
        <textarea
          id="action"
          className="textarea mt-3 min-h-[120px]"
          placeholder='Try something free-form like: "I search the broken wagon for clues."'
          value={action}
          onChange={(event) => onActionChange(event.target.value)}
          disabled={isSubmitting || state.player.hp <= 0}
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="m-0 text-sm text-[rgba(245,237,220,0.7)]">
            {status || "The system rolls d20 checks for you and shows the math."}
          </p>
          <button
            className="button-primary"
            type="submit"
            disabled={isSubmitting || !action.trim() || state.player.hp <= 0}
          >
            {state.player.hp <= 0 ? "You have fallen" : isSubmitting ? "Resolving..." : "Take action"}
          </button>
        </div>
      </form>
    </div>
  );
}

function getTurnFailureMessage(payload: unknown) {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "error" in payload &&
    typeof payload.error === "string"
  ) {
    return payload.error;
  }

  return "The Gemini DM request failed before the turn could resolve.";
}

function SidebarContent({
  state,
  savedGame,
  cloudStatus,
  cloudMessage,
  dmStatus,
  activeSection,
}: {
  state: GameState;
  savedGame: SaveGameData | null;
  cloudStatus: CloudSaveStatus;
  cloudMessage: string;
  dmStatus: string;
  activeSection: SidebarSection;
}) {
  if (activeSection === "character") {
    return (
      <div className="space-y-4">
        <div>
          <p className="section-title">Character</p>
          <h2 className="m-0 text-2xl font-semibold">{state.player.name}</h2>
          <p className="mt-1 text-sm text-[rgba(245,237,220,0.75)]">{state.player.className}</p>
        </div>
        <div className="rounded-2xl bg-[rgba(184,92,56,0.2)] px-4 py-3 text-sm">
          HP {state.player.hp}/{state.player.maxHp}
        </div>
        <div className="flex flex-wrap gap-2">
          {state.player.stats.map((stat) => (
            <div className="stat-chip text-sm" key={stat.name}>
              <span>{stat.name}</span>
              <strong>{stat.value >= 0 ? `+${stat.value}` : stat.value}</strong>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (activeSection === "quests") {
    return (
      <div className="space-y-3">
        <p className="section-title">Quest Log</p>
        {state.quests.map((quest) => (
          <div
            key={quest.id}
            className="rounded-2xl border border-[rgba(255,245,227,0.12)] bg-[rgba(255,245,227,0.06)] p-3"
          >
            <div className="flex items-center justify-between gap-3">
              <strong>{quest.title}</strong>
              <span className="text-sm capitalize text-[rgba(245,237,220,0.78)]">{quest.status}</span>
            </div>
            <p className="mb-0 mt-2 text-sm leading-6 text-[rgba(245,237,220,0.75)]">{quest.summary}</p>
          </div>
        ))}
      </div>
    );
  }

  if (activeSection === "inventory") {
    return (
      <div className="space-y-3">
        <p className="section-title">Inventory</p>
        {state.inventory.map((item) => (
          <div
            key={item.id}
            className="rounded-2xl border border-[rgba(255,245,227,0.12)] bg-[rgba(255,245,227,0.06)] p-3"
          >
            <div className="flex items-center justify-between gap-3">
              <strong>{item.name}</strong>
              {item.equipped ? (
                <span className="rounded-full bg-[rgba(242,193,133,0.14)] px-2 py-1 text-xs">
                  Equipped
                </span>
              ) : null}
            </div>
            <p className="mb-0 mt-2 text-sm leading-6 text-[rgba(245,237,220,0.75)]">{item.description}</p>
          </div>
        ))}
      </div>
    );
  }

  if (activeSection === "npcs") {
    return (
      <div className="space-y-3">
        <p className="section-title">Notable NPCs</p>
        {state.world.npcs.map((npc) => (
          <div
            key={npc.id}
            className="rounded-2xl border border-[rgba(255,245,227,0.12)] bg-[rgba(255,245,227,0.06)] p-3"
          >
            <div className="flex items-center justify-between gap-3">
              <strong>{npc.name}</strong>
              <span className="text-xs uppercase tracking-[0.18em] text-[rgba(245,237,220,0.6)]">
                {npc.disposition}
              </span>
            </div>
            <p className="mb-0 mt-1 text-sm text-[rgba(245,237,220,0.82)]">{npc.role}</p>
            <p className="mb-0 mt-2 text-sm leading-6 text-[rgba(245,237,220,0.7)]">{npc.notes}</p>
          </div>
        ))}
      </div>
    );
  }

  if (activeSection === "world") {
    return (
      <div className="space-y-4">
        <div>
          <p className="section-title">Current Objective</p>
          <p className="m-0 text-sm leading-6 text-[rgba(245,237,220,0.82)]">{state.world.currentObjective}</p>
        </div>
        <div>
          <p className="section-title">World Memory</p>
          <div className="space-y-3 text-sm leading-6 text-[rgba(245,237,220,0.78)]">
            {state.world.summary.map((entry) => (
              <p className="m-0" key={entry}>
                {entry}
              </p>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="section-title">Adventure Overview</p>
        <h2 className="m-0 text-2xl font-semibold">{state.player.name}</h2>
        <p className="mt-1 text-sm text-[rgba(245,237,220,0.75)]">
          {state.player.className} | HP {state.player.hp}/{state.player.maxHp}
        </p>
      </div>
      <div className="rounded-2xl border border-[rgba(255,245,227,0.12)] bg-[rgba(255,245,227,0.06)] p-3">
        <p className="section-title">Current Objective</p>
        <p className="m-0 text-sm leading-6 text-[rgba(245,237,220,0.82)]">{state.world.currentObjective}</p>
      </div>
      <div className="rounded-2xl border border-[rgba(255,245,227,0.12)] bg-[rgba(255,245,227,0.06)] p-3">
        <p className="section-title">Save Status</p>
        <p className="m-0 text-sm leading-6 text-[rgba(245,237,220,0.82)]">{cloudMessage}</p>
        <p className="mb-0 mt-2 text-xs uppercase tracking-[0.2em] text-[rgba(245,237,220,0.55)]">
          {cloudStatus}
          {savedGame ? ` | Last save ${new Date(savedGame.savedAt).toLocaleString()}` : ""}
        </p>
      </div>
      <div className="rounded-2xl border border-[rgba(255,245,227,0.12)] bg-[rgba(255,245,227,0.06)] p-3">
        <p className="section-title">DM Status</p>
        <p className="m-0 text-sm leading-6 text-[rgba(245,237,220,0.82)]">{dmStatus}</p>
      </div>
      <div className="rounded-2xl border border-[rgba(255,245,227,0.12)] bg-[rgba(255,245,227,0.06)] p-3">
        <p className="section-title">At A Glance</p>
        <div className="flex flex-wrap gap-2">
          <div className="stat-chip text-sm">Quests {state.quests.length}</div>
          <div className="stat-chip text-sm">Items {state.inventory.length}</div>
          <div className="stat-chip text-sm">NPCs {state.world.npcs.length}</div>
        </div>
      </div>
    </div>
  );
}

export function GameShellClient() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [savedGame, setSavedGame] = useState<SaveGameData | null>(null);
  const [playerName, setPlayerName] = useState("Aria");
  const [selectedClass, setSelectedClass] = useState<CharacterClass>("Warrior");
  const [action, setAction] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState("");
  const [dmStatus, setDmStatus] = useState("Waiting for your first move.");
  const [activeSection, setActiveSection] = useState<SidebarSection>("overview");
  const [cloudStatus, setCloudStatus] = useState<CloudSaveStatus>("disabled");
  const [cloudMessage, setCloudMessage] = useState("Cloud save is not configured yet.");

  useEffect(() => {
    let cancelled = false;

    async function loadLatestSave() {
      const localSave = loadGame();

      if (localSave) {
        await Promise.resolve();
        if (!cancelled) {
          setSavedGame(localSave);
        }
      }

      if (!hasCloudSaveConfig()) {
        if (!cancelled) {
          setCloudStatus("disabled");
          setCloudMessage("Cloud save is off until Firebase env values are added.");
        }
        return;
      }

      if (!cancelled) {
        setCloudStatus("connecting");
        setCloudMessage("Connecting to Firebase cloud save...");
      }

      try {
        const cloudSave = await loadCloudGame();
        const latestSave = compareSaves(localSave, cloudSave);

        if (!cancelled) {
          setCloudStatus("ready");
          setCloudMessage(
            cloudSave
              ? "Cloud save is connected and ready."
              : "Firebase is connected. Your next turn will create the first cloud save.",
          );
          if (latestSave) {
            setSavedGame(latestSave);
          }
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setCloudStatus("error");
          setCloudMessage("Firebase is configured, but cloud sync failed. Local saves still work.");
        }
      }
    }

    void loadLatestSave();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!gameState) {
      return;
    }

    let cancelled = false;
    const currentState = gameState;

    async function syncSaves() {
      const localPayload = saveGame(currentState);
      await Promise.resolve();

      if (!cancelled && localPayload) {
        setSavedGame(localPayload);
      }

      if (!hasCloudSaveConfig()) {
        if (!cancelled) {
          setCloudStatus("disabled");
          setCloudMessage("Local save updated. Add Firebase env values to enable cloud sync.");
        }
        return;
      }

      if (!cancelled) {
        setCloudStatus("connecting");
        setCloudMessage("Syncing your progress to Firebase...");
      }

      try {
        const cloudPayload = await saveGameToCloud(currentState);
        if (!cancelled) {
          setCloudStatus("ready");
          setCloudMessage("Cloud save synced.");
          setSavedGame(compareSaves(localPayload, cloudPayload));
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setCloudStatus("error");
          setCloudMessage("Cloud sync failed, but your local save is still safe.");
        }
      }
    }

    void syncSaves();

    return () => {
      cancelled = true;
    };
  }, [gameState]);

  useEffect(() => {
    if (!gameState) {
      return;
    }

    const currentState = gameState;
    let cancelled = false;

    async function warmSceneAtlas() {
      try {
        await requestGeneratedArt({
          kind: "location",
          state: currentState,
        });

        if (cancelled) {
          return;
        }

        await requestGeneratedArt({
          kind: "map",
          state: currentState,
        });

        if (cancelled) {
          return;
        }

        const localNpc = currentState.world.npcs.find(
          (npc) =>
            npc.location === currentState.world.location &&
            (npc.status === "active" || npc.status === "safe"),
        );

        if (localNpc) {
          await requestGeneratedArt({
            kind: "npc",
            state: currentState,
            npcId: localNpc.id,
          });
        }
      } catch (error) {
        console.error("Background art warmup failed.", error);
      }
    }

    void warmSceneAtlas();

    return () => {
      cancelled = true;
    };
  }, [gameState]);

  const canResume = useMemo(() => Boolean(savedGame && !gameState), [savedGame, gameState]);

  function startNewGame() {
    startTransition(() => {
      const freshGame = createNewGame(playerName.trim() || "Aria", selectedClass);
      setGameState(freshGame);
      setStatus("A new journey begins.");
      setDmStatus("Waiting for your first move.");
      setAction("");
      setActiveSection("overview");
    });
  }

  function resumeGame() {
    if (!savedGame) {
      return;
    }

    startTransition(() => {
      setGameState(savedGame.state);
      setStatus("Save loaded.");
      setDmStatus("Waiting for your next move.");
    });
  }

  async function clearSave() {
    clearGameSave();
    if (hasCloudSaveConfig()) {
      try {
        await clearCloudSave();
      } catch (error) {
        console.error(error);
      }
    }

    setSavedGame(null);
    setGameState(null);
    setStatus("Save cleared.");
    setDmStatus("Waiting for your first move.");
  }

  async function syncCloudNow() {
    if (!gameState || !hasCloudSaveConfig()) {
      return;
    }

    setCloudStatus("connecting");
    setCloudMessage("Syncing your progress to Firebase...");

    try {
      const cloudPayload = await saveGameToCloud(gameState);
      setCloudStatus("ready");
      setCloudMessage("Cloud save synced.");
      setSavedGame(compareSaves(savedGame, cloudPayload));
    } catch (error) {
      console.error(error);
      setCloudStatus("error");
      setCloudMessage("Cloud sync failed. Local save is still available.");
    }
  }

  async function submitAction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!gameState || !action.trim()) {
      return;
    }

    setIsSubmitting(true);
    setStatus("Rolling the dice and asking the Dungeon Master...");

    try {
      const response = await fetch("/api/game/turn", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          state: gameState,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as unknown;
        throw new Error(getTurnFailureMessage(payload));
      }

      const data = (await response.json()) as {
        nextState: GameState;
        dmSource: "gemini";
        dmError: string | null;
        dmModel: string | null;
      };

      setAction("");
      setGameState(data.nextState);
      setStatus("Turn resolved.");
      setDmStatus(`Live Gemini DM responded${data.dmModel ? ` with ${data.dmModel}` : "."}`);
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error
          ? error.message
          : "The Gemini DM request failed before the turn could resolve.";

      setStatus(message);
      setDmStatus(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!gameState) {
    return (
      <section className="hero-card">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-5">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-[var(--accent-strong)]">
                Step 1
              </p>
              <h1 className="mt-2 text-4xl font-semibold leading-tight text-[var(--accent-strong)]">
                Create your first adventurer.
              </h1>
              <p className="mt-4 max-w-2xl text-lg leading-8 text-[rgba(31,26,20,0.84)]">
                This MVP starts with one quest, simple d20 checks, and a chat
                loop. The AI narrates, but the app code controls the rules.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent-strong)]">
                  Character Name
                </label>
                <input
                  className="field !border-[rgba(125,46,20,0.18)] !bg-[rgba(255,255,255,0.58)] !text-[var(--text)]"
                  value={playerName}
                  onChange={(event) => setPlayerName(event.target.value)}
                />
              </div>

              <div>
                <p className="mb-2 block text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent-strong)]">
                  Choose a Class
                </p>
                <div className="grid gap-3 md:grid-cols-3">
                  {(Object.keys(classDescriptions) as CharacterClass[]).map((className) => (
                    <button
                      key={className}
                      className={`class-card text-left ${selectedClass === className ? "selected" : ""}`}
                      type="button"
                      onClick={() => setSelectedClass(className)}
                    >
                      <h2 className="m-0 text-xl font-semibold text-[var(--accent-strong)]">
                        {className}
                      </h2>
                      <p className="mt-2 text-sm leading-6 text-[rgba(31,26,20,0.76)]">
                        {classDescriptions[className]}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button className="button-primary" type="button" onClick={startNewGame}>
                  Start new game
                </button>
                {canResume ? (
                  <button className="button-primary" type="button" onClick={resumeGame}>
                    Resume saved game
                  </button>
                ) : null}
                {savedGame ? (
                  <button className="button-danger" type="button" onClick={() => void clearSave()}>
                    Clear save
                  </button>
                ) : null}
                <Link className="button-primary" href="/character">
                  View character sheet
                </Link>
                <Link className="button-secondary" href="/scene">
                  Open scene atlas
                </Link>
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-[rgba(125,46,20,0.14)] bg-[rgba(255,250,242,0.78)] p-6 shadow-[0_18px_40px_rgba(88,58,29,0.08)]">
            <p className="section-title !text-[var(--accent-strong)]">How This Starter Works</p>
            <div className="space-y-4 text-sm leading-7 text-[rgba(31,26,20,0.82)]">
              <p className="m-0">
                Local browser saves are always on. Firebase cloud saves turn on when the required
                env values are added.
              </p>
              <p className="m-0">
                Add a <code>GEMINI_API_KEY</code> to let Gemini narrate the turn. If the
                request fails, the app now shows the real error instead of inventing a fake
                response.
              </p>
              <p className="m-0">{cloudMessage}</p>
              {savedGame ? (
                <p className="m-0">
                  Latest save: {new Date(savedGame.savedAt).toLocaleString()}
                </p>
              ) : null}
              <p className="m-0">
                Need the setup steps? Start with the{" "}
                <Link className="underline" href="/">
                  project overview
                </Link>{" "}
                or read the README in this folder.
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="grid-main">
      <aside className="sidebar-shell panel-card p-5">
        <div className="sidebar-header">
          <p className="section-title">Adventure Menu</p>
          <h2 className="m-0 text-2xl font-semibold">{gameState.player.name}</h2>
          <p className="mt-1 text-sm text-[rgba(245,237,220,0.75)]">
            {gameState.player.className} | Turn {gameState.world.turn}
          </p>
        </div>

        <div className="sidebar-tabs" role="tablist" aria-label="Game menu sections">
          {sidebarSections.map((section) => (
            <button
              key={section.id}
              className={`sidebar-tab ${activeSection === section.id ? "active" : ""}`}
              type="button"
              onClick={() => setActiveSection(section.id)}
            >
              {section.label}
            </button>
          ))}
        </div>

        <div className="sidebar-content">
          <SidebarContent
            state={gameState}
            savedGame={savedGame}
            cloudStatus={cloudStatus}
            cloudMessage={cloudMessage}
            dmStatus={dmStatus}
            activeSection={activeSection}
          />
        </div>

        <div className="sidebar-actions">
          <button className="button-secondary" type="button" onClick={syncCloudNow} disabled={!hasCloudSaveConfig()}>
            Sync cloud save
          </button>
          <Link className="button-secondary" href="/scene">
            Scene atlas
          </Link>
          <button className="button-secondary" type="button" onClick={() => void clearSave()}>
            Start over
          </button>
          <Link className="button-secondary" href="/character">
            Character sheet
          </Link>
          <Link className="button-secondary" href="/">
            Back home
          </Link>
        </div>
      </aside>

      <ChatPanel
        state={gameState}
        action={action}
        onActionChange={setAction}
        onSubmit={submitAction}
        isSubmitting={isSubmitting}
        status={status}
      />
    </div>
  );
}
