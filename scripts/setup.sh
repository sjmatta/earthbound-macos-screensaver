#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== Earthbound Screensaver Setup ==="
echo ""

# Check Node.js version
NODE_VERSION=$(node -v 2>/dev/null | cut -d'v' -f2 | cut -d'.' -f1)
if [ -z "$NODE_VERSION" ] || [ "$NODE_VERSION" -lt 24 ]; then
    echo "Error: Node.js 24+ is required."
    echo "Current version: $(node -v 2>/dev/null || echo 'not installed')"
    echo ""
    echo "Install with: nvm install 24 && nvm use 24"
    exit 1
fi

echo "Node.js version: $(node -v)"
echo ""

cd "$PROJECT_DIR"

# Clean previous builds
rm -rf upstream dist

# Clone upstream project (needed for source files)
echo "Cloning Earthbound Battle Backgrounds JS..."
git clone --depth 1 https://github.com/gjtorikian/Earthbound-Battle-Backgrounds-JS.git upstream

# Install our dependencies (including Vite)
echo "Installing dependencies..."
npm install

# Build with Vite (bundles everything into a single file)
echo "Building with Vite..."
npm run build:vite

# Copy HTML to dist
echo "Copying HTML..."
cp src/index.html dist/

# Clean up upstream source (no longer needed after build)
rm -rf upstream

echo ""
echo "=== Setup Complete ==="
echo "Web assets built in dist/"
