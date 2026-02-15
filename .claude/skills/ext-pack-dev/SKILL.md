---
name: ext-pack-dev
description: Development guidelines and workflows for ext-pack, a Node.js CLI tool for bundling and installing Chromium browser extensions. Use when working on ext-pack codebase for (1) Making code changes (bug fixes, features, refactors), (2) Understanding the architecture and patterns, (3) Testing changes, (4) Committing and pushing code. Enforces consistent workflows across all developers and AI agents.
---

# ext-pack Development

## Overview

This skill provides the architectural patterns, development workflows, and coding standards for ext-pack, ensuring all developers and AI agents follow consistent practices when working on the codebase.

## Architecture

### Project Structure

```
ext-pack/
├── bin/ext-pack.js           # Entry point - CLI arg parsing
├── src/
│   ├── commands/             # Thin command handlers
│   ├── ui/                   # Interactive prompts (inquirer)
│   ├── core/                 # Business logic (no UI dependencies)
│   │   ├── pack-codec.js     # Pack create/validate/read/write
│   │   ├── extension-scanner.js
│   │   ├── pack-installer.js
│   │   ├── browser-launcher.js
│   │   └── github-api.js
│   └── utils/                # Cross-cutting utilities
│       ├── browser-detector.js
│       └── config-manager.js
└── CLAUDE.md                 # Project documentation
```

### Layer Separation (CRITICAL)

**Flow**: Command → UI wizard → Core logic

```javascript
// ✅ CORRECT: Commands delegate to UI wizards
export async function createCommand() {
  const packPath = await runCreateWizard();
  if (packPath) console.log(`Created: ${packPath}`);
}

// ✅ CORRECT: UI wizards call core logic
export async function runCreateWizard() {
  const extensions = scanDirectory(scanPath);  // core logic
  const pack = createPack(name, desc, author, extensions);  // core logic
  await writePackFile(outputFile, pack);  // core logic
}

// ❌ WRONG: Core logic calling UI
export function scanDirectory(dir) {
  const { confirm } = await inquirer.prompt([...]);  // NO! Core should not import UI
}
```

**Rule**: Core modules (`src/core/`) must NEVER import or depend on UI modules (`src/ui/`).

### Module Patterns (CRITICAL)

All modules use ESM with both named exports AND default object export:

```javascript
// ✅ CORRECT
export function scanDirectory(path) { ... }
export function validateExtension(manifest) { ... }

export default {
  scanDirectory,
  validateExtension
};

// ❌ WRONG: Missing default export
export function scanDirectory(path) { ... }
// Only has named exports
```

## Development Workflows

### 🚨 CRITICAL: Publishing to npm

**AFTER EVERY PUSH, REMIND USER TO PUBLISH:**

```bash
npm publish --otp=YOUR_CODE
```

**When to publish:**
- ✅ After bug fixes (patch: x.x.X)
- ✅ After new features (minor: x.X.0)
- ✅ After breaking changes (major: X.0.0)

**NEVER SKIP THIS!** Pushed code won't reach users until published to npm.

---

### Workflow 1: Making Code Changes

**ALWAYS follow this sequence for ANY code change:**

1. **Make the change** using dedicated tools (Read, Edit, Write, Glob, Grep)
2. **Test automatically** - NEVER ask, just run `npm run dev` or `npm link` to verify
3. **Commit with clear message** following the project's commit style
4. **Push to remote**
5. **REMIND USER TO PUBLISH TO NPM** ← CRITICAL!
6. **Reinstall if needed** - Run `npm link` after pushing

```bash
# Example workflow
git add <files>
git commit -m "Fix Ollama connection using IPv4 address"
git push
npm link  # Reinstall to test changes
```

**Commit Message Style** (learned from git log):
- Imperative mood: "Fix", "Add", "Update", "Improve", "Change"
- Concise subject line (under 70 chars)
- Optional body for context

### Workflow 2: Creating New Features

**Before starting:**
1. Read relevant existing files to understand patterns
2. Identify which layer the feature belongs to (command/ui/core/utils)
3. Follow the established patterns in that layer

**Implementation steps:**
1. **Core logic first** - Implement in `src/core/` with no UI dependencies
2. **UI wizard second** - Create interactive prompts in `src/ui/`
3. **Command handler last** - Thin wrapper in `src/commands/`
4. **Test the feature** - Run `npm run dev` to verify
5. **Follow ESM patterns** - Named exports + default object export
6. **Update CLAUDE.md** if architectural patterns change

**Example: Adding GitHub Extension Support**
```javascript
// 1. Core logic (src/core/github-api.js)
export async function downloadRelease(repo, version) { ... }
export default { downloadRelease };

// 2. UI wizard (src/ui/install-wizard.js)
import { downloadRelease } from '../core/github-api.js';
const path = await downloadRelease(repo, version);

// 3. Command (src/commands/install.js)
import { runInstallWizard } from '../ui/install-wizard.js';
export async function installCommand(args) {
  await runInstallWizard(args);
}
```

### Workflow 3: Bug Fixes and Debugging

**Investigation:**
1. **Read the relevant files** - Use Read tool to understand context
2. **Search for patterns** - Use Grep to find related code
3. **Check git history** - `git log --oneline` to see recent changes
4. **Test to reproduce** - Run `npm run dev` to trigger the bug

**Fix process:**
1. **Identify root cause** - Don't just treat symptoms
2. **Make minimal changes** - Fix only what's broken
3. **Test the fix** - Verify it works with `npm link`
4. **No backwards-compatibility hacks** - Delete unused code completely

```javascript
// ❌ WRONG: Backwards-compatibility hack
export function oldFunction() { ... }
export const deprecated_var = null;  // Unused, just for compatibility

// ✅ CORRECT: Delete unused code completely
// oldFunction removed entirely
```

### Workflow 4: Testing Changes

**CRITICAL RULE: Always test changes automatically after making them.**

**Testing methods:**
1. **Local development**: `npm run dev` (runs `node bin/ext-pack.js`)
2. **Global installation**: `npm link` (installs as `ext-pack` command)
3. **Syntax check**: `node -c <file>` for quick validation
4. **Uninstall global**: `npm unlink -g ext-pack` if needed

**What to test:**
- Does the CLI start without errors?
- Does the changed functionality work as expected?
- Are there any runtime errors or warnings?
- Does the output match expectations?

**NEVER**:
- Skip testing after code changes
- Ask permission to test - just do it
- Assume code works without verification

## Coding Standards

### Use Dedicated Tools Over Bash

```javascript
// ❌ WRONG: Using bash for file operations
bash("cat src/ui/create-wizard.js | grep ollama")
bash("find . -name '*.js'")
bash("echo 'content' > file.js")

// ✅ CORRECT: Use dedicated tools
Read({ file_path: "src/ui/create-wizard.js" })
Grep({ pattern: "ollama", glob: "*.js" })
Write({ file_path: "file.js", content: "content" })
Glob({ pattern: "**/*.js" })
```

**When to use Bash:**
- Git operations: `git status`, `git commit`, `git push`
- npm commands: `npm link`, `npm run dev`
- System commands: `ollama list`, `curl`

**When NOT to use Bash:**
- File operations (read, write, edit, search, find)

### No Test Framework

**Important**: ext-pack has NO test framework configured (no Jest, Mocha, etc.)

Testing is manual via `npm run dev` or `npm link`. Don't try to run test commands that don't exist.

### API Connections

When connecting to local services (like Ollama), use IPv4 addresses instead of `localhost` to avoid Node.js fetch IPv6 issues:

```javascript
// ✅ CORRECT
fetch('http://127.0.0.1:11434/api/tags')

// ❌ WRONG (may fail with IPv6)
fetch('http://localhost:11434/api/tags')
```

## Common Patterns

### Extension Types

Three types of extensions are supported:
1. **local** - Filesystem paths to extension directories
2. **github** - GitHub releases (downloaded and extracted)
3. **store** - Chrome Web Store (manual install only)

### Config Management

User config lives at `~/.ext-pack/`:
- `config.json` - User settings
- `installed.json` - Installation registry
- `downloads/` - Downloaded extensions cache
- `packs/` - Default location for created packs

### Interactive Prompts

Use inquirer for all interactive input:

```javascript
import inquirer from 'inquirer';

const { answer } = await inquirer.prompt([{
  type: 'input',      // or 'list', 'checkbox', 'confirm'
  name: 'answer',
  message: 'Question:',
  default: 'default value'
}]);
```

## Quick Reference

| Task | Tool | Example |
|------|------|---------|
| Read file | Read | `Read({ file_path: "src/ui/create-wizard.js" })` |
| Edit file | Edit | `Edit({ file_path: "...", old_string: "...", new_string: "..." })` |
| Create file | Write | `Write({ file_path: "...", content: "..." })` |
| Search code | Grep | `Grep({ pattern: "ollama", output_mode: "content" })` |
| Find files | Glob | `Glob({ pattern: "src/**/*.js" })` |
| Test changes | Bash | `npm run dev` or `npm link` |
| Commit | Bash | `git add . && git commit -m "message" && git push` |
