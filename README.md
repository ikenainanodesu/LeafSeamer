[简体中文](Manual/chs/README.md) | [日本語](Manual/jpn/README.md) | [English](README.md)

<img src="misc-resorce/seamer-logo-128x128.png" alt="isolated" width="250"/>

# LeafSeamer

A broadcast production control system based on NodeCG, integrating unified control for Mixer, OBS, Graphics Overlay, VB-Audio Matrix, and other devices and services.

## Project Overview

LeafSeamer is a modern broadcast production control system providing centralized device control and state management for video streaming and program production. Each core feature is an independently installable NodeCG bundle. Optional adapter bundles connect otherwise independent cores without making them mandatory dependencies.

All dashboard and graphic UI text is maintained in English.

## Core Features

### 🎛️ Card-Based Scene Control (Seamer)

- **Visualized Card Orchestration**: Configure and manage various control actions using an intuitive card interface
- **Multi-Action Integration**: A single card can trigger linked operations across multiple devices
- **Preset Management**: Save and load card layout presets to quickly switch production scenarios
- **Supported Action Types**:
  - Mixer Control: Fader, Send, Mute, etc.
  - OBS Control: Scene Switch, Transition Effect
  - ~~Delay (Delay Action): Precise timing control~~

Seamer itself stores cards and triggers without importing device bundles. Install only the adapters needed by a NodeCG instance:

- `seamer-adapter-mixer`
- `seamer-adapter-atem`
- `seamer-adapter-obs`
- `seamer-adapter-vb`

### 🎚️ Device Control Modules

#### Mixer Control

- Supports controlling mixer (RCP protocol)
- Real-time display of input channel status and routing information
- Channel Fader control
- Input Send Configuration (Gain, On/Off, Pre/Post, Pan)
- ~~Patch Configuration (Input/Output Routing)~~
- Preset Save and Load
- Web Dashboard Connection Management and Real-time Control

#### OBS Control - OBS Studio Control

- Connect and control multiple OBS instances via WebSocket
- Scene switching, transition effect selection
- **Advanced Scene Management**: Expand scenes to view and manage sources
- **Source Control**: Drag-and-drop source reordering, visibility toggle
- **Media Control**: Playback controls (Play, Pause, Stop, Seek), progress bar, and VLC playlist support for media sources
- ~~Recording~~, Streaming control
- Real-time status monitoring (Stream status, statistics)
- Auto-reconnect mechanism (Max 3 times, 2s interval)
- Connection status feedback

#### ATEM Control - Blackmagic ATEM Switcher Control

- Control ATEM switchers via network
- Real-time Program/Preview bus control
- Cut/Auto transition control
- Transition style and rate configuration
- Upstream/Downstream Keyer status monitoring
- Macro recording and playback control
- Connection status persistent management
- Web Dashboard Connection Management

#### VB Matrix Control - VB-Audio Matrix Control

- Control VB-Audio Matrix via VBAN protocol
- Audio Routing Matrix Management
- Patch Control (Supports multiple Patch panels)
- Network Configuration and Ping Test
- Local IP Address Display
- Preset Save and Load

### 🎨 Graphics and Display Modules

#### Graphics Package - Graphics Overlay Package

- Integrated GSAP Animation Library
- Lower Third graphics
- Scoreboard display
- Smooth entry and exit animations
- Custom animation effects

<details><summary>Function in beta testing, coming soon</summary>
#### Schedule Manager

- Program schedule management
- Standalone schedule editing in the dashboard
- Schedule display graphic output
- Dashboard control panel
- Optional Google Sheets import through `schedule-adapter-google-sheets`

### 🛠️ System Service Modules

#### Logger System

- Centralized log collection and viewing
- Live Log Viewer
- Asynchronous log processing
- Unified width Dashboard panels
- Optional buffered collection from other LeafSeamer bundles without becoming a hard dependency

#### Backup System

- Automatic backup of project configuration and data
- Uses archiver for file packaging
- Dashboard Backup Control Panel
- Supports manual backup trigger

#### Data Sync Service

- Google APIs integration
- Background data sync (No Dashboard interface)
- Google Sheets data reading

</details>

## Tech Stack

### Core Framework

- **NodeCG** v2.6.4 - Broadcast Graphics Framework
- **React** v19.2.1 - UI Component Library
- **TypeScript** v5.7.2 - Type-safe Development

### Build Tools

- **Vite** v6.0.1 - Frontend Build Tool
- **esbuild** v0.27.1 - JavaScript Bundler
- **ts-node** - TypeScript Execution Environment

### Major Dependencies

- **GSAP** v3.13.0 - High-performance Animation Library
- **obs-websocket-js** v5.0.7 - OBS WebSocket Client
- **atem-connection** - ATEM Control Library
- ~~**node-osc** v11.1.1 - OSC Protocol Support~~
- **googleapis** v166.0.0 - Google API Client
- **archiver** v7.0.1 - File Archiver Tool
- **@dnd-kit/core** v6.3.1 - Drag and Drop Support
- **uuid** - UUID Generation

## Project Structure

```
LeafSeamer/
├── bundles/                      # NodeCG bundles directory
│   ├── seamer/                   # Scene Control Card System
│   ├── mixer-control/            # Mixer Control
│   ├── atem-control/             # ATEM Control
│   ├── obs-control/              # OBS Control
│   ├── vb-matrix-control/        # VB-Audio Matrix Control
│   ├── graphics-package/         # Graphics Package (GSAP Animation)
│   ├── schedule-manager/         # Schedule Manager
│   ├── schedule-adapter-google-sheets/ # Optional Sheets integration
│   ├── logger-system/            # Logger System
│   ├── backup-system/            # Backup System
│   ├── data-sync-service/        # Data Sync Service
│   └── seamer-adapter-*/         # Optional Seamer device integrations
├── scripts/                      # Build and Tool Scripts
│   ├── build-bundles.ts          # Build all NodeCG bundles
│   ├── fix-html-paths.ts         # Fix generated HTML asset paths
│   ├── restore-html.js           # Restore generated HTML wrappers
│   └── kill-nodecg.ps1           # NodeCG Process Kill Script
├── cfg/                          # NodeCG Configuration Files
│   ├── README.md                 # Configuration notes
│   ├── nodecg.json.example       # NodeCG Core Config template
│   └── data-sync-service.json.example # Google Sheets Config template
├── db/                           # Database Files (Replicants Persistence)
├── logs/                         # Log Files
├── backups/                      # Backup Files
├── assets/                       # Local NodeCG Assets
├── DEVELOPMENT_MEMO.md           # Development requirements, changes, progress, notes
├── vite.config.dashboard.ts      # Legacy root Vite Dashboard Config
├── vite.config.extension.ts      # Legacy root Vite Extension Config
├── tsconfig.json                 # TypeScript Config
└── package.json                  # Project Config
```

`db/`, `logs/`, `backups/`, `assets/`, generated bundle output, and real `cfg/*.json` files are local runtime/deployment data and are intentionally ignored by Git.

## Dashboard Workspaces

LeafSeamer's Dashboard is organized into multiple workspaces by function:

- **Seamer**: Scene control card system
- **Mixer Control**: Mixer connection and control
- **ATEM Control**: ATEM switcher connection and control
- **OBS Control**: OBS connection and control
- **VB Control**: VB-Audio Matrix network config and matrix control
- **Graphic Control**: Graphics package control
- **Misc**: Backup control, log viewer, etc.

## Quick Start

For detailed installation and usage instructions, please refer to:

- [Installation Guide](Manual/eng/INSTALLATION.md)
- [User Manual](Manual/eng/USER_MANUAL.md)

### Basic Commands

```bash
# Install dependencies
npm install

# Build all bundles
npm run build

# Start NodeCG Service
npm start

# Development Mode
npm run dev

# Type Check
npm run typecheck
```

On Windows PowerShell, if script execution policy blocks `npm`, use `npm.cmd` for the same commands, for example `npm.cmd run build`.

### Source Deployment Flow

```bash
# 1. Create local config files from templates
cp cfg/nodecg.json.example cfg/nodecg.json

# Optional: only when using Google Sheets sync
cp cfg/data-sync-service.json.example cfg/data-sync-service.json

# 2. Install dependencies and build generated bundle files
npm install
npm run build

# 3. Start NodeCG
npm start
```

Generated bundle files are created under each bundle, such as `dashboard/`, `graphics/`, `shared/`, and `extension/index.js`. They are required at runtime after `npm run build`, but are not committed to source control.

### Independent Bundle Deployment

Every core bundle includes its own dependencies, TypeScript config, and Vite config:

```bash
cd bundles/seamer
npm install
npm run build
```

The same flow applies to `logger-system`, `schedule-manager`, and every device or service core bundle. Copy the built bundle directory into any NodeCG `bundles/` directory.

Adapters are intentionally installed as a set with their declared dependencies. For example, Mixer card control requires:

```text
seamer
mixer-control
seamer-adapter-mixer
```

Without the adapter, both `seamer` and `mixer-control` still load and work independently. Google Sheets schedule import follows the same pattern with `schedule-manager`, `data-sync-service`, and `schedule-adapter-google-sheets`.

### Planned Modular Integration Contract

The current adapters register four fixed Seamer integrations: Mixer, ATEM, OBS, and VB Matrix. The active hardening plan replaces those fixed UI/type branches with a versioned capability manifest so future adapters can register trigger definitions, actions, parameter schemas, and UI hints without modifying Seamer core.

Schedule Manager will remain source-independent. Google Sheets and PostgreSQL are planned as optional Node.js adapters that normalize external playlist rows into a shared schedule import contract. A separate optional Seamer schedule adapter will expose explicit `item due` and configured field-transition events as automation triggers. Python sidecars are not part of the current plan.

Security services are designed as libraries bundled with each core rather than mandatory NodeCG bundles. This preserves standalone operation while providing shared command validation, secret storage, redaction, backup classification, and audit contracts.

### Access Addresses

After startup visit:

- **Dashboard**: `http://localhost:9090`
- **Graphics**: `http://localhost:9090/bundles/[bundle-name]/graphics/[graphic-name].html`

## Configuration

- NodeCG Core Config: copy `cfg/nodecg.json.example` to `cfg/nodecg.json`
- Business Module Config: Generally configured dynamically via Dashboard interface (Persisted in `db/`)
- Google Sheets Config: copy `cfg/data-sync-service.json.example` to `cfg/data-sync-service.json` (Optional)
- Bundle configs are defined in their respective `package.json`
- TypeScript Config: `tsconfig.json`
- Vite Build Config: `vite.config.dashboard.ts` and `vite.config.extension.ts`

Real configuration files may contain local IP addresses or credentials, so `cfg/*.json` is ignored. Keep only `.example` templates in Git.

## Repository Hygiene

- Do commit: source code, manuals, `package.json`, lockfiles, `cfg/*.example`, `DEVELOPMENT_MEMO.md`, architecture plans, and `LeafSeamer_Project_Status_Report.html`.
- Do not commit: `node_modules/`, generated bundle output, logs, databases, backups, local assets, real config files, credentials, or temporary diagnostics.
- Local Secret files, SQLite audit databases/WAL files, restore keys, and machine-specific backup profiles are ignored by Git.
- Development status and release-readiness notes are tracked in `DEVELOPMENT_MEMO.md`.

## Version Information

**Current Version**: 1.1.3
**Release Date**: 2026-02-21
**Last Update**: 2026-07-12

## License

MIT
