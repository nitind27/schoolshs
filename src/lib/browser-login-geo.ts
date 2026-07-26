/** Non-blocking browser geolocation for login audit (permission optional). */
export type BrowserLoginGeo = {
  latitude?: number;
  longitude?: number;
  accuracyM?: number;
};

export function getBrowserLoginGeo(timeoutMs = 2200): Promise<BrowserLoginGeo> {
  if (typeof window === "undefined" || !navigator.geolocation) {
    return Promise.resolve({});
  }

  return new Promise((resolve) => {
    const timer = window.setTimeout(() => resolve({}), timeoutMs);
    try {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          window.clearTimeout(timer);
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracyM:
              typeof pos.coords.accuracy === "number" ? Math.round(pos.coords.accuracy) : undefined,
          });
        },
        () => {
          window.clearTimeout(timer);
          resolve({});
        },
        {
          enableHighAccuracy: false,
          timeout: timeoutMs,
          maximumAge: 5 * 60 * 1000,
        },
      );
    } catch {
      window.clearTimeout(timer);
      resolve({});
    }
  });
}
