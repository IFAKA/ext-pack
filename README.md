# 📦 ext-pack

> Bundle and install Chrome/Brave extensions with zero friction

Install multiple browser extensions in one command. No more clicking "Load unpacked" for each extension!

## ✨ Features

- **🚀 One-Command Install** - Load multiple extensions instantly
- **📦 Create Packs** - Bundle your favorite extensions
- **🔗 Share Anywhere** - Generate URLs or QR codes
- **🎯 Zero Learning Curve** - Interactive menus guide you
- **💾 Persistent** - Extensions stay after browser restart
- **🌐 GitHub Support** - Auto-download from releases
- **🎨 Beautiful CLI** - Colorful, emoji-rich interface

## 🎥 Demo

```bash
$ ext-pack

███████╗██╗  ██╗████████╗      ██████╗  █████╗  ██████╗██╗  ██╗
██╔════╝╚██╗██╔╝╚══██╔══╝      ██╔══██╗██╔══██╗██╔════╝██║ ██╔╝
█████╗   ╚███╔╝    ██║   █████╗██████╔╝███████║██║     █████╔╝
██╔══╝   ██╔██╗    ██║   ╚════╝██╔═══╝ ██╔══██║██║     ██╔═██╗
███████╗██╔╝ ██╗   ██║         ██║     ██║  ██║╚██████╗██║  ██╗
╚══════╝╚═╝  ╚═╝   ╚═╝         ╚═╝     ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝

         Bundle and install extensions with zero friction

? What do you want to do?
  ❯ 📦 Create a new extension pack
    ⚡ Install an extension pack
    📋 List my installed packs
    🔗 Share a pack
```

## 📥 Installation

### ⚡ One-Command Install (No Cloning Required)

```bash
curl -sL https://raw.githubusercontent.com/IFAKA/ext-pack/main/install.sh | bash
```

Then run: `ext-pack`

### 🔧 Manual Install (If You Cloned)

```bash
cd ext-pack && ./install.sh
```

Or:

```bash
cd ext-pack
npm install
npm link
ext-pack
```

### 🗑️ One-Command Uninstall (No Traces)

```bash
npm unlink -g ext-pack && rm -rf ~/.ext-pack
```

**Or if you cloned:**

```bash
cd ext-pack && ./uninstall.sh
```

This removes **everything**:
- ✓ Global npm link
- ✓ All config files (`~/.ext-pack`)
- ✓ All cached downloads
- ✓ Installation registry

**Zero traces left behind!**

## 🚀 Quick Start

### Create Your First Pack

1. Navigate to a directory with extensions:
   ```bash
   cd /path/to/browser-extensions
   ext-pack
   ```

2. Choose "Create a new extension pack"

3. Follow the prompts:
   - Enter pack name
   - Select extensions to bundle
   - Save the `.extpack` file

### Install a Pack

```bash
# Interactive mode
ext-pack

# Direct install
ext-pack my-pack.extpack
```

### Share a Pack

1. Choose "Share a pack" from menu
2. Select sharing method:
   - **URL**: Generate shareable link
   - **QR Code**: Display scannable code
   - **File Path**: Copy local path

## 📖 Usage

### Interactive Mode (Recommended)

Just run `ext-pack` with no arguments:

```bash
ext-pack
```

The interactive menu guides you through everything!

### Direct Commands

```bash
# Install a pack file
ext-pack my-pack.extpack

# That's it! No complex commands to remember.
```

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

Pack files are JSON with `.extpack` extension:

```json
{
  "v": 3,
  "name": "My Dev Tools",
  "description": "Essential extensions",
  "author": "username",
  "created": "2026-02-14",
  "extensions": [
    {
      "type": "local",
      "path": "/Users/username/extensions/my-extension",
      "name": "My Extension"
    },
    {
      "type": "github",
      "repo": "owner/repo",
      "name": "GitHub Extension",
      "releaseTag": "v1.0.0"
    },
    {
      "type": "store",
      "id": "chrome-extension-id",
      "name": "Store Extension"
    }
  ]
}
```

### Extension Types

- **`local`** - Extensions on your filesystem (auto-installed)
- **`github`** - Extensions from GitHub releases (auto-downloaded)
- **`store`** - Chrome Web Store extensions (manual install required)

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

## ⚠️ Known Limitations

- **Chrome Web Store extensions** - Cannot be auto-installed (Chrome restriction)
- **Browser restart required** - Must close browser to install pack
- **Chrome 137+ branded builds** - May deprecate `--load-extension` (Chromium/Brave unaffected)
- **GitHub rate limits** - 60 requests/hour without token

## 🎨 UX Philosophy

**Zero Learning Curve** - Our core principle:

- ✨ No commands to memorize
- 🎯 Interactive menus for everything
- 💡 Smart defaults (just press Enter)
- 🔮 Auto-detect what you want to do
- ❓ Helpful errors that suggest fixes
- 🎨 Beautiful, emoji-rich output

## 📚 Examples

### Create Pack from Current Directory

```bash
cd ~/my-extensions
ext-pack
# Choose "Create a new extension pack"
# Press Enter through defaults
# Done!
```

### Install Pack

```bash
ext-pack my-pack.extpack
# Confirm installation
# Browser relaunches with extensions
# That's it!
```

### Share Pack as URL

```bash
ext-pack
# Choose "Share a pack"
# Select pack to share
# Choose "Generate shareable URL"
# URL copied to clipboard!
```

## 🤝 Contributing

Contributions welcome! This is a local-first tool with no backend.

## 📝 License

MIT

## 💡 Tips

- **First time?** Just run `ext-pack` and follow the tutorial
- **Keyboard shortcuts?** None needed - use arrow keys and Enter
- **Made a mistake?** Cancel anytime with Ctrl+C
- **Need help?** Every screen has clear instructions

## 🔗 Related Projects

- [extension-pack-hub](../extension-pack-hub-archive/) - Original browser extension (archived)

## 🙏 Credits

Built with:
- [inquirer](https://github.com/SBoudrias/Inquirer.js) - Interactive CLI
- [ora](https://github.com/sindresorhus/ora) - Elegant spinners
- [chalk](https://github.com/chalk/chalk) - Terminal colors
- [boxen](https://github.com/sindresorhus/boxen) - Pretty boxes
- [cli-progress](https://github.com/npkgz/cli-progress) - Progress bars
- [qrcode-terminal](https://github.com/gtanner/qrcode-terminal) - QR codes

---

**Made with ❤️ for developers who hate clicking "Load unpacked" repeatedly**
