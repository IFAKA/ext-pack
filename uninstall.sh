#!/bin/bash
# One-command uninstall for ext-pack (removes all traces)

echo "🗑️  Uninstalling ext-pack..."

# Unlink from global
echo "🔗 Removing global link..."
npm unlink -g ext-pack 2>/dev/null || true

# Remove user config/cache
echo "🧹 Removing config and cache..."
rm -rf ~/.ext-pack

# Remove node_modules (optional - uncomment if you want complete removal)
# SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
# rm -rf "$SCRIPT_DIR/node_modules"

echo ""
echo "✅ ext-pack completely uninstalled (no traces left)"
echo ""
