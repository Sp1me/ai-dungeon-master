"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  clearArtCache,
  loadLatestSceneState,
  type CachedArtAsset,
} from "@/lib/game/art";
import { requestGeneratedArt } from "@/lib/game/art-client";
import type { GameState } from "@/lib/game/types";

const atlasSections = [
  { id: "map", label: "2D Map" },
  { id: "location", label: "Location Art" },
  { id: "npcs", label: "NPC Portraits" },
] as const;

type AtlasSection = (typeof atlasSections)[number]["id"];

type GenerationState = {
  loading: boolean;
  message: string;
};

function AtlasImageCard({
  title,
  subtitle,
  asset,
  loading,
  message,
  onGenerate,
  buttonLabel,
}: {
  title: string;
  subtitle: string;
  asset: CachedArtAsset | null;
  loading: boolean;
  message: string;
  onGenerate: (force?: boolean) => Promise<void>;
  buttonLabel: string;
}) {
  return (
    <section className="panel-card atlas-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="section-title">{title}</p>
          <h2 className="m-0 text-2xl font-semibold">{subtitle}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="button-primary"
            type="button"
            disabled={loading}
            onClick={() => void onGenerate(false)}
          >
            {loading ? "Generating..." : buttonLabel}
          </button>
          <button
            className="button-secondary"
            type="button"
            disabled={loading}
            onClick={() => void onGenerate(true)}
          >
            Refresh art
          </button>
        </div>
      </div>

      <div className="atlas-image-frame mt-5">
        {asset ? (
          <Image
            className="atlas-image"
            src={asset.imageDataUrl}
            alt={`${title} illustration`}
            width={1536}
            height={1024}
            unoptimized
          />
        ) : (
          <div className="atlas-empty">
            <p className="m-0 text-lg font-semibold">No art generated yet.</p>
            <p className="m-0 mt-2 text-sm leading-6 text-[rgba(245,237,220,0.72)]">
              Generate this view when you want a visual, and keep the chat screen focused on play.
            </p>
          </div>
        )}
      </div>

      <p className="mb-0 mt-4 text-sm leading-6 text-[rgba(245,237,220,0.78)]">
        {message ||
          (asset
            ? `Generated ${new Date(asset.generatedAt).toLocaleString()}.`
            : "Ready when you want a fresh image.")}
      </p>
    </section>
  );
}

export function SceneAtlasClient() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [hasLoadedState, setHasLoadedState] = useState(false);
  const [activeSection, setActiveSection] = useState<AtlasSection>("map");
  const [locationAsset, setLocationAsset] = useState<CachedArtAsset | null>(null);
  const [mapAsset, setMapAsset] = useState<CachedArtAsset | null>(null);
  const [npcAssets, setNpcAssets] = useState<Record<string, CachedArtAsset>>({});
  const [selectedNpcId, setSelectedNpcId] = useState("");
  const [mapStatus, setMapStatus] = useState<GenerationState>({ loading: false, message: "" });
  const [locationStatus, setLocationStatus] = useState<GenerationState>({
    loading: false,
    message: "",
  });
  const [npcStatus, setNpcStatus] = useState<GenerationState>({ loading: false, message: "" });

  const selectedNpc = useMemo(
    () => gameState?.world.npcs.find((npc) => npc.id === selectedNpcId) ?? null,
    [gameState, selectedNpcId],
  );

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const latestState = loadLatestSceneState();
      setGameState(latestState);
      setSelectedNpcId(latestState?.world.npcs[0]?.id ?? "");
      setHasLoadedState(true);
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    if (!gameState) {
      return;
    }

    const currentState = gameState;
    let cancelled = false;

    async function warmAtlas() {
      try {
        const locationResult = await requestGeneratedArt({
          kind: "location",
          state: currentState,
        });
        if (!cancelled) {
          setLocationAsset(locationResult.asset);
          setLocationStatus({
            loading: false,
            message: locationResult.cached
              ? "Location art is already ready."
              : `Location art prepared with ${locationResult.model}.`,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setLocationStatus({
            loading: false,
            message: error instanceof Error ? error.message : "Location art could not be prepared.",
          });
        }
      }

      try {
        const mapResult = await requestGeneratedArt({
          kind: "map",
          state: currentState,
        });
        if (!cancelled) {
          setMapAsset(mapResult.asset);
          setMapStatus({
            loading: false,
            message: mapResult.cached
              ? "Map art is already ready."
              : `Map prepared with ${mapResult.model}.`,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setMapStatus({
            loading: false,
            message: error instanceof Error ? error.message : "Map art could not be prepared.",
          });
        }
      }

      const localNpc = currentState.world.npcs.find(
        (npc) =>
          npc.location === currentState.world.location &&
          (npc.status === "active" || npc.status === "safe"),
      );

      if (!localNpc) {
        return;
      }

      try {
        const npcResult = await requestGeneratedArt({
          kind: "npc",
          state: currentState,
          npcId: localNpc.id,
        });
        if (!cancelled) {
          setNpcAssets((current) => ({
            ...current,
            [localNpc.id]: npcResult.asset,
          }));
          setNpcStatus({
            loading: false,
            message: npcResult.cached
              ? `${localNpc.name}'s portrait is ready.`
              : `${localNpc.name}'s portrait was prepared with ${npcResult.model}.`,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setNpcStatus({
            loading: false,
            message: error instanceof Error ? error.message : "NPC portrait could not be prepared.",
          });
        }
      }
    }

    void warmAtlas();

    return () => {
      cancelled = true;
    };
  }, [gameState]);

  async function generateArt(kind: "map" | "location" | "npc", force = false) {
    if (!gameState) {
      return;
    }

    const statusSetter =
      kind === "map"
        ? setMapStatus
        : kind === "location"
          ? setLocationStatus
          : setNpcStatus;

    statusSetter({ loading: true, message: "Generating art with Imagen..." });

    try {
      const result = await requestGeneratedArt({
        kind,
        state: gameState,
        npcId: kind === "npc" ? selectedNpc?.id : undefined,
        force,
      });

      if (kind === "map") {
        setMapAsset(result.asset);
      } else if (kind === "location") {
        setLocationAsset(result.asset);
      } else if (selectedNpc) {
        setNpcAssets((current) => ({
          ...current,
          [selectedNpc.id]: result.asset,
        }));
      }

      statusSetter({
        loading: false,
        message: result.cached
          ? "Using cached art. Press Refresh art if you want a new version."
          : `Generated with ${result.model}.`,
      });
    } catch (error) {
      console.error(error);
      statusSetter({
        loading: false,
        message:
          error instanceof Error ? error.message : "Something went wrong while generating art.",
      });
    }
  }

  if (!hasLoadedState) {
    return (
      <section className="hero-card">
        <div className="space-y-4">
          <p className="text-sm uppercase tracking-[0.25em] text-[var(--accent-strong)]">Scene Atlas</p>
          <h1 className="m-0 text-4xl font-semibold leading-tight text-[var(--accent-strong)]">
            Loading your latest scene.
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-[rgba(31,26,20,0.82)]">
            Pulling the most recent local save so the atlas can open directly on the 2D map.
          </p>
        </div>
      </section>
    );
  }

  if (!gameState) {
    return (
      <section className="hero-card">
        <div className="space-y-5">
          <p className="text-sm uppercase tracking-[0.25em] text-[var(--accent-strong)]">Scene Atlas</p>
          <h1 className="m-0 text-4xl font-semibold leading-tight text-[var(--accent-strong)]">
            Start or resume a game before opening the visual atlas.
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-[rgba(31,26,20,0.82)]">
            This page reads from your latest saved adventure so it can generate maps, location art,
            and NPC portraits without cluttering the main game loop.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link className="button-primary" href="/game">
              Back to game
            </Link>
            <Link className="button-hero-secondary" href="/">
              Home
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="scene-shell">
      <aside className="panel-card scene-sidebar p-5">
        <div>
          <p className="section-title">Scene Atlas</p>
          <h1 className="m-0 text-3xl font-semibold">{gameState.world.location}</h1>
          <p className="mt-2 text-sm leading-6 text-[rgba(245,237,220,0.78)]">{gameState.world.scene}</p>
        </div>

        <div className="sidebar-tabs" role="tablist" aria-label="Atlas sections">
          {atlasSections.map((section) => (
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

        <div className="space-y-4 text-sm leading-6 text-[rgba(245,237,220,0.78)]">
          <div className="rounded-2xl bg-[rgba(255,245,227,0.06)] p-4">
            <p className="section-title">Current Objective</p>
            <p className="m-0">{gameState.world.currentObjective}</p>
          </div>
          <div className="rounded-2xl bg-[rgba(255,245,227,0.06)] p-4">
            <p className="section-title">Auto Art</p>
            <p className="m-0">
              The atlas warms new location art and maps in the background when your story reaches
              a new place.
            </p>
          </div>
          <div className="rounded-2xl bg-[rgba(255,245,227,0.06)] p-4">
            <p className="section-title">Visual Style</p>
            <p className="m-0">
              Fantasy storybook art with a matching earthy palette, generated automatically when
              the API allows it and refreshable on demand.
            </p>
          </div>
        </div>

        <div className="sidebar-actions">
          <button
            className="button-secondary"
            type="button"
            onClick={() => {
              clearArtCache();
              setLocationAsset(null);
              setMapAsset(null);
              setNpcAssets({});
              setLocationStatus({ loading: false, message: "Art cache cleared." });
              setMapStatus({ loading: false, message: "Art cache cleared." });
              setNpcStatus({ loading: false, message: "Art cache cleared." });
            }}
          >
            Clear art cache
          </button>
          <Link className="button-secondary" href="/game">
            Back to game
          </Link>
          <Link className="button-secondary" href="/character">
            Character sheet
          </Link>
          <Link className="button-secondary" href="/">
            Home
          </Link>
        </div>
      </aside>

      <main className="scene-content">
        {activeSection === "map" ? (
          <AtlasImageCard
            title="2D Map"
            subtitle={gameState.world.location}
            asset={mapAsset}
            loading={mapStatus.loading}
            message={mapStatus.message}
            onGenerate={async (force) => generateArt("map", force)}
            buttonLabel="Generate map"
          />
        ) : null}

        {activeSection === "location" ? (
          <AtlasImageCard
            title="Location Art"
            subtitle={gameState.world.location}
            asset={locationAsset}
            loading={locationStatus.loading}
            message={locationStatus.message}
            onGenerate={async (force) => generateArt("location", force)}
            buttonLabel="Generate location art"
          />
        ) : null}

        {activeSection === "npcs" ? (
          <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
            <section className="panel-card atlas-card p-4">
              <p className="section-title">Choose NPC</p>
              <div className="space-y-3">
                {gameState.world.npcs.map((npc) => (
                  <button
                    key={npc.id}
                    className={`npc-select ${selectedNpcId === npc.id ? "selected" : ""}`}
                    type="button"
                    onClick={() => setSelectedNpcId(npc.id)}
                  >
                    <strong>{npc.name}</strong>
                    <span>{npc.role}</span>
                  </button>
                ))}
              </div>
            </section>

            <AtlasImageCard
              title="NPC Portrait"
              subtitle={selectedNpc ? `${selectedNpc.name} - ${selectedNpc.role}` : "Choose someone"}
              asset={selectedNpc ? npcAssets[selectedNpc.id] ?? null : null}
              loading={npcStatus.loading}
              message={
                selectedNpc
                  ? npcStatus.message || `${selectedNpc.notes} ${selectedNpc.goal}`
                  : "Pick an NPC to generate a portrait."
              }
              onGenerate={async (force) => generateArt("npc", force)}
              buttonLabel="Generate portrait"
            />
          </div>
        ) : null}
      </main>
    </div>
  );
}
