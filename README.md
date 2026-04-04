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
- A dedicated character sheet page
- NPC personalities with goals, traits, and status
- Save and resume with browser local storage
- Optional Firebase cloud saves with anonymous sign-in
- A fixed-height game layout with tabbed sidebar sections
- Gemini narration with explicit error reporting when the API is unavailable
- Imagen-powered map, location, and NPC portrait generation

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

3. Optional: add a Gemini API key for narration and Imagen art.

- Copy `.env.example` to `.env.local`
- Put your key on the `GEMINI_API_KEY=` line
- Leave `IMAGE_MODEL=imagen-4.0-fast-generate-001` if you want the cheapest Imagen 4 option
- You can create a key in Google AI Studio

4. Optional: add Firebase cloud save values.

- In the Firebase console, create a web app and copy its `firebaseConfig`
- Turn on **Anonymous** authentication
- Create a Cloud Firestore database
- Fill in the `NEXT_PUBLIC_FIREBASE_*` values in `.env.local`
- A simple starter rule is:

```txt
service cloud.firestore {
  match /databases/{database}/documents {
    match /gameSaves/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

5. Start the app:

```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000)

## How the code is organized

- `app/`
  Next.js pages and API routes
- `components/game/`
  The game screen UI
- `lib/firebase/`
  Firebase setup for anonymous auth and Firestore
- `lib/game/`
  Game data, rules, local saves, and cloud-save helpers

## How the turn system works

1. The player types an action.
2. The API route rolls a d20 and applies simple rules.
3. The app updates HP, quests, inventory, and world state.
4. Gemini narrates the result when the API key is available.
5. Imagen generates location art, maps, and NPC portraits when the API key is available.
6. If the API call fails, the app shows the real error instead of generating fake story text.
7. The updated game is saved in the browser.
8. If Firebase is configured, the same save is synced to Firestore.

## Git safety

- `.env`, `.env.local`, and other dotenv files are ignored by `.gitignore`
- `.env.example` stays safe to commit because it contains placeholders only

## Good next steps after this MVP

- Add image generation for locations and major NPCs
- Add more quests and branching world flags
- Add NPC personality data
- Add music and ambient sound as a phase 2 feature
