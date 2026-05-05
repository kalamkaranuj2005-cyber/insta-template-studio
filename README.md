# Insta Template Studio

A full-stack web app that turns a public Instagram post URL into an **editable, Canva-style template** — without copying the original. It extracts the media, analyzes the visual style (dominant colors, foreground/background, approximate text regions), and produces a fresh, layered canvas you can edit and export.

> **Compliance first.** This project does not redistribute or replicate copyrighted Instagram content. It uses policy-safe extraction (oEmbed + public Open Graph tags), falls back to manual upload, and generates *style-inspired* templates rather than exact copies.

---

## Features

**Frontend (React + Vite)**
- Clean Canva-like editor UI
- Instagram URL input with media preview
- Editable canvas (Konva) supporting:
  - Replace image / video
  - Editable text layers (font, size, color, position, weight)
  - Drag, resize, rotate any element
  - Filters & overlays (brightness, contrast, blur, sepia, color tint)
  - Multi-layer system with reorder, lock, hide
- Preset templates (Reel cover, Quote, Ad)
- Save & reload your templates
- Export to PNG / JPEG (image) and MP4 (video, server-side via FFmpeg)
- Watermark for free users (toggle off in settings)

**Backend (Node.js + Express)**
- `POST /api/instagram/extract` — policy-safe media extraction from public posts
- `POST /api/upload` — manual fallback upload (multipart)
- `POST /api/analyze` — AI-style analysis: dominant colors, foreground/background heuristic, approximate text regions
- `POST /api/export/video` — FFmpeg-based video export with overlays
- `GET/POST/DELETE /api/templates` — save & list user templates
- `GET /api/presets` — built-in style presets

---

## Folder Structure

```
Project/
├── README.md
├── package.json                # Root scripts: dev, install:all, build
├── .gitignore
├── backend/
│   ├── package.json
│   ├── .env.example
│   ├── server.js               # Express entry point
│   ├── routes/
│   │   ├── instagram.js        # URL extraction
│   │   ├── upload.js           # Manual upload fallback
│   │   ├── analyze.js          # AI analysis endpoints
│   │   ├── export.js           # Video export via FFmpeg
│   │   ├── templates.js        # Save/list templates
│   │   └── presets.js          # Built-in presets
│   ├── services/
│   │   ├── instagramService.js # oEmbed + OG-tag extraction
│   │   ├── analysisService.js  # Sharp-based color/region analysis
│   │   └── ffmpegService.js    # Video composition pipeline
│   ├── middleware/
│   │   └── upload.js           # multer config
│   ├── data/
│   │   ├── presets.json        # Reel cover, Quote, Ad presets
│   │   └── templates.json      # Persisted user templates
│   ├── uploads/                # User-uploaded media (gitignored)
│   └── exports/                # Rendered exports (gitignored)
└── frontend/
    ├── package.json
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── styles/app.css
        ├── store/editorStore.js   # Zustand state
        ├── utils/
        │   ├── api.js             # Axios client
        │   └── exportImage.js     # Konva → PNG/JPEG
        └── components/
            ├── TopBar.jsx
            ├── UrlInput.jsx
            ├── PresetPanel.jsx
            ├── LayerPanel.jsx
            ├── PropertyPanel.jsx
            ├── EditorCanvas.jsx   # Konva stage
            ├── MediaPreview.jsx
            └── ExportMenu.jsx
```

---

## Setup

### Prerequisites
- **Node.js 18+**
- **FFmpeg** in your `PATH` (required for video export)
  - Windows: `winget install Gyan.FFmpeg` or download from https://www.gyan.dev/ffmpeg/builds/
  - macOS: `brew install ffmpeg`
  - Linux: `sudo apt install ffmpeg`

### Install

From the repo root:

```bash
npm run install:all
```

This installs both `backend/` and `frontend/` dependencies.

### Configure

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` if you want to set `PORT`, `FB_APP_ID`/`FB_APP_TOKEN` (optional, enables richer Instagram oEmbed), or `FREE_TIER_WATERMARK=true`.

### Run (development)

```bash
npm run dev
```

This starts:
- Backend on `http://localhost:5000`
- Frontend on `http://localhost:5173`

The frontend Vite proxy forwards `/api/*` to the backend automatically.

### Build for production

```bash
npm run build
npm start
```

The backend serves the built frontend from `frontend/dist`.

---

## How Instagram extraction works (policy-safe)

Instagram aggressively blocks scraping. This app **does not** scrape logged-in pages or bypass auth. It tries, in order:

1. **Instagram oEmbed API** — official, requires a Meta App access token (set `FB_APP_TOKEN`). Returns post HTML, author, and thumbnail.
2. **Public Open Graph tags** — for posts whose `og:image` / `og:video` tags are publicly served. Polite single GET, identifies as a generic browser, no retry storms.
3. **Manual upload fallback** — if both fail, the UI prompts the user to upload the media themselves.

When extraction succeeds, the original is shown as a **style reference**. The editor opens a *new template* with similar dominant colors, layout regions, and font sizing — never an exact reproduction.

---

## What the "AI" analysis actually does

To stay light and dependency-free of large ML runtimes, analysis uses classical CV heuristics via [sharp](https://sharp.pixelplumbing.com/):

| Capability | Method |
|---|---|
| Dominant colors | Resize to 64×64, k-means on RGB pixels (k=5) |
| Foreground/background | Compare saturation+luminance of center vs edge bands |
| Text region approximation | Local contrast variance map; threshold high-variance horizontal bands |

These are *heuristics* — good enough to seed a template, not a substitute for a vision model. Swap in Replicate/Vision API in `backend/services/analysisService.js` if you need higher fidelity.

---

## Compliance notes

- The editor seeds templates from style features (palette, layout, typography sizing) — **not** the original pixels. The reference image is shown only in the side panel for inspiration.
- An exported template that still contains the original media (because the user dragged it onto the canvas) is the user's responsibility. The UI shows a copyright reminder before export when the source layer is unmodified.
- No login bypass, no rate-limit evasion, no headless-browser scraping.
- A `Watermark` is applied to free-tier exports. Toggle `FREE_TIER_WATERMARK=false` in `.env` for paid mode.

---

## License

MIT — see source headers.
