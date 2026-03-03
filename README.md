# NicTasks

> A simple, fast task management app for Windows — built with Tauri, React, and Rust.

## Features

- **Simple task lists** with Today / Later sections (plus custom sections)
- **Drag-and-drop** reordering of tasks and sections
- **Inline editing** — double-click to rename tasks or sections
- **Global shortcut** — `Ctrl+Alt+T` to create a new task from anywhere
- **OneDrive sync** — data stored in `Documents/NicTasks/` for automatic cross-device sync
- **Auto-updates** via GitHub Releases
- **Lightweight** — native desktop app, not Electron

## Download

- [Windows (.exe)](https://github.com/Champnic/NicTasks/releases/latest)

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) (LTS)
- [Rust](https://rustup.rs/) (stable)
- npm

### Setup

```bash
npm install
npm run tauri dev
```

### Build

```bash
npm run tauri build
```

## Tech Stack

- [Tauri v2](https://v2.tauri.app/) — Desktop framework
- [React](https://react.dev/) + TypeScript — Frontend
- [Vite](https://vite.dev/) — Build tool
- [Zustand](https://zustand.docs.pmnd.rs/) — State management
- [dnd-kit](https://dndkit.com/) — Drag and drop
- [Tailwind CSS](https://tailwindcss.com/) — Styling

## Auto-Update

The app auto-updates via GitHub Releases. Push a version tag (`v*`) to trigger a release build.

## License

MIT
