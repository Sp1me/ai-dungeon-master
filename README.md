# Solo Dungeon Master Starter

(Vibe coded using ChatGPT Codex)

This is a beginner-friendly Next.js starter for a solo fantasy RPG where an AI can act as the Dungeon Master.

## What is already built

- Character creation
- Chat-style game screen
- Free-form player actions
- Transparent d20 rolls
- Fail states that can cost HP
- Inventory, quests, and world memory
- Save and resume with browser local storage
- Optional OpenAI narration with a fallback local narrator

## What you need to install first

Before this project can run, install **Node.js**.

- Download the current LTS version from [nodejs.org](https://nodejs.org/)
- During setup, keep the default options
- After install, reopen your terminal

Then confirm it worked:

```bash
node -v
npm -v
```

## How to start the project

1. Open a terminal in this folder.
2. Install the packages:

```bash
npm install
```

3. Optional: add an OpenAI API key.

- Copy `.env.example` to `.env.local`
- Put your key on the `OPENAI_API_KEY=` line

4. Start the app:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

## How the code is organized

- `app/`
  Next.js pages and API routes
- `components/game/`
  The game screen UI
- `lib/game/`
  Game data, rules, and fallback narration

## How the turn system works

1. The player types an action.
2. The API route rolls a d20 and applies simple rules.
3. The app updates HP, quests, inventory, and world state.
4. OpenAI narrates the result if a key exists.
5. If no key exists, a local fallback narrator writes the scene.
6. The updated game is saved in the browser.

## Good next steps after this MVP

- Move saves from local storage to Firebase Auth + Firestore
- Add image generation for locations and major NPCs
- Add more quests and branching world flags
- Add NPC personality data
- Add music and ambient sound as a phase 2 feature
