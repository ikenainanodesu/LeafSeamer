import dgram from "dgram";
import { EventEmitter } from "events";

const VBAN_HEADER_SIZE = 28;
const VBAN_PROTOCOL_TEXT = 0x40;
const VBAN_BPS_256000 = 18; // 256000 bps index per VBAN specification

export class VBANTransmitter extends EventEmitter {
  private socket: dgram.Socket;
  private ip: string = "127.0.0.1";
  private port: number = 6980;
  private streamName: string = "Command1";
  private packetCounter: number = 0;

  constructor() {
    super();
    this.socket = dgram.createSocket("udp4");

    this.socket.on("listening", () => {
      const address = this.socket.address();
      console.log(
        `[VBAN] Socket listening on ${address.address}:${address.port}`
      );
    });

    this.socket.on("message", (msg, rinfo) => {
      // Basic VBAN validation
      if (msg.length < VBAN_HEADER_SIZE) return;
      if (msg.toString("ascii", 0, 4) !== "VBAN") return;

      // Parse header if needed, but for now we just care about payload
      // In VBAN-Text, payload starts at byte 28
      const payload = msg.toString("utf8", VBAN_HEADER_SIZE);
      this.emit("data", payload, rinfo);
    });

    this.socket.on("error", (err) => {
      this.emit("error", err);
    });

    // Bind to a random port to receive responses
    this.socket.bind(0);
  }

  setConfig(ip: string, port: number, streamName: string) {
    this.ip = ip;
    this.port = port;
    this.streamName = streamName;
  }

  send(text: string) {
    if (!text) return;

    const buffer = Buffer.alloc(VBAN_HEADER_SIZE + Buffer.byteLength(text));

    // Header 'VBAN'
    buffer.write("VBAN", 0);

    // SR / Protocol: Bits 5-7 = sub-protocol (010 for TEXT = 0x40)
    //                Bits 0-4 = BPS index (18 for 256000 bps)
    // Per VBAN spec: TEXT protocol uses 256000 bps (index 18)
    buffer.writeUInt8(VBAN_PROTOCOL_TEXT | VBAN_BPS_256000, 4);

    // Preamble / Service (0)
    buffer.writeUInt8(0, 5);

    // Channels (0)
    buffer.writeUInt8(0, 6);

    // Format (0)
    buffer.writeUInt8(0, 7);

    // Stream Name (16 bytes)
    buffer.write(this.streamName, 8, 16);

    // Frame Counter (4 bytes)
    buffer.writeUInt32LE(this.packetCounter++, 24);

    // Payload
    buffer.write(text, 28);

    this.socket.send(buffer, this.port, this.ip, (err) => {
      if (err) this.emit("error", err);
    });
  }

  destroy() {
    this.socket.close();
  }
}
