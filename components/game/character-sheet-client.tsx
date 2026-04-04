"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { compareSaves, hasCloudSaveConfig, loadCloudGame, loadGame } from "@/lib/game/save";
import type { SaveGameData } from "@/lib/game/types";

export function CharacterSheetClient() {
  const [saveData, setSaveData] = useState<SaveGameData | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadLatestSave() {
      const localSave = loadGame();
      let latestSave = localSave;

      if (hasCloudSaveConfig()) {
        try {
          const cloudSave = await loadCloudGame();
          latestSave = compareSaves(localSave, cloudSave);
        } catch (error) {
          console.error(error);
        }
      }

      const frameId = window.requestAnimationFrame(() => {
        if (!cancelled) {
          setSaveData(latestSave);
        }
      });

      return () => window.cancelAnimationFrame(frameId);
    }

    let cleanup: (() => void) | undefined;
    void loadLatestSave().then((fn) => {
      cleanup = fn;
    });

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);

  if (!saveData) {
    return (
      <section className="hero-card">
        <div className="space-y-5">
          <p className="text-sm uppercase tracking-[0.25em] text-[var(--accent-strong)]">
            Character Sheet
          </p>
          <h1 className="m-0 text-4xl font-semibold text-[var(--accent-strong)]">
            No saved character yet.
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-[rgba(31,26,20,0.84)]">
            Start a run first, then this page will show your stats, gear, quests,
            and the NPCs your story has introduced.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link className="button-primary" href="/game">
              Start playing
            </Link>
            <Link className="button-primary" href="/">
              Back home
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const { state } = saveData;

  return (
    <section className="hero-card">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-[var(--accent-strong)]">
            Character Sheet
          </p>
          <h1 className="m-0 mt-2 text-4xl font-semibold text-[var(--accent-strong)]">
            {state.player.name}
          </h1>
          <p className="mt-2 text-base text-[rgba(31,26,20,0.74)]">
            {state.player.className} | HP {state.player.hp}/{state.player.maxHp}
          </p>
        </div>
        <div className="rounded-2xl border border-[rgba(125,46,20,0.14)] bg-[rgba(255,255,255,0.48)] px-4 py-3 text-sm text-[rgba(31,26,20,0.8)]">
          Saved {new Date(saveData.savedAt).toLocaleString()}
        </div>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-5">
          <div className="rounded-[24px] border border-[rgba(125,46,20,0.14)] bg-[rgba(255,250,242,0.78)] p-6">
            <p className="section-title !text-[var(--accent-strong)]">Stats</p>
            <div className="flex flex-wrap gap-3">
              {state.player.stats.map((stat) => (
                <div
                  key={stat.name}
                  className="rounded-full border border-[rgba(125,46,20,0.12)] bg-[rgba(255,255,255,0.5)] px-4 py-2 text-sm"
                >
                  {stat.name}: <strong>{stat.value >= 0 ? `+${stat.value}` : stat.value}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[24px] border border-[rgba(125,46,20,0.14)] bg-[rgba(255,250,242,0.78)] p-6">
            <p className="section-title !text-[var(--accent-strong)]">Inventory</p>
            <div className="space-y-3">
              {state.inventory.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-[rgba(125,46,20,0.12)] bg-[rgba(255,255,255,0.42)] p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <strong>{item.name}</strong>
                    {item.equipped ? (
                      <span className="rounded-full bg-[rgba(184,92,56,0.12)] px-3 py-1 text-xs uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                        Equipped
                      </span>
                    ) : null}
                  </div>
                  <p className="mb-0 mt-2 text-sm leading-6 text-[rgba(31,26,20,0.74)]">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-[24px] border border-[rgba(125,46,20,0.14)] bg-[rgba(255,250,242,0.78)] p-6">
            <p className="section-title !text-[var(--accent-strong)]">Quest Log</p>
            <div className="space-y-3">
              {state.quests.map((quest) => (
                <div
                  key={quest.id}
                  className="rounded-2xl border border-[rgba(125,46,20,0.12)] bg-[rgba(255,255,255,0.42)] p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <strong>{quest.title}</strong>
                    <span className="text-sm capitalize text-[rgba(31,26,20,0.7)]">
                      {quest.status}
                    </span>
                  </div>
                  <p className="mb-0 mt-2 text-sm leading-6 text-[rgba(31,26,20,0.74)]">
                    {quest.summary}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[24px] border border-[rgba(125,46,20,0.14)] bg-[rgba(255,250,242,0.78)] p-6">
            <p className="section-title !text-[var(--accent-strong)]">World State</p>
            <p className="m-0 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
              Current Objective
            </p>
            <p className="mt-2 text-sm leading-6 text-[rgba(31,26,20,0.78)]">
              {state.world.currentObjective}
            </p>
            <div className="mt-4 space-y-2 text-sm leading-6 text-[rgba(31,26,20,0.74)]">
              {state.world.summary.map((entry) => (
                <p className="m-0" key={entry}>
                  {entry}
                </p>
              ))}
            </div>
          </div>

          <div className="rounded-[24px] border border-[rgba(125,46,20,0.14)] bg-[rgba(255,250,242,0.78)] p-6">
            <p className="section-title !text-[var(--accent-strong)]">Notable NPCs</p>
            <div className="space-y-3">
              {state.world.npcs.map((npc) => (
                <div
                  key={npc.id}
                  className="rounded-2xl border border-[rgba(125,46,20,0.12)] bg-[rgba(255,255,255,0.42)] p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <strong>{npc.name}</strong>
                    <span className="text-xs uppercase tracking-[0.18em] text-[rgba(31,26,20,0.62)]">
                      {npc.disposition} | {npc.status}
                    </span>
                  </div>
                  <p className="mb-0 mt-1 text-sm text-[rgba(31,26,20,0.82)]">{npc.role}</p>
                  <p className="mb-0 mt-2 text-sm leading-6 text-[rgba(31,26,20,0.74)]">
                    Traits: {npc.traits.join(", ")}
                  </p>
                  <p className="mb-0 mt-1 text-sm leading-6 text-[rgba(31,26,20,0.74)]">
                    Goal: {npc.goal}
                  </p>
                  <p className="mb-0 mt-1 text-sm leading-6 text-[rgba(31,26,20,0.74)]">
                    Notes: {npc.notes}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link className="button-primary" href="/game">
          Back to game
        </Link>
        <Link className="button-primary" href="/">
          Home
        </Link>
      </div>
    </section>
  );
}
