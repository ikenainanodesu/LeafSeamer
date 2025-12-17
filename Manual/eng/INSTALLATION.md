# LeafSeamer Installation Guide

This document provides complete installation and deployment instructions for LeafSeamer 1.0.0.

## System Requirements

### Minimum Requirements

- **OS**: Windows 10/11, macOS 10.15+, Linux (Ubuntu 20.04+)
- **Node.js**: v18.0.0 or higher
- **NPM**: v9.0.0 or higher
- **RAM**: 4GB
- **Disk Space**: At least 1GB available space

### Recommended Configuration

- **Node.js**: v20.0.0+
- **RAM**: 8GB or more
- **Network**: LAN environment for device communication

## Installation Steps

### 1. Install Node.js and NPM

If Node.js is not installed, please verify [nodejs.org](https://nodejs.org/) to download and install the LTS version.

Verify installation:

```bash
node --version  # Should show v18.0.0 or higher
npm --version   # Should show v9.0.0 or higher
```

### 2. Download LeafSeamer

#### Method 1: Clone from GitHub (Recommended)

```bash
git clone https://github.com/ikenainanodesu/LeafSeamer.git
cd LeafSeamer
```

#### Method 2: Download Source Code Zip

1. Visit the Releases page of the GitHub repository
2. Download the latest version of the source code zip
3. Unzip to your chosen directory

### 3. Install Dependencies

Run in the project root directory:

```bash
npm install
```

> **Note**: First installation might take a few minutes depending on network speed. NPM will automatically install all required dependency packages.

### 4. Build Project

After installation, build all bundles:

```bash
npm run build
```

This command will:

- Compile all TypeScript code
- Build Extension and Dashboard for all bundles
- Generate executable production code

## Configuration

### NodeCG Core Configuration

Edit `cfg/nodecg.json` configuration file:

```json
{
  "host": "0.0.0.0",
  "port": 9090,
  "logging": {
    "console": {
      "enabled": true,
      "level": "info"
    }
  }
}
```

**Configuration Items**:

- `host`: Server listening address (`0.0.0.0` allows access from other devices)
- `port`: Dashboard access port (default 9090)
- `logging`: Logging configuration

### Module Configuration

LeafSeamer's core function modules (Mixer, OBS, Matrix Control) **do not** need configuration file editing. Please configure connections directly in the **Dashboard** interface, the system will automatically save your settings.

### Google Sheets API Configuration (Optional)

If you need to use `data-sync-service` bundle to sync external data, please create `cfg/data-sync-service.json` configuration file:

```json
{
  "googleSheets": {
    "credentialsPath": "./credentials.json",
    "spreadsheetId": "your-spreadsheet-id"
  }
}
```

Configuration steps:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing project
3. Enable Google Sheets API
4. Create service account and download JSON key file
5. Rename key file to `credentials.json` and place in project root directory

## Start Service

### Development Mode

```bash
npm start
# or
npm run dev
```

After startup, console will show:

```
NodeCG is listening on http://localhost:9090
```

### Access Dashboard

Open in browser:

```
http://localhost:9090
```

If accessing from another device, use the server's IP address:

```
http://[ServerIP]:9090
```

### Confirm All Bundles Loaded

In startup logs, you should see output similar to:

```
[nodecg] Loaded bundles:
  - seamer
  - mixer-control
  - obs-control
  - vb-matrix-control
  - graphics-package
  - schedule-manager
  - logger-system
  - backup-system
  - data-sync-service
```

## Stop Service

Press `Ctrl+C` in the terminal window running NodeCG to stop the service.

### Quick Kill for Windows Users

If you encounter port occupation issues, you can use the provided helper script:

```powershell
.\scripts\kill-nodecg.ps1
```

Or manually kill the process occupying port 9090:

```powershell
Get-NetTCPConnection -LocalPort 9090 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

## Firewall and Network Configuration

### Open Ports

Ensure the following ports are open in the firewall (depending on your configuration):

- **9090**: NodeCG Dashboard and Graphics (Required)
- **49280**: Mixer RCP communication (if using mixer-control)
- **4455**: OBS WebSocket (if using obs-control)
- **6980**: VB-Audio Matrix VBAN (if using vb-matrix-control)

### Windows Firewall Configuration Example

```powershell
# Allow NodeCG Inbound Connection
New-NetFirewallRule -DisplayName "NodeCG Server" -Direction Inbound -LocalPort 9090 -Protocol TCP -Action Allow
```

## Data Persistence

LeafSeamer uses NodeCG's Replicants system for data persistence:

- **Storage Path**: `db/` directory
- **Backup Path**: `backups/` directory
- **Log Path**: `logs/` directory

> **Important**: Regularly backup `db/` directory to prevent data loss. Can use Backup System in Dashboard for manual or automatic backup.

## .gitignore Explanation

Project's `.gitignore` file is configured to exclude:

- `node_modules/`: NPM dependency packages
- `db/`: Database files (contains user data)
- `logs/`: Log files
- `backups/`: Backup files
- `dist/`: Build artifacts
- `.env`: Environment variable file
- `project-documents/`: Project documents (dev docs)
- `.agent/`: AI assistant tool config

If you need to share configuration in a team, suggested:

1. Create `cfg/nodecg.json.example` as configuration template
2. Add actual config files `cfg/nodecg.json` and `cfg/data-sync-service.json` to `.gitignore`
3. Team members create their own config files based on template

## Troubleshooting

If you encounter issues, please check Logger System.

Common issues quick check:

1. **Port Occupied**: Use `kill-nodecg.ps1` script or change port in config file
2. **Bundle Load Failed**: Run `npm run build` to rebuild
3. **Missing Dependencies**: Run `npm install` to reinstall dependencies
4. **Device Connection Failed**: Check IP address and port configuration in Dashboard panel

## Next Steps

After installation, please refer to [User Manual](./USER_MANUAL.md) to learn how to use each function module.

## Technical Support

- **Documentation**: View [README.md](./README.md) and [USER_MANUAL.md](./USER_MANUAL.md)
