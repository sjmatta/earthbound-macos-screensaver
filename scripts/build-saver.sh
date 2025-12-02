#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== Building Earthbound Screensaver (.saver) ==="
echo ""

# Check for Xcode
if ! command -v xcodebuild &> /dev/null; then
    echo "Error: Xcode is required to build the native screensaver."
    echo "Install from the App Store or run: xcode-select --install"
    exit 1
fi

cd "$PROJECT_DIR"

# Step 1: Build web assets if not already built
if [ ! -d "dist" ] || [ ! -f "dist/index.html" ]; then
    echo "Building web assets..."
    npm run setup
fi

# Step 2: Copy web assets to native Resources
echo "Copying web assets to native bundle..."
rm -rf native/EarthboundScreensaver/Resources
mkdir -p native/EarthboundScreensaver/Resources/assets
cp dist/index.html native/EarthboundScreensaver/Resources/
cp dist/screensaver.js native/EarthboundScreensaver/Resources/
cp dist/assets/index.js native/EarthboundScreensaver/Resources/assets/
cp dist/assets/utils.js native/EarthboundScreensaver/Resources/assets/

# Step 3: Build the .saver bundle
echo "Building native screensaver..."
cd native
xcodebuild -project EarthboundScreensaver.xcodeproj \
    -target EarthboundScreensaver \
    -configuration Release \
    CODE_SIGN_IDENTITY="-" \
    2>&1 | grep -E "(Building|Compiling|Linking|error:|warning:|\*\* BUILD)" || true

# Check if build succeeded
if [ ! -d "build/Release/EarthboundScreensaver.saver" ]; then
    echo ""
    echo "Error: Build failed. Run with full output:"
    echo "  cd native && xcodebuild -project EarthboundScreensaver.xcodeproj -target EarthboundScreensaver -configuration Release"
    exit 1
fi

# Step 4: Copy to dist
echo "Copying to dist..."
cd "$PROJECT_DIR"
cp -R native/build/Release/EarthboundScreensaver.saver dist/

echo ""
echo "=== Build Complete ==="
echo ""
echo "Native screensaver: $PROJECT_DIR/dist/EarthboundScreensaver.saver"
echo ""
echo "To install:"
echo "  Double-click EarthboundScreensaver.saver"
echo "  - or -"
echo "  cp -R dist/EarthboundScreensaver.saver ~/Library/Screen\\ Savers/"
echo ""
