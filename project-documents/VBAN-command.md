All VBAN-TEXT requests that can be used to control VB-Audio Matrix (through MacroButtons app for example).

SUID = Slot unique identifier = SLOT UNIQ NAME (e.g. ASIO128, VBAN1 etc…).
all index 'i', 'j'... are '1' based (first item index = 1).

Point(SUID.IN[n], SUID.OUT[j]).dBGain = -6.0;
Point(SUID.IN[i1..i2], SUID.OUT[j1..j2]).dBGain = -6.0;

Point(SUID.IN[n], SUID.OUT[j]).Remove; //Remove point
Point(SUID.IN[i1..i2], SUID.OUT[j1..j2]).Remove;

Point(SUID.IN[n], SUID.OUT[j]).Mute = 1;
Point(SUID.IN[i1..i2], SUID.OUT[j1..j2]).Mute =1;

Point(SUID.IN[n], SUID.OUT[j]).Phase = 1;
Point(SUID.IN[i1..i2], SUID.OUT[j1..j2]).Phase =1;

Point(SUID.IN[n], SUID.OUT[j]).Paste; //see Zone().Copy

Undo;
Redo;

Output(SUID.OUT[j]).Name = “MyName”; //set label
Output(SUID.OUT[j1..j2]).Name = “”; //to remove label

Output(SUID.OUT[j]).Reset; //Remove all points
Output(SUID.OUT[j1..j2]).Reset;

Input(SUID.IN[n]).Name = “MyName”; //set label
Input(SUID.IN[i1..i2]).Name = “”; //to remove label

Input(SUID.IN[n]).Reset; //Remove all points
Input(SUID.IN[i1..i2]).Reset;

Zone(SUID.IN[n], SUID.OUT[j]: SUID.IN[k], SUID.OUT[l]).Reset;
Zone(SUID.IN[n], SUID.OUT[j]: SUID.IN[k], SUID.OUT[l]).Copy;
Zone(SUID.IN[n], SUID.OUT[j]: SUID.IN[k], SUID.OUT[l]).Store = nuPreset;
Zone(SUID.IN[n], SUID.OUT[j]: SUID.IN[k], SUID.OUT[l]).Add = nuPreset;

Zone(SUID.IN[n], SUID.OUT[j]: SUID.IN[k], SUID.OUT[l]).dBGain = -6.0;
Zone(SUID.IN[n], SUID.OUT[j]: SUID.IN[k], SUID.OUT[l]).Mute = 1;
Zone(SUID.IN[n], SUID.OUT[j]: SUID.IN[k], SUID.OUT[l]).Phase = 1;

Slot(SUID.IN).Reset = 1;
Slot(SUID.OUT).Reset = 1;
Slot(SUID).Reset = 1;
Slot(SUID).Online = 1;
Slot(SUID).Master = 1;

Slot(SUID).Device = ""; //remove device
Slot(SUID).Device.ASIO = "Device Name"; //or {GUID}
Slot(SUID).Device.MME = "Device Name";
Slot(SUID).Device.KS = "Device Name";
Slot(SUID).Device.WDM = "Device Name";

PresetPatch[n].Apply;
PresetPatch[n].Comment = "comment"
PresetPatch[n].Copy;
PresetPatch[n].Delete;
PresetPatch[n].Gain = 0.0;
PresetPatch[n].Load = "FileName"With Matrix Version X.0.1.2 any client application can send Question Tag requests to get current status.
just add a "?" as value.

Point(SUID.IN[n], SUID.OUT[j]).dBGain = ?;
Point(SUID.IN[i1..i2], SUID.OUT[j1..j2]).dBGain = ?;

Point(SUID.IN[n], SUID.OUT[j]).Mute = ?;
Point(SUID.IN[i1..i2], SUID.OUT[j1..j2]).Mute =?;

Point(SUID.IN[n], SUID.OUT[j]).Phase = ?;
Point(SUID.IN[i1..i2], SUID.OUT[j1..j2]).Phase =?;

Output(SUID.OUT[j]).Name = ?;
Output(SUID.OUT[j1..j2]).Name = ?;

Input(SUID.IN[n]).Name = ?;
Input(SUID.IN[i1..i2]).Name = ?;

Slot(SUID).Online = ?;
Slot(SUID).Master = ?;
Slot(SUID).Device = ?;
Slot(SUID).RunningStatus = ?; // returns 0 or 1
Slot(SUID).Info = ?; // ex: “in:4, out:8”;

PresetPatch[n].Name = ?;
PresetPatch[n].Comment = ?;
PresetPatch[n].Apply = ?; //returns number of applied / number max
PresetPatch[n].Mute = ?; //returns number of muted / number max
PresetPatch[n].Phase = ?; //returns number of out of phase / number max
PresetPatch[n].Gain = ?;
PresetPatch[n].Zone = ?; //returns Number of Zone
PresetPatch[n].Point = ?; //returns Number of Points

Command.Version = ?; // app name + version number
Command.Load = ?; // returns current file name
Command.LoadGrid = ?;// returns current file name

Version X.0.1.8
Command.Engine = ?; // returns 0 or 1 + (MASTER SUID, SR, BUFFER SIZE)
Command.Master = ?; // returns MASTER SUID + (SR, BUFFER SIZE)

EXAMPLE OF CLIENT APPLICATION sending VBAN-TEXT request to Matrix and receiving response:
https://github.com/vburel2018/VBAN-Text-Client
PresetPatch[n].Mute = 1
PresetPatch[n].Name = "Name"
PresetPatch[n].Paste;
PresetPatch[n].Phase = 1;
PresetPatch[n].Recall;
PresetPatch[n].ResetZone;
PresetPatch[n].SaveAs = "file name"
PresetPatch[n].Select;
PresetPatch[n].Unapply;
PresetPatch[n].Update

Command.Shutdown =1;
Command.Show =1;
Command.Restart = 1;
Command.Reset = 1;
Command.ResetGrid = 1;
Command.Save = "filenmane";
Command.Load= "filenmane";
Command.SaveGrid= "filenmane";
Command.LoadGrid= "filenmane";
