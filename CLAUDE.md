# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

ext-pack is a Node.js CLI tool that bundles and installs Chromium-based browser extensions (Brave, Chrome, Chromium, Edge) with zero friction. It creates `.extpack` files (JSON format, v2/v3) containing extension references, then relaunches browsers with `--load-extension` to load them persistently.

## Commands

```bash
npm run dev          # Run CLI locally: node bin/ext-pack.js
npm link             # Install globally as `ext-pack` command
npm unlink -g ext-pack  # Remove global link
```

No test framework or linter is configured.

## Architecture

**Entry point**: `bin/ext-pack.js` — parses args, handles `.extpack` file argument or launches interactive menu.

**Layer separation**:
- `src/commands/` — Thin command handlers (create, install, list, share) that delegate to UI wizards
- `src/ui/` — Interactive prompts using inquirer (wizards, menus, helpers)
- `src/core/` — Business logic with no UI dependencies:
  - `pack-codec.js` — Pack create/validate/read/write, URL encode/decode (base64), v2→v3 upgrade
  - `extension-scanner.js` — Recursive directory scan for `manifest.json`, extension validation
  - `pack-installer.js` — Orchestrates install: processes local/github/store extensions, relaunches browser
  - `browser-launcher.js` — Kill/spawn browser processes with `--load-extension` flag
  - `github-api.js` — Download GitHub releases, extract zips, find extension dirs in extracted files
- `src/utils/` — Cross-cutting utilities:
  - `browser-detector.js` — Platform-specific browser path/process detection (darwin/linux/win32)
  - `config-manager.js` — Manages `~/.ext-pack/` config, installation registry, cache dir

**Key patterns**:
- ESM modules throughout (`"type": "module"` in package.json)
- All modules use both named exports and a default object export
- Commands flow: command → UI wizard → core logic
- Three extension types: `local` (filesystem), `github` (downloaded releases), `store` (manual install only)
- User config lives at `~/.ext-pack/` (config.json, installed.json, downloads/)
