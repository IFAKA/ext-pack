#!/bin/bash
# One-command install for ext-pack

set -e

echo "📦 Installing ext-pack..."

# Create temp directory
TEMP_DIR=$(mktemp -d)
cd "$TEMP_DIR"

# Clone repository
echo "📥 Cloning repository..."
git clone https://github.com/IFAKA/ext-pack.git
cd ext-pack

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Link globally
echo "🔗 Linking globally..."
npm link

# Cleanup
cd ~
rm -rf "$TEMP_DIR"

echo ""
echo "✅ ext-pack installed successfully!"
echo ""
echo "Run: ext-pack"
echo ""
