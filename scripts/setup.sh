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

# Clone upstream project
echo "Cloning Earthbound Battle Backgrounds JS..."
git clone --depth 1 https://github.com/gjtorikian/Earthbound-Battle-Backgrounds-JS.git upstream

# Apply Vite config patch for file:// protocol compatibility
echo "Patching Vite config for offline use..."
cat > upstream/vite.config.js << 'EOF'
import { defineConfig } from 'vite'
import arraybuffer from 'vite-plugin-arraybuffer'

export default defineConfig({
  base: './',
  plugins: [arraybuffer()],
  build: {
    rollupOptions: {
      output: {
        format: 'iife',
        inlineDynamicImports: true,
        entryFileNames: 'assets/[name].js',
      }
    }
  }
})
EOF

# Build upstream
echo "Installing dependencies..."
cd upstream
npm install

echo "Building..."
npm run build
cd ..

# Create dist directory and copy assets
echo "Copying assets..."
mkdir -p dist/assets
cp upstream/dist/assets/index.js dist/assets/
cp upstream/dist/assets/utils.js dist/assets/

# Copy source files to dist
echo "Copying source files..."
cp src/index.html dist/
cp src/screensaver.js dist/

# Clean up upstream source
rm -rf upstream

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Screensaver file: $PROJECT_DIR/dist/index.html"
echo ""
echo "To use as macOS screensaver:"
echo "1. Install WebViewScreenSaver: brew install --cask webviewscreensaver"
echo "2. Open System Settings > Screen Saver"
echo "3. Select WebViewScreenSaver"
echo "4. Set URL to: file://$PROJECT_DIR/dist/index.html"
echo ""
