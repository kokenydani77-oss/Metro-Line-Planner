# Metro Network Simulation & Puzzle Game

An interactive, browser-based grid-puzzle game developed with vanilla **JavaScript (ES6+)**, **HTML5 Canvas**, and **CSS3**. Players design transit routes across a dynamic urban map by connecting metro stations while respecting network constraints and scoring objectives.

## Overview

The game challenges players to plan and expand an efficient subway system. As new stations appear across sectors, players draw color-coded metro lines to connect terminals, satisfy passenger routes, and maximize efficiency scores before running out of valid moves or resources.

## Features

- **Dynamic Canvas Rendering:** Real-time path drawing, grid snapping, and line visualization on an HTML5 canvas element.
- **Asynchronous Data Loading:** Decoupled station layouts and line definitions parsed asynchronously from `stations.json` and `lines.json`.
- **Game State Machine:** Turn-based mechanics, move validation, overlap detection, and real-time score computation.
- **Zero External Dependencies:** Built entirely with native web technologies (no frameworks or third-party runtime libraries).

## Project Structure

```text
├── index.html        # Main markup, canvas viewport, and HUD controls
├── style.css         # Layout styling, responsive board rules, and theme variables
├── app.js            # Core engine, drawing routines, and game loop
├── lines.json        # Metro line configurations and color presets
├── stations.json     # Station coordinates, types, and grid mappings
├── .gitignore        # Standard Git exclusion file
└── README.md
```

## Getting Started

### Local Setup

Because the application uses the native `fetch()` API to load configuration files, running it directly via the `file://` protocol may trigger browser CORS restrictions. Run it through a local HTTP server:

#### Option 1: VS Code Live Server
1. Open the project folder in VS Code.
2. Right-click `index.html` and select **Open with Live Server**.

#### Option 2: Python HTTP Server
```bash
# Python 3
python -m http.server 8000
```
Open `http://localhost:8000` in your web browser.

#### Option 3: Node.js (npx)
```bash
npx serve .
```

## How to Play

1. Choose an active transit line from the control bar.
2. Click and drag between compatible stations to establish connection tracks.
3. Plan routes carefully to avoid conflicting tracks and maximize passenger connectivity across turns.