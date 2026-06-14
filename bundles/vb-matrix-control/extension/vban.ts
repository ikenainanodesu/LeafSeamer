import dgram from "dgram";
import { EventEmitter } from "events";

const VBAN_HEADER_SIZE = 28;
const VBAN_PROTOCOL_TEXT = 0x40;
const VBAN_BPS_256000 = 18; // VBAN 规范中的 256000 bps 索引。

export class VBANTransmitter extends EventEmitter {
  private socket: dgram.Socket;
  private ip: string = "127.0.0.1";
  private port: number = 6980;
  private streamName: string = "Command1";
  private packetCounter: number = 0;
  private onInfo?: (message: string) => void;

  constructor(onInfo?: (message: string) => void) {
    super();
    this.onInfo = onInfo;
    this.socket = dgram.createSocket("udp4");
    this.socket.setMaxListeners(50);

    this.socket.on("listening", () => {
      const address = this.socket.address();
      this.onInfo?.(
        `[VBAN] Socket listening on ${address.address}:${address.port}`
      );
    });

    this.socket.on("message", (msg, rinfo) => {
      // 校验基础 VBAN 头部。
      if (msg.length < VBAN_HEADER_SIZE) return;
      if (msg.toString("ascii", 0, 4) !== "VBAN") return;

      // VBAN-Text 的正文从第 28 字节开始。
      const payload = msg.toString("utf8", VBAN_HEADER_SIZE);
      this.emit("data", payload, rinfo);
    });

    this.socket.on("error", (err) => {
      this.emit("error", err);
    });

    // 绑定随机端口以接收响应。
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

    // 写入 VBAN 固定头部。
    buffer.write("VBAN", 0);

    // SR / Protocol：高三位为 TEXT 子协议，低五位为采样率索引。
    buffer.writeUInt8(VBAN_PROTOCOL_TEXT | VBAN_BPS_256000, 4);

    // Preamble / Service。
    buffer.writeUInt8(0, 5);

    // Channels。
    buffer.writeUInt8(0, 6);

    // Format。
    buffer.writeUInt8(0, 7);

    // Stream Name 固定占 16 字节。
    buffer.write(this.streamName, 8, 16);

    // Frame Counter 固定占 4 字节。
    buffer.writeUInt32LE(this.packetCounter++, 24);

    // 写入正文。
    buffer.write(text, 28);

    this.socket.send(buffer, this.port, this.ip, (err) => {
      if (err) this.emit("error", err);
    });
  }

  destroy() {
    this.socket.close();
  }
}
