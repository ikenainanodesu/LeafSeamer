[简体中文](Manual/chs/README.md) | [日本語](Manual/jpn/README.md) | [English](README.md)

<img src="misc-resorce/seamer-logo-128x128.png" alt="isolated" width="250"/>

# LeafSeamer

A broadcast production control system based on NodeCG, integrating unified control for Mixer, OBS, Graphics Overlay, VB-Audio Matrix, and other devices and services.

## Project Overview

LeafSeamer is a modern broadcast production control system providing centralized device control and state management for video streaming and program production. Each core feature is an independently installable NodeCG bundle. Optional adapter bundles connect otherwise independent cores without making them mandatory dependencies.

All dashboard and graphic UI text is maintained in English.

## Dashboard UI Development and Acceptance

The approved Dashboard UI rules are maintained in [UI Design Guidelines](docs/UI_DESIGN_GUIDELINES.md). They apply to the 12 non-Graphics Dashboard pages. Visible LeafSeamer Dashboard text is English.

`shared/dashboard-ui/` is the authoritative UI source. Each managed Dashboard bundle commits its own versioned `src/dashboard/_leaf-ui/` snapshot; do not edit a snapshot by hand. Update the authority source, then synchronize and check the snapshots with:

```powershell
npm run ui:sync
npm run ui:check
npm run test:server
npm run test:ui
```

`npm run test:ui` accepts 36 Windows Chromium visual baselines and 16 behavior/infrastructure regressions (four core operation workflows, two server boundary/continued-availability checks, and ten device/focus workflows), for 52 Playwright tests total at 320, 480, and 768px. Run `npm run test:ui:update` only when an intentional visual change has been reviewed and its baselines must be refreshed.

`npm run test:server` runs six Node lifecycle and path-boundary regressions for the Dashboard acceptance server. Windows CI runs this suite independently from Playwright.

Every bundle must still install and build after its source is copied independently. A Dashboard may import only its own `_leaf-ui` snapshot at runtime: importing the authority source or another bundle's UI is prohibited. Bundle-local `_leaf-core` snapshots provide the same source-level independence for shared core code. Graphics is explicitly excluded from this UI unification.

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

# Contract and security tests
npm test
```

On Windows PowerShell, if script execution policy blocks `npm`, use `npm.cmd` for the same commands, for example `npm.cmd run build`.

### Source Deployment Flow

```bash
# 1. Create authenticated control config and replace every placeholder
cp cfg/nodecg.secure.json.example cfg/nodecg.json

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

### Modular Integration Contract

Seamer now accepts versioned capability manifests from arbitrary adapter IDs. Mixer, ATEM, OBS, and VB Matrix adapters publish trigger/action schemas, while the dashboard renders their parameters dynamically. Missing adapters leave persisted configuration visible but unavailable, so Seamer and each device core can still run independently.

Schedule Manager owns a source-isolated import, preview, commit, rollback, and event contract. Google Sheets and PostgreSQL use optional Node.js adapters that normalize rows into the same playlist model. The optional Seamer schedule adapter exposes only explicit `schedule.item_due` and configured `schedule.field_changed` triggers. Python sidecars are not used.

Shared security code is packaged as libraries rather than a mandatory NodeCG bundle. OBS, VB Matrix, and ATEM privileged Dashboard commands use a bundle-specific Socket.IO channel whose identity comes only from the authenticated NodeCG session. CommandGateway applies roles, schema, target checks, correlationId, and optional audit handling. Privileged legacy messages are disabled by default; Seamer Adapters call the target Bundle API with an explicit service identity.

OBS WebSocket passwords, stream keys, and stream authentication passwords are encrypted by the server SecretManager and are no longer published through Replicants. Dashboard inputs are write-only and public state exposes only `passwordConfigured` / `keyConfigured`. Set `LEAFSEAMER_SECRET_MASTER_KEY` to an independently generated 32-byte base64 or hexadecimal key before saving secrets.

Backup System supports selectable L0 Public, L1 Operational, L2 Confidential, and L3 Secret data. L3 is excluded by default and is written only as an AES-256-GCM encrypted payload protected by a separate passphrase. Logger applies redaction before persistence and stores command audit history in a separate SQLite/WAL database that is not affected by runtime-log cleanup.

### Bundle Source Independence

Each affected bundle includes a versioned `src/_leaf-core/` snapshot so it can build without repository-level shared source files. Do not edit these snapshots manually. Change the authoritative sources in `shared/integration` or `shared/security`, then run `npm run core:sync` to regenerate every snapshot. Before committing, verify that snapshots are current and that a representative bundle builds from an isolated temporary directory:

```powershell
npm run core:check
powershell -ExecutionPolicy Bypass -File scripts/test-standalone-bundle.ps1 -Bundle seamer
```

The PostgreSQL adapter and its `pg` dependency are included in the workspace lockfile. Use a read-only database account and expose the connection string only through the configured environment variable.

The 2026-07-13 online dependency audit reports 0 high/critical findings after compatible lockfile updates. Eleven moderate transitive findings remain in NodeCG and Google API dependency trees; they require upstream fixes or separately tested major-version migrations, so this branch does not use `npm audit fix --force`.

### Access Addresses

After startup visit:

- **Dashboard**: `http://localhost:9090`
- **Graphics**: `http://localhost:9090/bundles/[bundle-name]/graphics/[graphic-name].html`

## Configuration

- NodeCG Core Config: copy `cfg/nodecg.json.example` to `cfg/nodecg.json`
- Authenticated Control Config: use `cfg/nodecg.secure.json.example`, replace every placeholder, and follow `cfg/README.md`
- Business Module Config: Generally configured dynamically via Dashboard interface (Persisted in `db/`)
- Google Sheets Config: copy `cfg/data-sync-service.json.example` to `cfg/data-sync-service.json` (Optional)
- PostgreSQL Schedule Config: copy `cfg/schedule-adapter-postgresql.json.example` to its real config and provide the connection string through `LEAFSEAMER_SCHEDULE_POSTGRES_URL` (Optional)
- OBS/ATEM/VB legacy privileged messages remain disabled unless the corresponding Bundle config explicitly sets `security.allowLegacyPrivilegedMessages` to `true`
- Bundle configs are defined in their respective `package.json`
- TypeScript Config: `tsconfig.json`
- Vite Build Config: `vite.config.dashboard.ts` and `vite.config.extension.ts`

Real configuration files may contain local IP addresses or credentials, so `cfg/*.json` is ignored. Keep only `.example` templates in Git.

## Repository Hygiene

- Do commit: source code, manuals, `package.json`, lockfiles, `cfg/*.example`, `DEVELOPMENT_MEMO.md`, architecture plans, and `LeafSeamer_Project_Status_Report.html`.
- Do not commit: `node_modules/`, generated bundle output, logs, databases, backups, local assets, real config files, credentials, or temporary diagnostics.
- Local Secret files, SQLite audit databases/WAL files, restore keys, and machine-specific backup profiles are ignored by Git.
- Development status and release-readiness notes are tracked in `DEVELOPMENT_MEMO.md`.
- CI uses `npm ci`, runs tests and type checks, builds all bundles, validates the HTML report, and separately builds key standalone bundles.

## Version Information

**Current Version**: 1.1.3
**Release Date**: 2026-02-21
**Last Update**: 2026-07-13

## License

MIT
