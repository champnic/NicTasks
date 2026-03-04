---
name: release
description: Commit and push a new release of NicTasks. Use when the user asks to release, publish, commit and push a release, bump version, or create a new version.
---

# Release Process

## Steps

1. **Check status**: `git status` and `git diff --stat` to review changes.

2. **Bump version** in all 4 files (replace old version string with new):
   - `package.json` → `"version": "X.Y.Z"`
   - `src-tauri/tauri.conf.json` → `"version": "X.Y.Z"`
   - `src-tauri/Cargo.toml` → `version = "X.Y.Z"`
   - `src/App.tsx` → version label `vX.Y.Z</span>`

3. **Commit, tag, push**:
   ```powershell
   git add -A
   git commit -m "vX.Y.Z: brief description of changes"
   git tag vX.Y.Z
   git push origin main --tags
   ```

4. **Create draft release**:
   ```powershell
   gh release create vX.Y.Z --title "vX.Y.Z" --notes "### Changes\n- item" --draft
   ```

5. **Provide Actions link** so the user can monitor the build:
   ```
   https://github.com/champnic/NicTasks/actions
   ```
   The GitHub Actions workflow triggers on the tag push, builds the installer, attaches artifacts to the draft release, then publishes it automatically.

## Version Scheme

Increment the patch version (e.g. 0.1.4 → 0.1.5) unless the user specifies otherwise.
