import Link from "next/link";

const features = [
  "Free-form actions like “I search the wagon tracks” or “I attack the goblin.”",
  "Transparent d20 rolls with stat modifiers and visible fail states.",
  "Character sheet, inventory, quest log, and a lightweight world memory.",
  "Works without an API key using a built-in narrator, then upgrades to OpenAI later.",
];

export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="hero-card">
        <div className="grid gap-8 lg:grid-cols-[1.25fr_0.95fr]">
          <div className="space-y-6">
            <p className="text-sm uppercase tracking-[0.25em] text-[var(--accent-strong)]">
              Beginner-Friendly Starter
            </p>
            <div className="space-y-4">
              <h1 className="max-w-3xl text-5xl font-semibold leading-tight text-[var(--accent-strong)]">
                Build your own solo fantasy RPG with an AI Dungeon Master.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-[rgba(31,26,20,0.86)]">
                This starter is organized for learning: one app, one game screen,
                local save files first, and an OpenAI-powered narrator you can add
                when you are ready.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link className="button-primary" href="/game">
                Open the game
              </Link>
              <a
                className="button-primary"
                href="https://nextjs.org/docs/app/getting-started/installation"
                target="_blank"
                rel="noreferrer"
              >
                Next.js setup guide
              </a>
            </div>
          </div>

          <div className="rounded-[24px] border border-[rgba(125,46,20,0.12)] bg-[rgba(255,250,242,0.76)] p-6 shadow-[0_18px_40px_rgba(88,58,29,0.08)]">
            <p className="section-title !text-[var(--accent-strong)]">What This Includes</p>
            <div className="space-y-3">
              {features.map((feature) => (
                <div
                  key={feature}
                  className="rounded-2xl border border-[rgba(125,46,20,0.12)] bg-[rgba(255,255,255,0.42)] px-4 py-3 text-sm leading-6 text-[rgba(31,26,20,0.84)]"
                >
                  {feature}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

