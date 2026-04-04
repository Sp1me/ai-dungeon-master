import Link from "next/link";

const pillars = [
  "Push the story with free-form actions while the app keeps the rules, quests, and consequences grounded.",
  "Visual scene tools live in the atlas once your adventure is underway, keeping the main play screen focused.",
  "Local saves are immediate, and Firebase sync can layer on later when you want cloud continuity.",
];

const omenCards = [
  "A ruined wagon lies half-swallowed by mist and pine roots.",
  "A goblin scavenger knows more than he is saying.",
  "The next turn can change the whole mood of the road.",
];

export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="hero-card">
        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-6">
            <p className="text-sm uppercase tracking-[0.25em] text-[var(--accent-strong)]">
              Solo Fantasy Adventure
            </p>
            <div className="space-y-4">
              <h1 className="max-w-3xl text-5xl font-semibold leading-tight text-[var(--accent-strong)]">
                The road into Briar Glen is open.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-[rgba(31,26,20,0.86)]">
                Step into a storybook campaign with live DM narration, visible dice logic,
                visual scene art, and a quiet little world that remembers what you have done.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link className="button-primary" href="/game">
                Begin your character
              </Link>
              <Link className="button-primary" href="/character">
                View character sheet
              </Link>
            </div>

            <div className="space-y-4">
              <p className="section-title !text-[var(--accent-strong)]">Why It Works</p>
              {pillars.map((pillar) => (
                <div
                  key={pillar}
                  className="rounded-2xl border border-[rgba(125,46,20,0.12)] bg-[rgba(255,250,242,0.62)] px-5 py-4 text-sm leading-7 text-[rgba(31,26,20,0.82)]"
                >
                  {pillar}
                </div>
              ))}
            </div>
          </div>

          <aside className="rounded-[24px] border border-[rgba(125,46,20,0.14)] bg-[rgba(255,250,242,0.74)] p-6 shadow-[0_18px_40px_rgba(88,58,29,0.08)]">
            <div className="space-y-5">
              <p className="section-title !text-[var(--accent-strong)]">Tonight&apos;s Hook</p>
              <h2 className="m-0 text-4xl font-semibold text-[var(--accent-strong)]">
                Wagon tracks vanish at the forest edge.
              </h2>
              <p className="m-0 text-base leading-7 text-[rgba(31,26,20,0.82)]">
                Somewhere ahead, a courier is missing, the locals are uneasy, and the first clue is
                waiting for whoever is bold enough to investigate.
              </p>
            </div>

            <div className="mt-6 space-y-3">
              {omenCards.map((card) => (
                <div
                  key={card}
                  className="rounded-2xl border border-[rgba(125,46,20,0.12)] bg-[rgba(255,255,255,0.46)] px-4 py-3 text-base leading-7 text-[rgba(31,26,20,0.84)]"
                >
                  {card}
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
