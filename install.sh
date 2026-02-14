#!/bin/bash
# One-command install for ext-pack

set -e

echo "📦 Installing ext-pack..."

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Install dependencies
echo "📥 Installing dependencies..."
npm install

# Link globally
echo "🔗 Linking globally..."
npm link

echo ""
echo "✅ ext-pack installed successfully!"
echo ""
echo "Run: ext-pack"
echo ""
