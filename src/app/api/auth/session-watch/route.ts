import { getSession } from "@/lib/auth";
import { isSessionActive } from "@/lib/user-sessions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Server-Sent Events — other devices learn immediately when
 * "Sign out other devices" revokes their session.
 */
export async function GET() {
  const session = await getSession();
  if (!session?.sid) {
    return new Response(JSON.stringify({ ok: false, reason: "no_session" }), {
      status: 401,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }

  const sid = session.sid;
  const encoder = new TextEncoder();

  let closed = false;
  let timer: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const send = (payload: Record<string, unknown>) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        } catch {
          closed = true;
        }
      };

      send({ ok: true, t: Date.now() });

      timer = setInterval(() => {
        void (async () => {
          if (closed) return;
          try {
            const active = await isSessionActive(sid);
            if (!active) {
              send({ ok: false, reason: "revoked", t: Date.now() });
              if (timer) clearInterval(timer);
              timer = null;
              closed = true;
              try {
                controller.close();
              } catch {
                /* ignore */
              }
              return;
            }
            // lightweight heartbeat so proxies keep the stream alive
            send({ ok: true, t: Date.now() });
          } catch {
            /* keep stream; next tick retries */
          }
        })();
      }, 1500);
    },
    cancel() {
      closed = true;
      if (timer) clearInterval(timer);
      timer = null;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
