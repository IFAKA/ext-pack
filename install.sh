#!/bin/bash
# One-command install for ext-pack

set -e

echo "📦 Installing ext-pack..."

# Load nvm if available
if [ -d "$HOME/.nvm" ]; then
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

    # Use default node version or current
    if [ -f "$NVM_DIR/alias/default" ]; then
        nvm use default --silent
    fi
fi

# Create temp directory
TEMP_DIR=$(mktemp -d)
cd "$TEMP_DIR"

# Clone repository
echo "📥 Cloning repository..."
git clone -q https://github.com/IFAKA/ext-pack.git
cd ext-pack

# Install dependencies and link globally
echo "📦 Installing..."
npm install --silent
npm install -g . --silent

# Cleanup
cd ~
rm -rf "$TEMP_DIR"

echo ""
echo "✅ Installed! Run: ext-pack"
echo ""
echo "⚠️  If 'command not found', reload your shell:"
echo "   source ~/.zshrc"
echo ""
