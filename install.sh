#!/bin/bash
# One-command install for ext-pack

set -e

echo "📦 Installing ext-pack..."

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js first."
    exit 1
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
