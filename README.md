# Earthbound Screensaver

A macOS screensaver that displays the iconic battle backgrounds from Earthbound/Mother 2, cycling through random combinations every 60 seconds.

![Earthbound Battle Background](https://gjtorikian.online/Earthbound-Battle-Backgrounds-JS/assets/card.png)

## Features

- **52,650 Combinations**: Randomly cycles through all 327 layer styles in two-layer compositions
- **Offline**: Works completely without internet once set up
- **Authentic**: Pixelated rendering preserves the retro SNES aesthetic

## Quick Start

### Prerequisites

- macOS 10.15+
- Node.js 24+ (`nvm install 24`)
- [Homebrew](https://brew.sh/)

### Installation

```bash
# Install WebViewScreenSaver
brew install --cask webviewscreensaver

# Clone this repo
git clone https://github.com/YOUR_USERNAME/earthbound-screensaver.git
cd earthbound-screensaver

# Run setup (downloads and builds the rendering engine)
chmod +x setup.sh
./setup.sh
```

### Configure macOS

1. Open **System Settings** → **Screen Saver**
2. Select **WebViewScreenSaver**
3. Click **Options...**
4. Set URL to:
   ```
   file:///FULL/PATH/TO/earthbound-screensaver/screensaver.html
   ```

## How It Works

This screensaver uses [Earthbound Battle Backgrounds JS](https://github.com/gjtorikian/Earthbound-Battle-Backgrounds-JS) by Garen Torikian to render the backgrounds. The setup script:

1. Clones the upstream project
2. Patches it for offline `file://` compatibility
3. Builds and extracts only the needed assets
4. Cleans up, leaving just the runtime files

The `screensaver.html` file contains the cycling logic that switches to new random layer combinations every 60 seconds.

## Credits

- **[Garen Torikian](https://github.com/gjtorikian)** - Earthbound Battle Backgrounds JS
- **[@kdex](https://github.com/kdex)** - ES2016 rewrite
- **Mr. Accident** (forum.starmen.net) - Original C# implementation and distortion math
- **[liquidx](https://github.com/liquidx)** - WebViewScreenSaver

## License

MIT License - see [LICENSE](LICENSE)

This project is not affiliated with Nintendo, Ape, HAL Laboratory, or Shigesato Itoi.
