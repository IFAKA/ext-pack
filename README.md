# ext-pack

> **The npm for browser extensions** - Bundle, publish, discover, and install browser extension packs with zero friction.

[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](https://github.com/IFAKA/ext-pack)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

ext-pack lets you bundle multiple browser extensions into a single portable pack, publish them to a registry, and share them with anyone. Think of it as package management for browser extensions.

## ✨ Features

- 📦 **Bundle extensions** - Combine multiple extensions into one portable `.extpack` file
- 🗜️ **Smart compression** - Gzip compression reduces pack size by 60-70%
- 🚀 **One-command install** - Install extension packs by name from the registry
- 🔍 **Discover packs** - Search and browse curated extension collections
- 🌐 **Publish & share** - Publish your packs to the public registry in seconds
- 💻 **Works offline** - Packs are self-contained with all extensions embedded
- 🎯 **Zero config** - Just install and go, no setup required
- 🔧 **Modern CLI** - Clean command-line interface with optional interactive prompts
- ⚡ **Shell autocomplete** - Tab completion for commands and pack names

## 📥 Installation

```bash
npm install -g ext-pack
```

Or from source:

```bash
git clone https://github.com/IFAKA/ext-pack.git
cd ext-pack
npm install
npm link
```

## 🚀 Quick Start

### Create your first pack

```bash
# Interactive mode
ext-pack create

# Or with options
ext-pack create my-pack -d ~/my-extensions
```

### Install a pack

```bash
# From registry
ext-pack install productivity-pack

# From file
ext-pack install my-pack.extpack

# From URL
ext-pack install https://github.com/user/packs/releases/download/v1.0.0/pack.extpack
```

### Publish to registry

```bash
ext-pack publish my-pack.extpack
```

### Search for packs

```bash
ext-pack search productivity --tag privacy
```

## 📚 Commands

### `ext-pack create [name]`

Create a new extension pack.

```bash
ext-pack create                    # Interactive
ext-pack create my-pack            # With name
ext-pack create -d ~/extensions    # Scan specific directory
ext-pack create -y                 # Skip confirmations
```

**Options:**
- `-o, --output <path>` - Output file path
- `-d, --dir <path>` - Directory to scan
- `-y, --yes` - Skip confirmations

### `ext-pack install [pack]`

Install a pack from file, URL, or registry.

```bash
ext-pack install dev-tools              # From registry
ext-pack install ./my-pack.extpack      # From file
ext-pack install https://...            # From URL
ext-pack install my-pack -b brave       # Specify browser
```

**Options:**
- `-b, --browser <name>` - Browser (brave, chrome, edge, chromium)
- `-y, --yes` - Skip confirmations
- `--no-relaunch` - Don't relaunch browser

### `ext-pack publish [pack]`

Publish a pack to the registry.

```bash
ext-pack publish my-pack.extpack
ext-pack publish --tag v1.2.0
```

**Requirements:** GitHub auth via `gh auth login` or `GITHUB_TOKEN`

### `ext-pack search <query>`

Search the registry for packs.

```bash
ext-pack search productivity           # Basic search
ext-pack search dev --tag javascript   # Filter by tag
ext-pack search privacy --sort stars   # Sort by stars
ext-pack search --json                 # JSON output
```

**Options:**
- `--tag <tag>` - Filter by tag
- `--sort <field>` - Sort by: downloads, stars, updated, name
- `--limit <n>` - Max results (default: 20)
- `--json` - JSON output

### `ext-pack share [pack]`

Generate shareable URL and QR code.

```bash
ext-pack share my-pack.extpack
```

### `ext-pack list`

List all installed packs.

```bash
ext-pack list          # Human-readable
ext-pack list --json   # JSON output
```

### `ext-pack completion`

Install shell autocomplete.

```bash
ext-pack completion
```

Enables tab completion for commands, pack names, and options.

## 🎯 How It Works

1. **Create Pack**: Scans directory for extensions (looks for `manifest.json`)
2. **Bundle**: Creates `.extpack` file (JSON format)
3. **Install**: Uses browser's `--load-extension` flag
4. **Relaunch**: Closes and reopens browser with all extensions

### Technical Details

- Works with **Chromium-based browsers** (Brave, Chrome, Chromium, Edge)
- Uses `--load-extension` flag for persistent loading
- Extensions remain after browser restart
- No backend needed - everything local or URL-encoded

## 📦 Pack Format

Packs are JSON files (`.extpack`) containing bundled extensions and metadata.

```json
{
  "v": 3,
  "name": "productivity-pack",
  "description": "Essential productivity extensions",
  "author": {
    "name": "Your Name",
    "github": "username"
  },
  "version": "1.0.0",
  "tags": ["productivity", "focus"],
  "created": "2026-02-15",
  "extensions": [
    {
      "type": "bundled",
      "name": "uBlock Origin",
      "version": "1.50.0",
      "description": "Ad blocker",
      "files": {
        "manifest.json": "H4sIAAAA...",
        "background.js": "H4sIAAAA...",
        "content.js": "H4sIAAAA..."
      }
    }
  ]
}
```

### Extension Types

- **`bundled`** - All files embedded (gzipped + base64) - **Default for published packs**
- **`local`** - Reference to local filesystem path
- **`github`** - Reference to GitHub release
- **`store`** - Reference to Chrome Web Store (manual install only)

## 🌐 Registry

The ext-pack registry is hosted on GitHub at [ext-pack/registry](https://github.com/ext-pack/registry).

**How it works:**
1. Packs are published as GitHub releases
2. Registry index (`registry.json`) is updated via pull request
3. GitHub Actions validates and auto-merges PRs
4. GitHub Pages serves a web interface for browsing
5. CLI fetches packs directly from GitHub releases

**Benefits:**
- ✅ Zero infrastructure cost
- ✅ Distributed (uses GitHub's CDN)
- ✅ Transparent (all PRs are public)
- ✅ Reliable (backed by GitHub)
- ✅ Fast (cached locally for 1 hour)

Browse packs at: **https://ext-pack.github.io/registry** _(coming soon)_

---

## 🏗️ Architecture

```
ext-pack/
├── bin/ext-pack.js          # CLI entry point (42 lines)
├── src/
│   ├── commands/            # Modular command system
│   │   ├── create.js
│   │   ├── install.js
│   │   ├── publish.js
│   │   ├── search.js
│   │   └── ...
│   ├── core/                # Business logic
│   │   ├── bundle-codec.js  # Bundling with gzip
│   │   ├── pack-codec.js    # Pack validation
│   │   ├── pack-installer.js
│   │   ├── registry-client.js
│   │   └── github-publisher.js
│   ├── ui/                  # Interactive wizards
│   │   ├── create-wizard.js
│   │   ├── install-wizard.js
│   │   └── publish-wizard.js
│   └── utils/               # Utilities
│       ├── browser-detector.js
│       ├── config-manager.js
│       └── autocomplete.js
```

**Design principles:**
- Modular commands - Each command is self-contained
- Clean separation - Commands → Wizards → Core logic
- Optional interactivity - Use flags for automation or prompts for guidance
- Zero legacy - Modern ESM, no backward compatibility

---

## 🛠️ Configuration

Config stored in `~/.ext-pack/`:

```
~/.ext-pack/
├── config.json          # User preferences
├── installed.json       # Installation registry
└── downloads/           # GitHub extension cache
```

### config.json

```json
{
  "browser": {
    "preference": ["brave", "chrome", "chromium"],
    "autoKill": true
  },
  "paths": {
    "cacheDir": "~/.ext-pack/downloads"
  }
}
```

## 🌐 Supported Browsers

- ✅ **Brave** (Primary support)
- ✅ **Chrome**
- ✅ **Chromium**
- ✅ **Edge**

Works on:
- macOS ✅
- Linux ✅
- Windows ✅

## 📝 FAQ

**Q: How is this different from sharing extension URLs?**
A: ext-pack bundles ALL extension files into one portable file. Share one file instead of multiple URLs, and it works offline.

**Q: Does this work with Firefox?**
A: Currently Chromium-based browsers only (Brave, Chrome, Edge, Chromium). Firefox support planned.

**Q: Are my extensions uploaded anywhere?**
A: When you publish, extensions are uploaded to GitHub releases. When you create a pack locally, files stay on your machine.

**Q: How big can packs be?**
A: No hard limit, but GitHub releases have a 2GB limit. Most packs are 1-50MB after compression (60-70% reduction).

**Q: Can I publish private packs?**
A: Currently registry is public only. For private sharing, use `ext-pack share` to generate URLs or share the `.extpack` file directly.

**Q: How do updates work?**
A: Coming soon: `ext-pack update <pack-name>` will check for new versions and update.

---

## ⚠️ Known Limitations

- **Chrome Web Store extensions** - Cannot be auto-installed (Chrome restriction)
- **Browser restart required** - Must close browser to install extensions
- **Chromium-only** - Firefox not yet supported
- **GitHub rate limits** - 60 requests/hour without authentication


## 🛠️ Development

### Setup

```bash
git clone https://github.com/IFAKA/ext-pack.git
cd ext-pack
npm install
npm link
```

### 🚨 Systematic Testing Workflow

**ext-pack enforces a systematic approach where all changes MUST be tested before committing.**

**Git hooks enforce testing:**
- ✅ `pre-commit` - Blocks commits without testing verification
- ✅ `pre-push` - Final confirmation before pushing to remote

**Development workflow:**

1. **Make code changes**
   ```bash
   # Edit files using your editor or AI agent
   ```

2. **Install changes globally**
   ```bash
   npm link
   ```

3. **Run systematic testing checklist**
   ```bash
   npm test  # Shows testing guide
   ```

   Follow the full testing protocol in `.claude/skills/testing-checklist/SKILL.md`:
   - ✅ Test 1: Create flow (end-to-end)
   - ✅ Test 2: Install flow (end-to-end)
   - ✅ Test 3: List flow (end-to-end)
   - ✅ Test 4: Publish flow (end-to-end)
   - ✅ Test 5: Error handling & edge cases

4. **Mark testing complete** (required for commit)
   ```bash
   touch .testing-verified
   ```

5. **Commit and push**
   ```bash
   git add .
   git commit -m "Your commit message"  # Pre-commit hook verifies testing
   git push                              # Pre-push hook confirms testing
   ```

6. **Publish to npm** (CRITICAL - don't skip!)
   ```bash
   npm publish --otp=YOUR_CODE
   ```

**Why this approach?**
- ❌ No untested code reaches users
- ❌ No gaps or missed edge cases
- ❌ No exceptions or shortcuts
- ✅ Systematic = Quality

### Commands

```bash
npm run dev              # Run CLI locally
npm link                 # Install globally (required for testing)
npm test                 # Show systematic testing guide
npm unlink -g ext-pack   # Remove global link
```

### Project Structure

- `bin/` - CLI entry point and utilities
  - `ext-pack.js` - Main CLI entry point
  - `test-checklist.js` - Testing checklist command
- `src/commands/` - Command modules
- `src/core/` - Core business logic
- `src/ui/` - Interactive wizards
- `src/utils/` - Shared utilities
- `.claude/skills/` - Development skills (testing, workflows)
- `.git/hooks/` - Pre-commit and pre-push hooks

---

## 🤝 Contributing

Contributions are welcome! Please follow the systematic testing workflow:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. **Follow systematic testing workflow** (see Development section above)
   - Run `npm link` to install changes
   - Run `npm test` to see testing checklist
   - Test ALL user flows (create, install, list, publish, errors)
   - Run `touch .testing-verified` when complete
5. Commit and push (git hooks enforce testing)
6. Submit a pull request

**⚠️ IMPORTANT:** Pre-commit hooks will block commits without testing verification.

**Publishing packs to the registry:**
1. Create your pack locally (`ext-pack create`)
2. Test it thoroughly (`ext-pack install your-pack.extpack`)
3. Publish (`ext-pack publish your-pack.extpack`)
4. Wait for auto-merge (~2 minutes)

---

## 📝 License

MIT © [IFAKA](https://github.com/IFAKA)

## 🙏 Acknowledgments

Built with:
- [commander.js](https://github.com/tj/commander.js) - CLI framework
- [inquirer.js](https://github.com/SBoudrias/Inquirer.js) - Interactive prompts
- [ora](https://github.com/sindresorhus/ora) - Elegant spinners
- [chalk](https://github.com/chalk/chalk) - Terminal colors
- [tabtab](https://github.com/mklabs/tabtab) - Shell autocomplete
- [@octokit/rest](https://github.com/octokit/rest.js) - GitHub API client
- [boxen](https://github.com/sindresorhus/boxen) - Pretty boxes
- [qrcode-terminal](https://github.com/gtanner/qrcode-terminal) - QR codes

Inspired by npm, homebrew, and other great package managers.

---

**Made with ❤️ for the browser extension community**
