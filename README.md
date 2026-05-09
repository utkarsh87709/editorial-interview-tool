# Editorial Interview Tool (Frontend Prototype)

Frontend-only demo built with Vite + React + Tailwind.

## What it demos

- Stage 1: editor enters 6 fields → selects a **Type** → research template renders → **Generate Research** fills topic textareas (editable).
- Stage 2: **Generate Questions →** produces 8 editable question cards with checkboxes.
- Export: **Copy selected** or **Download .txt**.
- Prototype persistence: state saved in `localStorage` so you can refresh and keep work.

## Run locally

From `editorial-interview-tool/`:

```bash
npm install
npm run dev
```

## Claude key (optional for demo)

By default, generation uses a mock generator so the demo works offline.

You can toggle **Use real Claude** in the UI and paste your Anthropic key, but note:
- This calls Anthropic directly from the browser, which exposes your key.
- Production should move calls to your backend (we can build next).

