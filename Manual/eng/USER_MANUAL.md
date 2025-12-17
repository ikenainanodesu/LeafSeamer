# LeafSeamer User Manual

This manual details how to use each function module of LeafSeamer.

## Table of Contents

1. [Dashboard Overview](#dashboard-overview)
2. [Seamer - Scene Control Card System](#seamer---scene-control-card-system)
3. [Mixer Control](#mixer-control)
4. [OBS Control](#obs-control)
5. [VB Matrix Control](#vb-matrix-control---vb-audio-matrix-control)
6. [Graphics Package](#graphics-package)
7. [Schedule Manager](#schedule-manager)
8. [Logger System](#logger-system)
9. [Backup System](#backup-system)

---

## Dashboard Overview

After starting LeafSeamer, visit `http://localhost:9090` to open the Dashboard.

### Workspaces

The Dashboard is organized into multiple workspaces by function, click the top tabs to switch:

- **Seamer**: Scene control card system
- **Mixer Control**: Mixer connection and control
- **OBS Control**: OBS connection and control
- **VB Control**: VB-Audio Matrix configuration and control
- **Graphic Control**: Graphics package control
- **Misc**: Backup, logs, and other auxiliary functions

### Panel Layout

Each workspace contains multiple Panels, which can be dragged and arranged freely in the Dashboard.

---

## Seamer - Scene Control Card System

Seamer is the core function of LeafSeamer, providing visualized card-based scene control.

### Feature Overview

- **Card Management**: Create, edit, delete control cards
- **Multi-action Integration**: One card can contain multiple control actions
- **Preset System**: Save and load card layout presets
- **Drag and Drop Sorting**: Intuitive drag operation to adjust card order

### Create Card

1. In the **Seamer** workspace, click the **"+ Add Card"** button
2. Configure in the pop-up edit window:
   - **Card Name**: Name the card (e.g., "Opening Scene")
   - **Card Color**: Select card background color for easy identification
3. Click **"Add Action"** to add an action

### Configure Action

Each card can contain multiple actions, executed in order:

#### Mixer Control

- **Fader**: Control channel fader
  - Select input channel
  - Set target level (dB)
- **Sends**: Configure sends
  - Select input and output channels
  - Set Gain, On/Off, Pre/Post, Pan

#### OBS Control

- Select OBS instance
- Select target scene
- Select transition effect (Optional)

<details><summary>Delay function coming soon</summary>

~~Delay
Set delay time (milliseconds)
Used for timing control between actions~~

</details>

### Execute Card

- **Single Execution**: Click the card to trigger all actions in it
- **Action Sequence**: Actions are executed in the order they are added
- ~~**Delay Control**: Use Delay action to control execution timing~~

### Preset Management

#### Save Preset

1. After arranging all cards, click **"Save Preset"**
2. Enter preset name
3. The preset will save the current configuration and arrangement of all cards

#### Load Preset

1. Click **"Load Preset"**
2. Select the preset to load from the list
3. The current card layout will be replaced by the preset content

#### Delete Preset

1. Find the preset to delete in the preset list
2. Click the delete button to confirm deletion

### Best Practices

- **Scenario Management**: Create dedicated presets for different program segments (e.g., "Opening", "Interview", "Ending")
- **Color Coding**: Use different colors to distinguish card types (e.g., Red=Emergency, Green=Normal)
- **Naming Convention**: Use clear naming for quick identification

---

## Mixer Control

Control mixer devices via Yamaha RCP protocol.

### Connect Mixer

- Currently only supports DM3
- Currently only functionality tested on DM3
- Theoretically DM7 should work but needs testing

1. In the **Mixer Control** workspace, find the **"Mixer Connection"** panel
2. Configure connection parameters:
   - **IP Address**: Mixer IP address
   - **Port**: RCP port (default 49280)
3. Click **"Connect"** to establish connection
4. After successful connection, the status indicator shows green

### Fader Control

In the **"Mixer Control"** panel:

1. Select input channel
2. Drag fader slider or enter value
3. Level changes will be sent to the mixer in real-time

### Input Send

Configure sends from input channel to output channel:

1. Select **Input Channel** (Input)
2. Select **Output Channel** (Output)
3. Configure parameters:
   - **Gain**: Send gain (dB)
   - **On/Off**: Enable or disable send
   - **Pre/Post**: Send point selection
     - Pre: Pre-fader send
     - Post: Post-fader send
   - **Pan**: Pan (L/R)

<details><summary>Patch function is still being perfected due to lack of RCP documentation</summary>

```
### Patch Configuration

Configure input/output routing:

1. In Patch Control area:
   - Select **Input Device**
   - Select **Output Device**
2. Support adding multiple Patch panels
3. Click **"+"** to add new Patch panel
4. Click **"×"** to delete Patch panel (First panel cannot be deleted)
```

</details>

### Troubleshooting

- **Connection Failure**:
  - Check if IP address and port are correct
  - Check network connection and firewall settings

- **Control No Response**:
  - Confirm connection status is connected
  - Check error messages in Logger System
  - Some commands might not be supported by the mixer (e.g. Patch)

---

## OBS Control

Control OBS Studio via WebSocket protocol, supporting multi-instance management.

### Connect OBS

#### Enable OBS WebSocket

1. Open OBS Studio
2. Go to **Tools → WebSocket Server Settings**
3. Enable WebSocket Server
4. Set port (default 4455) and password
5. Click OK

#### Connect in LeafSeamer

1. In **OBS Control** workspace, find **"OBS Connection"** panel
2. Click **"+ Add Connection"** to add OBS instance
3. Configure connection parameters:
   - **Instance Name**: Instance identifier (e.g., "Main OBS")
   - **IP Address**: Device IP running OBS (use `127.0.0.1` for local)
   - **Port**: WebSocket port (default 4455)
   - **Password**: WebSocket password
4. Click **"Connect"** to connect

#### Connection Status

- **Connecting...**: Trying to connect
- **Connected**: Successfully connected
- **Disconnected**: Not connected
- **Connection failed**: Connection failed (will automatically retry 3 times)

### Scene Control

In the **"OBS Control"** panel:

1. Select OBS instance (if multiple)
2. Select target scene from scene list
3. Click scene name to switch to that scene

### Transition Effect

1. Select transition type in scene list
2. Selected transition effect will be applied when switching scenes

### Real-time Status

After successful connection, shows:

- Current scene name
- Recording status
- Streaming status
- Streaming statistics (Bitrate, FPS, etc.)

### Multi-OBS Instance Management

1. Can add multiple OBS instances (e.g., Main, Backup)
2. Each instance is managed and controlled independently
3. Can select which instance to control in Seamer cards

### Auto Reconnect

- Automatically tries to reconnect after disconnection (Max 3 times)
- Reconnect interval 2 seconds
- Shows error message after failure

---

## VB Matrix Control - VB-Audio Matrix Control

Control VB-Audio Matrix audio routing matrix via VBAN protocol.

### Network Configuration

In **"VB Network Config"** panel:

1. **IP**: Enter VB-Audio Matrix IP address
2. **Port**: Enter VBAN port (default 6980)
3. **Stream**: Enter VB-Audio Matrix Stream name
   - Must strictly match the Stream name in Matrix VBAN
4. **Local IP**: Displays local IP address (Auto-detected)
5. Click **"Ping Test"** to test network connectivity:
   - **OK!!** (Green): Network reachable
   - **Fail** (Red): Network unreachable

- VBAN connection needs strict matching of:
  - IP Address
  - Port
  - Stream Name

### Patch Control

In **"VB Matrix Control"** panel:

1. **Input Device**: Select input device
2. **Output Device**: Select output device
3. Routing configuration is automatically applied after selection

#### Multi-Patch Panel

- Click **"+"** button to add new Patch control panel
- Click **"×"** button on top right of panel to delete it (First panel cannot be deleted)
- Can configure multiple input/output routes simultaneously

### Preset Management

- **Save Preset**: Save current configuration of all Patch panels
- **Load Preset**: Load saved preset
- **Delete Preset**: Delete preset

Preset saves:

- Count and configuration of all Patch panels
- Input/output device selection of each panel

### Notes

- Ensure VB-Audio Matrix software is running
- Ensure VBAN function is enabled
- Use Ping Test to confirm network connectivity

---

## Graphics Package

Provides graphic overlays like Lower Third, Scoreboard, etc.

### Access Graphics Page

Graphics pages need to be added as Browser Source in OBS or other video software:

```
http://localhost:9090/bundles/graphics-package/graphics/lower-third.html
http://localhost:9090/bundles/graphics-package/graphics/scoreboard.html
```

### Lower Third

1. Configure in Dashboard:
   - **Name**: Person's name
   - **Title**: Position/Title
2. Click **"Show"** to display Lower Third
3. Click **"Hide"** to hide Lower Third
4. Uses GSAP animation for smooth entry and exit effects

### Scoreboard

1. Configure match info:
   - Team names
   - Scores
2. Click **"Update"** to update display
3. Supports custom styles and animations

---

<details><summary>Function under development</summary>

## Schedule Manager

Manage program schedule and schedule display.

### Create Schedule

1. Open control panel in **Schedule Manager** workspace
2. Add schedule item:
   - **Time**: Program start time
   - **Title**: Program name
   - **Description**: Program intro
3. Click **"Save"** to save schedule

### Schedule Display

Add schedule display graphic to OBS:

```
http://localhost:9090/bundles/schedule-manager/graphics/schedule-display.html
```

### Data Synchronization

Supports syncing schedule data from Google Sheets (Requires Google API configuration).

---

</details>

## Logger System

Centralized view of all system logs.

### View Logs

Find **"Log Viewer"** panel in **Misc** workspace:

1. Real-time display of latest logs
2. Logs sorted by time in descending order
3. Different log levels identified by different colors:
   - **Info**: Normal info (Blue)
   - **Warning**: Warning (Yellow)
   - **Error**: Error (Red)

### Log Files

Log files are saved in `logs/` directory:

- Stored in files by date
- Supports log rotation
- Can manually view historical log files

---

## Backup System

Automatically or manually backup project configuration and data.

### Create Backup

Find **"Backup Control"** panel in **Misc** workspace:

1. Click **"Create Backup"** to create backup
2. Backup file will be saved to `backups/` directory
3. Backup filename format: `backup-YYYY-MM-DD-HH-mm-ss.zip`

### Backup Content

Backup contains:

- `db/` directory (Replicants data)
- `cfg/` directory (Configuration files)
- Preset data
- Other user data

### Restore Backup

1. Unzip backup file
2. Copy backup content to corresponding directory
3. Restart NodeCG

### Best Practices

- Manually create backup before important operations
- Regular backup (Suggested at least once a week)
- Save backup files to other locations (e.g., Cloud storage, external hard drive)

---

<details><summary>Keyboard shortcuts (Future version support)</summary>

## Keyboard Shortcuts

Currently LeafSeamer 1.0.0 is operated mainly via mouse clicks, keyboard shortcut support will be added in future versions.

---

</details>

## Tips and Suggestions

### Scene Card Design

- Place frequently used scenes at the top
- Use colors to distinguish different types of cards
- Use clear naming for cards

### Preset Management

- Create dedicated presets for different types of programs
- Regularly clean up unused presets
- Preset naming should be meaningful (e.g., "News Program - Standard Config")

### Device Connection

- Use in stable network environment
- Use wired network instead of Wi-Fi
- Regularly check device connection status

---

## Next Steps

- View [README.md](./README.md) for more technical details
- View [INSTALLATION.md](./INSTALLATION.md) for installation configuration

## Feedback and Support

If you have questions or suggestions, please check Logger System or check log files in `logs/` directory.
