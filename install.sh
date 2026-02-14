#!/bin/bash
# One-command install for ext-pack

set -e

# Check if already installed
if command -v ext-pack &> /dev/null; then
    echo "📦 ext-pack is already installed. Reinstalling..."
else
    echo "📦 Installing ext-pack..."
fi

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

# Install globally
echo "🔗 Installing globally..."
npm install -g .

# Cleanup
cd ~
rm -rf "$TEMP_DIR"

echo ""
echo "✅ ext-pack installed successfully!"
echo ""
echo "Run: ext-pack"
echo ""
