# Installation Options

## Option 1: Direct Install from GitHub (One Command)

Once pushed to GitHub, anyone can install with:

```bash
npm install -g https://github.com/IFAKA/ext-pack/tarball/master
```

**Or even simpler with npx (no install):**

```bash
npx github:IFAKA/ext-pack
```

## Option 2: Clone and Install

```bash
git clone https://github.com/IFAKA/ext-pack.git
cd ext-pack
./install.sh
```

## Option 3: Quick One-Liner (Downloads and Installs)

```bash
curl -sL https://raw.githubusercontent.com/IFAKA/ext-pack/master/install.sh | bash
```

⚠️ **Security Note:** Only run curl | bash from sources you trust!

## Uninstall (All Options)

```bash
npm unlink -g ext-pack && rm -rf ~/.ext-pack
```

**Or if you cloned:**

```bash
cd browser-extensions/ext-pack && ./uninstall.sh
```

---

## What Gets Installed?

- **Binary**: Global `ext-pack` command
- **Config**: `~/.ext-pack/config.json`
- **Cache**: `~/.ext-pack/downloads/` (GitHub extensions)
- **Registry**: `~/.ext-pack/installed.json`

## What Gets Removed?

The uninstall script removes **all traces**:
- ✓ Global command
- ✓ All config files
- ✓ All cached downloads
- ✓ Installation registry

**Zero traces left behind!**
