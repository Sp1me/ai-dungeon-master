"use client";

import Link from "next/link";
import { startTransition, useEffect, useMemo, useState, type FormEvent } from "react";
import { createNewGame } from "@/lib/game/data";
import { clearGameSave, loadGame, saveGame } from "@/lib/game/save";
import type { CharacterClass, GameState, SaveGameData } from "@/lib/game/types";

const classDescriptions: Record<CharacterClass, string> = {
  Warrior: "Tough, direct, and best when steel meets trouble.",
  Rogue: "Quick, subtle, and excellent at sneaking or scouting ahead.",
  Mage: "Fragile, clever, and strongest when knowledge changes the scene.",
};

function CharacterPanel({ state }: { state: GameState }) {
  return (
    <div className="panel-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="section-title">Character</p>
          <h2 className="mt-0 text-2xl font-semibold">{state.player.name}</h2>
          <p className="mt-1 text-sm text-[rgba(245,237,220,0.75)]">
            {state.player.className}
          </p>
        </div>
        <div className="rounded-2xl bg-[rgba(184,92,56,0.2)] px-3 py-2 text-sm">
          HP {state.player.hp}/{state.player.maxHp}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {state.player.stats.map((stat) => (
          <div className="stat-chip text-sm" key={stat.name}>
            <span>{stat.name}</span>
            <strong>{stat.value >= 0 ? `+${stat.value}` : stat.value}</strong>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <p className="section-title">Inventory</p>
        <div className="space-y-3">
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
              <p className="mt-1 text-sm text-[rgba(245,237,220,0.75)]">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <p className="section-title">Quest Log</p>
        <div className="space-y-3">
          {state.quests.map((quest) => (
            <div
              key={quest.id}
              className="rounded-2xl border border-[rgba(255,245,227,0.12)] bg-[rgba(255,245,227,0.06)] p-3"
            >
              <div className="flex items-center justify-between gap-3">
                <strong>{quest.title}</strong>
                <span className="text-sm capitalize text-[rgba(245,237,220,0.78)]">
                  {quest.status}
                </span>
              </div>
              <p className="mt-1 text-sm text-[rgba(245,237,220,0.75)]">
                {quest.summary}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

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
          <div
            key={message.id}
            className={`message-bubble message-${message.role}`}
          >
            <p className="m-0 whitespace-pre-wrap">{message.text}</p>
          </div>
        ))}
      </div>

      <form className="space-y-3 border-t border-[rgba(255,245,227,0.12)] pt-4" onSubmit={onSubmit}>
        <label className="block text-sm text-[rgba(245,237,220,0.82)]" htmlFor="action">
          What do you do next?
        </label>
        <textarea
          id="action"
          className="textarea min-h-[120px]"
          placeholder='Try something free-form like: "I search the broken wagon for clues."'
          value={action}
          onChange={(event) => onActionChange(event.target.value)}
          disabled={isSubmitting || state.player.hp <= 0}
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
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

export function GameClient() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [savedGame, setSavedGame] = useState<SaveGameData | null>(null);
  const [playerName, setPlayerName] = useState("Aria");
  const [selectedClass, setSelectedClass] = useState<CharacterClass>("Warrior");
  const [action, setAction] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const parsed = loadGame();
    if (parsed) {
      setSavedGame(parsed);
    }
  }, []);

  useEffect(() => {
    if (!gameState) {
      return;
    }

    const payload = saveGame(gameState);
    if (payload) {
      setSavedGame(payload);
    }
  }, [gameState]);

  const canResume = useMemo(() => Boolean(savedGame && !gameState), [savedGame, gameState]);

  function startNewGame() {
    startTransition(() => {
      const freshGame = createNewGame(playerName.trim() || "Aria", selectedClass);
      setGameState(freshGame);
      setStatus("A new journey begins.");
      setAction("");
    });
  }

  function resumeGame() {
    if (!savedGame) {
      return;
    }

    startTransition(() => {
      setGameState(savedGame.state);
      setStatus("Save loaded.");
    });
  }

  function clearSave() {
    clearGameSave();
    setSavedGame(null);
    setGameState(null);
    setStatus("Save cleared.");
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
        throw new Error("Turn request failed.");
      }

      const data = (await response.json()) as {
        nextState: GameState;
      };

      setAction("");
      setGameState(data.nextState);
      setStatus("Turn resolved.");
    } catch (error) {
      console.error(error);
      setStatus("That turn failed to load. Check your terminal for details.");
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
                  <button className="button-danger" type="button" onClick={clearSave}>
                    Clear save
                  </button>
                ) : null}
                <Link className="button-primary" href="/character">
                  View character sheet
                </Link>
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-[rgba(125,46,20,0.14)] bg-[rgba(255,250,242,0.78)] p-6 shadow-[0_18px_40px_rgba(88,58,29,0.08)]">
            <p className="section-title !text-[var(--accent-strong)]">How This Starter Works</p>
            <div className="space-y-4 text-sm leading-7 text-[rgba(31,26,20,0.82)]">
              <p className="m-0">
                The browser saves your game in local storage, so you can refresh
                and continue. Later, we can upgrade this to Firebase.
              </p>
              <p className="m-0">
                If you add an <code>OPENAI_API_KEY</code>, the API route will ask
                OpenAI to narrate the turn. Without a key, the project still works
                with a built-in storyteller.
              </p>
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
      <aside className="sidebar">
        <CharacterPanel state={gameState} />
        <div className="panel-card p-5">
          <p className="section-title">Current Objective</p>
          <p className="m-0 text-sm leading-6 text-[rgba(245,237,220,0.82)]">
            {gameState.world.currentObjective}
          </p>
        </div>
        <div className="panel-card p-5">
          <p className="section-title">World Memory</p>
          <div className="space-y-3 text-sm leading-6 text-[rgba(245,237,220,0.78)]">
            {gameState.world.summary.map((entry) => (
              <p className="m-0" key={entry}>
                {entry}
              </p>
            ))}
          </div>
        </div>
        <div className="panel-card p-5">
          <p className="section-title">Notable NPCs</p>
          <div className="space-y-3">
            {gameState.world.npcs.map((npc) => (
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
                <p className="mb-0 mt-1 text-sm text-[rgba(245,237,220,0.82)]">
                  {npc.role}
                </p>
                <p className="mb-0 mt-2 text-sm leading-6 text-[rgba(245,237,220,0.7)]">
                  {npc.notes}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <button className="button-secondary" type="button" onClick={clearSave}>
              Start over
            </button>
            <Link className="button-secondary" href="/character">
              Character sheet
            </Link>
            <Link className="button-secondary" href="/">
              Back home
            </Link>
          </div>
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
