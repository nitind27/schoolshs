import { mkdir } from "fs/promises";
import path from "path";
import QRCode from "qrcode";
import pino from "pino";
import { phoneToWhatsAppJid } from "@/lib/whatsapp/phone";

export type WhatsAppConnectionStatus = "disconnected" | "connecting" | "qr" | "connected";

export type WhatsAppSessionSnapshot = {
  status: WhatsAppConnectionStatus;
  qrDataUrl: string | null;
  phone: string | null;
  pushName: string | null;
  lastError: string | null;
};

type BaileysModule = typeof import("@whiskeysockets/baileys");
type WASocket = import("@whiskeysockets/baileys").WASocket;

const AUTH_DIR = path.join(process.cwd(), "automation", "whatsapp-auth");

let baileysPromise: Promise<BaileysModule> | null = null;

async function loadBaileys(): Promise<BaileysModule> {
  if (!baileysPromise) {
    baileysPromise = import("@whiskeysockets/baileys");
  }
  return baileysPromise;
}

class WhatsAppService {
  private sock: WASocket | null = null;
  private starting = false;
  private snapshot: WhatsAppSessionSnapshot = {
    status: "disconnected",
    qrDataUrl: null,
    phone: null,
    pushName: null,
    lastError: null,
  };

  getSnapshot(): WhatsAppSessionSnapshot {
    return { ...this.snapshot };
  }

  isConnected(): boolean {
    return this.snapshot.status === "connected" && Boolean(this.sock);
  }

  async tryRestore(): Promise<void> {
    if (this.isConnected() || this.starting) return;
    await this.start({ silent: true });
  }

  async start(opts?: { silent?: boolean }): Promise<WhatsAppSessionSnapshot> {
    if (this.isConnected()) return this.getSnapshot();
    if (this.starting) return this.getSnapshot();

    this.starting = true;
    this.snapshot = {
      status: "connecting",
      qrDataUrl: null,
      phone: this.snapshot.phone,
      pushName: this.snapshot.pushName,
      lastError: null,
    };

    try {
      await mkdir(AUTH_DIR, { recursive: true });
      await this.createSocket();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to start WhatsApp";
      this.snapshot = {
        status: "disconnected",
        qrDataUrl: null,
        phone: null,
        pushName: null,
        lastError: message,
      };
      if (!opts?.silent) console.error("[whatsapp] start failed:", e);
    } finally {
      this.starting = false;
    }

    return this.getSnapshot();
  }

  async logout(): Promise<WhatsAppSessionSnapshot> {
    try {
      await this.sock?.logout();
    } catch {
      // ignore — session may already be invalid
    }
    this.sock = null;
    this.snapshot = {
      status: "disconnected",
      qrDataUrl: null,
      phone: null,
      pushName: null,
      lastError: null,
    };
    return this.getSnapshot();
  }

  async sendDocument(opts: {
    phoneDigits: string;
    pdf: Buffer | Uint8Array;
    filename: string;
    caption: string;
  }): Promise<void> {
    if (!this.sock || this.snapshot.status !== "connected") {
      throw new Error("WhatsApp is not connected. Scan QR code first.");
    }

    const jid = phoneToWhatsAppJid(opts.phoneDigits);
    const buffer = Buffer.isBuffer(opts.pdf) ? opts.pdf : Buffer.from(opts.pdf);

    await this.sock.sendMessage(jid, {
      document: buffer,
      mimetype: "application/pdf",
      fileName: opts.filename,
      caption: opts.caption,
    });
  }

  private async createSocket(): Promise<void> {
    if (this.sock) {
      try {
        this.sock.end(undefined);
      } catch {
        // ignore
      }
      this.sock = null;
    }

    const {
      default: makeWASocket,
      DisconnectReason,
      fetchLatestBaileysVersion,
      useMultiFileAuthState,
    } = await loadBaileys();
    const { Boom } = await import("@hapi/boom");

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const { version } = await fetchLatestBaileysVersion();
    const logger = pino({ level: "silent" });

    const sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      logger,
      browser: ["Codeat Education", "Chrome", "1.0.0"],
      syncFullHistory: false,
      markOnlineOnConnect: false,
    });

    this.sock = sock;

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        try {
          const qrDataUrl = await QRCode.toDataURL(qr, { margin: 1, width: 280 });
          this.snapshot = {
            ...this.snapshot,
            status: "qr",
            qrDataUrl,
            lastError: null,
          };
        } catch (e) {
          this.snapshot.lastError = e instanceof Error ? e.message : "Failed to render QR";
        }
      }

      if (connection === "open") {
        const me = sock.user;
        const phone = me?.id?.split(":")[0]?.split("@")[0] || null;
        this.snapshot = {
          status: "connected",
          qrDataUrl: null,
          phone,
          pushName: me?.name || null,
          lastError: null,
        };
      }

      if (connection === "close") {
        const statusCode = (lastDisconnect?.error as InstanceType<typeof Boom> | undefined)?.output
          ?.statusCode;
        const loggedOut = statusCode === DisconnectReason.loggedOut;
        const message =
          lastDisconnect?.error instanceof Error
            ? lastDisconnect.error.message
            : "WhatsApp connection closed";

        this.sock = null;

        if (loggedOut) {
          this.snapshot = {
            status: "disconnected",
            qrDataUrl: null,
            phone: null,
            pushName: null,
            lastError: "Logged out from WhatsApp",
          };
          return;
        }

        this.snapshot = {
          status: "disconnected",
          qrDataUrl: null,
          phone: this.snapshot.phone,
          pushName: this.snapshot.pushName,
          lastError: message,
        };

        if (!this.starting && statusCode !== DisconnectReason.restartRequired) {
          setTimeout(() => {
            void this.start({ silent: true });
          }, 3000);
        }
      }
    });
  }
}

const globalForWa = globalThis as unknown as { __whatsappService?: WhatsAppService };

export const whatsappService = globalForWa.__whatsappService ?? new WhatsAppService();

if (process.env.NODE_ENV !== "production") {
  globalForWa.__whatsappService = whatsappService;
}
