# Troubleshooting Guide

## Common Issues

### 1. NodeCG fails to start with `EADDRINUSE`

**Error**: `Error: listen EADDRINUSE: address already in use :::9090`
**Cause**: Another instance of NodeCG is already running, or the port is occupied.
**Solution**:

- Stop any running NodeCG processes.
- **Recommended**: Run the helper script: `.\scripts\kill-nodecg.ps1`
- **Manual**: Run this command in PowerShell to kill only the process on port 9090:
  ```powershell
  Get-NetTCPConnection -LocalPort 9090 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
  ```
- Change the port in `cfg/nodecg.json` if the port is legitimately in use by another application.

### 2. Bundle fails to load with "Cannot find module"

**Error**: `Error: Cannot find module '...'`
**Cause**:

- Dependencies not installed.
- TypeScript not compiled.
- Incorrect `nodecg.extension.input` path in `package.json`.
  **Solution**:
- Run `npm install` in the project root (and bundle directories if needed).
- Run `npm run build` to compile TypeScript.
- Check `package.json` of the failing bundle and ensure `extension.input` points to the correctly compiled `.js` file in `dist/`.

### 3. "graphics" property error

**Error**: `Error: [bundle-name] has a "nodecg.graphics" property in its package.json, but no "graphics" folder`
**Cause**: The `package.json` defines an empty `"graphics": []` array, but the folder is missing.
**Solution**: Remove the `"graphics": []` property from the bundle's `package.json`.

### 4. Google Sheets Sync fails

**Error**: `Error: No key or keyFile set` or `Credentials file not found`
**Cause**: Missing or incorrect Google Cloud credentials.
**Solution**:

- Ensure `credentials.json` exists in the project root (or path specified in config).
- Verify `cfg/leafseamer.json` has the correct `credentialsPath`.

### 5. OBS Connection fails

**Error**: `Connection failed` in OBS Control dashboard.
**Cause**: Incorrect IP, Port, or Password.
**Solution**:

- Check `cfg/leafseamer.json` settings.
- Ensure OBS WebSocket server is enabled in OBS Studio (Tools -> WebSocket Server Settings).

## Getting Help

If you encounter issues not listed here, please check the logs in `bundles/logger-system/logs/` or the console output.
