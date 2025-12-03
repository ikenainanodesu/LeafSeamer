# LeafSeamer

LeafSeamer is a modular broadcast control system built on [NodeCG](https://nodecg.dev/). It provides a comprehensive suite of tools for managing live broadcasts, including mixer control, OBS automation, graphics, logging, backups, and schedule management.

## Features

- **Mixer Control**: OSC-based control for digital mixers (e.g., Behringer X32/M32).
- **OBS Control**: WebSocket-based automation for OBS Studio.
- **Graphics Package**: HTML/React-based broadcast graphics (Lower Thirds, Scoreboard).
- **Logger System**: Centralized logging with file persistence and dashboard viewer.
- **Backup System**: One-click backup of system configuration and database.
- **Data Sync**: Synchronization with Google Sheets for external data.
- **Schedule Manager**: Broadcast schedule management and display.

## Prerequisites

- **Node.js**: v18.x or later (Tested on v24.11.1)
- **npm**: v9.x or later
- **OBS Studio**: v28.x or later (with WebSocket 5.x enabled)

## Installation

1.  **Clone the repository**:

    ```bash
    git clone <repository-url>
    cd LeafSeamer
    ```

2.  **Install dependencies**:

    ```bash
    npm install
    ```

    _Note: This will install NodeCG and all bundle dependencies._

3.  **Build the project**:
    ```bash
    npm run build
    ```

## Configuration

Configuration files are located in the `cfg/` directory.

### `cfg/nodecg.json`

Core NodeCG configuration (host, port, logging).

### `cfg/leafseamer.json`

Bundle-specific configuration. Example:

```json
{
  "mixer": {
    "defaultIP": "192.168.1.100",
    "defaultPort": 8000
  },
  "obs": {
    "defaultHost": "localhost",
    "defaultPort": 4455,
    "defaultPassword": "your_password"
  },
  "googleSheets": {
    "spreadsheetId": "your_spreadsheet_id",
    "credentialsPath": "./credentials.json"
  }
}
```

## Usage

1.  **Start the system**:

    ```bash
    npm start
    ```

    Or for development (with auto-restart):

    ```bash
    npm run dev
    ```

2.  **Access the Dashboard**:
    Open [http://localhost:9090](http://localhost:9090) in your browser.

3.  **Access Graphics**:
    Graphics URLs are available in the Dashboard under the "Graphics" tab.

## Bundles

- **mixer-control**: Control faders and mute states.
- **obs-control**: Switch scenes and monitor stream status.
- **graphics-package**: Control on-air graphics.
- **logger-system**: View system logs.
- **backup-system**: Create and download backups.
- **data-sync-service**: Sync data from Google Sheets.
- **schedule-manager**: Manage on-air schedule.

## Troubleshooting

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for common issues and solutions.
