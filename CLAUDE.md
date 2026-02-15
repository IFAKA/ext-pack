# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

ext-pack is a Node.js CLI tool that bundles and installs Chromium-based browser extensions (Brave, Chrome, Chromium, Edge) with zero friction. It creates `.extpack` files (compressed bundles) containing full extension files, publishes them to a GitHub-based registry, and allows users to install packs from the registry. Think "npm for Chrome extensions".

**Key Features:**
- **Extension selection** - Checkbox prompt (unchecked by default) to choose which extensions to include
- **AI-powered metadata** - Ollama auto-generates descriptions and suggests tags (if running)
- **GitHub registry** - Publish packs to `IFAKA/ext-pack-registry` with auto-merge PRs
- **Full bundling** - Extensions are gzip-compressed and bundled into .extpack files
- **One-command install** - `ext-pack install` browses registry and installs extensions to browser

## ⚠️ CRITICAL: Testing Requirement

**BEFORE pushing ANY changes, you MUST:**
1. Test EVERY user flow end-to-end
2. Verify each command works as expected
3. Check for errors at each step
4. Run `npm link` to test local changes
5. Only commit once ALL flows work perfectly

**Main User Flows to Test:**
- **Create**: `ext-pack create` → select extensions, AI generates description/tags, optionally publish to registry
- **Install**: `ext-pack install` → browse registry, select pack, download and install extensions
- **List**: `ext-pack list` → manage installed packs (view, update, remove)

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
- `src/commands/` — Thin command handlers (create, install, list) that delegate to UI wizards
- `src/ui/` — Interactive prompts using inquirer (wizards, menus, helpers):
  - `create-wizard.js` — Extension selection (checkbox), AI description generation, metadata prompts
  - `publish-wizard.js` — AI tag suggestions (Ollama), GitHub auth, pack publishing
  - `install-wizard.js` — Registry browser, pack selection, download and installation
  - `list-wizard.js` — Pack management (view, update, remove)
- `src/core/` — Business logic with no UI dependencies:
  - `pack-codec.js` — Pack create/validate/read/write, URL encode/decode (base64)
  - `bundle-codec.js` — Gzip compression/decompression, extension bundling/extraction
  - `extension-scanner.js` — Recursive directory scan for `manifest.json`, extension validation
  - `pack-installer.js` — Orchestrates install: extracts bundles, relaunches browser
  - `browser-launcher.js` — Kill/spawn browser processes with `--load-extension` flag
  - `github-publisher.js` — GitHub releases, registry.json PRs, auto-fork/branch logic
  - `registry-client.js` — Fetch registry, search packs, download from GitHub releases
- `src/utils/` — Cross-cutting utilities:
  - `browser-detector.js` — Platform-specific browser path/process detection (darwin/linux/win32)
  - `config-manager.js` — Manages `~/.ext-pack/` config, installation registry, cache dir

**Key patterns**:
- ESM modules throughout (`"type": "module"` in package.json)
- All modules use both named exports and a default object export
- Commands flow: command → UI wizard → core logic
- Extension types: `bundled` (compressed in pack), `github` (downloaded releases), `store` (manual install only)
- User config lives at `~/.ext-pack/` (config.json, packs/, downloads/)
- Registry: GitHub-based at `IFAKA/ext-pack-registry` with auto-merge validation
- AI features: Ollama integration for description generation and tag suggestions (optional)
- Versioning: Dynamic version reading from package.json (bin/ext-pack.js)
