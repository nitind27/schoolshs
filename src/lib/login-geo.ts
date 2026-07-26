import type { NextRequest } from "next/server";
import { getClientIp } from "@/lib/login-security";

export type LoginGeoInput = {
  latitude?: number | null;
  longitude?: number | null;
  accuracyM?: number | null;
};

export type LoginContext = {
  ip: string;
  latitude: number | null;
  longitude: number | null;
  accuracyM: number | null;
  userAgent: string | null;
  source: "web" | "mobile";
  geoSource: "browser" | "ip" | "cloudflare" | "unknown";
  city: string | null;
  region: string | null;
  country: string | null;
};

function parseCoord(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  return n;
}

function clampLat(n: number | null): number | null {
  if (n === null) return null;
  if (n < -90 || n > 90) return null;
  return Math.round(n * 1e6) / 1e6;
}

function clampLon(n: number | null): number | null {
  if (n === null) return null;
  if (n < -180 || n > 180) return null;
  return Math.round(n * 1e6) / 1e6;
}

function isPrivateOrLocalIp(ip: string): boolean {
  if (!ip || ip === "unknown") return true;
  if (ip === "::1" || ip === "127.0.0.1") return true;
  if (ip.startsWith("10.")) return true;
  if (ip.startsWith("192.168.")) return true;
  if (ip.startsWith("172.")) {
    const second = Number(ip.split(".")[1]);
    if (second >= 16 && second <= 31) return true;
  }
  return false;
}

async function lookupIpGeo(ip: string): Promise<{
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  region: string | null;
  country: string | null;
} | null> {
  if (isPrivateOrLocalIp(ip)) return null;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 1800);
    const res = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`, {
      signal: ctrl.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, unknown>;
    if (data.error) return null;
    return {
      latitude: clampLat(parseCoord(data.latitude)),
      longitude: clampLon(parseCoord(data.longitude)),
      city: data.city ? String(data.city).slice(0, 120) : null,
      region: data.region ? String(data.region).slice(0, 120) : null,
      country: data.country_name
        ? String(data.country_name).slice(0, 120)
        : data.country
          ? String(data.country).slice(0, 120)
          : null,
    };
  } catch {
    return null;
  }
}

/** Build login context from request + optional browser/mobile coords. */
export async function buildLoginContext(
  request: NextRequest,
  body: Record<string, unknown> | null | undefined,
  source: "web" | "mobile" = "web",
): Promise<LoginContext> {
  const ip = getClientIp(request);
  const userAgent = request.headers.get("user-agent")?.slice(0, 500) || null;

  const cfLat = clampLat(parseCoord(request.headers.get("cf-iplatitude")));
  const cfLon = clampLon(parseCoord(request.headers.get("cf-iplongitude")));
  const cfCity = request.headers.get("cf-ipcity");
  const cfCountry = request.headers.get("cf-ipcountry");

  const browserLat = clampLat(parseCoord(body?.latitude ?? body?.lat));
  const browserLon = clampLon(parseCoord(body?.longitude ?? body?.lon ?? body?.lng));
  const accuracyM = parseCoord(body?.accuracyM ?? body?.accuracy);

  let latitude = browserLat;
  let longitude = browserLon;
  let geoSource: LoginContext["geoSource"] =
    browserLat != null && browserLon != null ? "browser" : "unknown";
  let city: string | null = null;
  let region: string | null = null;
  let country: string | null = null;

  if (latitude == null || longitude == null) {
    if (cfLat != null && cfLon != null) {
      latitude = cfLat;
      longitude = cfLon;
      geoSource = "cloudflare";
      city = cfCity ? cfCity.slice(0, 120) : null;
      country = cfCountry ? cfCountry.slice(0, 120) : null;
    } else {
      const ipGeo = await lookupIpGeo(ip);
      if (ipGeo?.latitude != null && ipGeo?.longitude != null) {
        latitude = ipGeo.latitude;
        longitude = ipGeo.longitude;
        geoSource = "ip";
        city = ipGeo.city;
        region = ipGeo.region;
        country = ipGeo.country;
      }
    }
  }

  return {
    ip,
    latitude,
    longitude,
    accuracyM: accuracyM != null && accuracyM >= 0 ? Math.round(accuracyM) : null,
    userAgent,
    source,
    geoSource,
    city,
    region,
    country,
  };
}
