---
name: launch-app
description: Launch the NicTasks Tauri desktop app for development. Use when the user asks to launch, start, run, or build the app, or when a dev server needs to be started.
---

# Launch NicTasks

Run the `LaunchApp.ps1` script in the workspace root to build and launch the app:

```powershell
.\LaunchApp.ps1
```

This script kills any existing processes on port 1420 (Vite dev server) before running `npm run tauri dev`.
