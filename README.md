# Earthbound Screensaver

A macOS screensaver that displays the iconic battle backgrounds from Earthbound/Mother 2, cycling through random combinations.

## Features

- **52,650 Combinations**: Randomly cycles through all 327 layer styles in two-layer compositions
- **Configurable**: Adjust cycle timing via URL parameters
- **Offline**: Works completely without internet once set up
- **Authentic**: Pixelated rendering preserves the retro SNES aesthetic

## Installation

### Option 1: Download Pre-built Release (Easiest)

1. Install [WebViewScreenSaver](https://github.com/liquidx/webviewscreensaver):
   ```bash
   brew install --cask webviewscreensaver
   ```

2. Download the latest release from [Releases](../../releases) and unzip

3. Configure macOS (see below)

### Option 2: Build from Source

Requires Node.js 24+ ([install with nvm](https://github.com/nvm-sh/nvm))

```bash
# Install WebViewScreenSaver
brew install --cask webviewscreensaver

# Clone and build
git clone https://github.com/YOUR_USERNAME/earthbound-screensaver.git
cd earthbound-screensaver
npm run setup
```

### Configure macOS

1. Open **System Settings** → **Screen Saver**
2. Select **WebViewScreenSaver**
3. Click **Options...**
4. Set URL to:
   ```
   file:///FULL/PATH/TO/earthbound-screensaver/dist/index.html
   ```

## Configuration

Customize behavior with URL parameters:

| Parameter | Default | Description |
|-----------|---------|-------------|
| `interval` | `60` | Seconds between background changes |

**Example:** Change backgrounds every 30 seconds:
```
file:///path/to/dist/index.html?interval=30
```

## Project Structure

```
earthbound-screensaver/
├── src/
│   ├── index.html      # HTML entry point
│   └── screensaver.js  # Cycling logic
├── scripts/
│   └── setup.sh        # Build script
├── dist/               # Built output (generated)
│   ├── index.html
│   ├── screensaver.js
│   └── assets/
└── package.json
```

## How It Works

This screensaver uses [Earthbound Battle Backgrounds JS](https://github.com/gjtorikian/Earthbound-Battle-Backgrounds-JS) by Garen Torikian to render the backgrounds. The setup script:

1. Clones the upstream project
2. Patches it for offline `file://` compatibility
3. Builds and extracts only the needed assets
4. Copies source files to dist/

## Credits

- **[Garen Torikian](https://github.com/gjtorikian)** - Earthbound Battle Backgrounds JS
- **[@kdex](https://github.com/kdex)** - ES2016 rewrite
- **Mr. Accident** (forum.starmen.net) - Original C# implementation and distortion math
- **[liquidx](https://github.com/liquidx)** - WebViewScreenSaver

## License

MIT License - see [LICENSE](LICENSE)

This project is not affiliated with Nintendo, Ape, HAL Laboratory, or Shigesato Itoi.
