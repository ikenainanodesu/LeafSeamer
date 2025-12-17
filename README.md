[简体中文](Manual/chs/README.md) | [日本語](Manual/jpn/README.md) | [English](README.md)

# LeafSeamer

A broadcast production control system based on NodeCG, integrating unified control for Mixer, OBS, Graphics Overlay, VB-Audio Matrix, and other devices and services.

## Project Overview

LeafSeamer is a modern broadcast production control system providing centralized device control and state management for video streaming and program production. The project adopts a modular architecture, where each function is an independent NodeCG bundle, facilitating maintenance and extension.

## Core Features

### 🎛️ Card-Based Scene Control (Seamer)

- **Visualized Card Orchestration**: Configure and manage various control actions using an intuitive card interface
- **Multi-Action Integration**: A single card can trigger linked operations across multiple devices
- **Preset Management**: Save and load card layout presets to quickly switch production scenarios
- **Supported Action Types**:
  - Mixer Control: Fader, Send, Mute, etc.
  - OBS Control: Scene Switch, Transition Effect
  - ~~Delay (Delay Action): Precise timing control~~

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
- ~~Recording~~, Streaming control
- Real-time status monitoring (Stream status, statistics)
- Auto-reconnect mechanism (Max 3 times, 2s interval)
- Connection status feedback

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
- Schedule display graphic output
- Dashboard control panel

### 🛠️ System Service Modules

#### Logger System

- Centralized log collection and viewing
- Live Log Viewer
- Asynchronous log processing
- Unified width Dashboard panels

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
│   ├── obs-control/              # OBS Control
│   ├── vb-matrix-control/        # VB-Audio Matrix Control
│   ├── graphics-package/         # Graphics Package (GSAP Animation)
│   ├── schedule-manager/         # Schedule Manager
│   ├── logger-system/            # Logger System
│   ├── backup-system/            # Backup System
│   └── data-sync-service/        # Data Sync Service
├── shared/                       # Shared Resources
│   ├── types/                    # TypeScript Type Definitions
│   ├── utils/                    # Utility Functions
│   └── constants/                # Constant Definitions
├── scripts/                      # Build and Tool Scripts
│   └── kill-nodecg.ps1           # NodeCG Process Kill Script
├── cfg/                          # NodeCG Configuration Files
│   ├── nodecg.json               # NodeCG Core Config
│   └── leafseamer.json           # LeafSeamer Custom Config
├── db/                           # Database Files (Replicants Persistence)
├── logs/                         # Log Files
├── backups/                      # Backup Files
├── assets/                       # Static Assets
├── vite.config.dashboard.ts      # Vite Dashboard Config
├── vite.config.extension.ts      # Vite Extension Config
├── tsconfig.json                 # TypeScript Config
└── package.json                  # Project Config
```

## Dashboard Workspaces

LeafSeamer's Dashboard is organized into multiple workspaces by function:

- **Seamer**: Scene control card system
- **Mixer Control**: Mixer connection and control
- **OBS Control**: OBS connection and control
- **VB Control**: VB-Audio Matrix network config and matrix control
- **Graphic Control**: Graphics package control
- **Misc**: Backup control, log viewer, etc.

## Quick Start

For detailed installation and usage instructions, please refer to:

- [Installation Guide](Manual\eng\INSTALLATION.md)
- [User Manual](Manual\eng\USER_MANUAL.md)

### Basic Commands

```bash
# Install dependencies
npm install

# Start NodeCG Service
npm start

# Development Mode
npm run dev

# Build all bundles
npm run build

# Type Check
npm run typecheck
```

### Access Addresses

After startup visit:

- **Dashboard**: `http://localhost:9090`
- **Graphics**: `http://localhost:9090/bundles/[bundle-name]/graphics/[graphic-name].html`

## Configuration

- NodeCG Core Config: `cfg/nodecg.json`
- Business Module Config: Generally configured dynamically via Dashboard interface (Persisted in `db/`)
- Google Sheets Config: `cfg/data-sync-service.json` (Optional)
- Bundle configs are defined in their respective `package.json`
- TypeScript Config: `tsconfig.json`
- Vite Build Config: `vite.config.dashboard.ts` and `vite.config.extension.ts`

## Version Information

**Current Version**: 1.0.0
**Release Date**: 2025-12-17
**Last Update**: 2025-12-17

## License

Apache-2.0
