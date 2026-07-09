function read(name: string): string | undefined {
  const value = process.env[name];
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export interface RemoteBrowserConfig {
  enabled: boolean;
  url: string | null;
  label: string;
}

function withNoVncDefaults(input: string): string {
  try {
    const url = new URL(input);
    // If user configured plain vnc.html URL, enforce working defaults.
    if (url.pathname.endsWith("/remote-browser/vnc.html")) {
      if (!url.searchParams.get("autoconnect")) url.searchParams.set("autoconnect", "true");
      if (!url.searchParams.get("host")) url.searchParams.set("host", url.hostname);
      if (!url.searchParams.get("port")) url.searchParams.set("port", url.protocol === "https:" ? "443" : "80");
      if (!url.searchParams.get("path")) url.searchParams.set("path", "remote-browser/websockify");
    }
    return url.toString();
  } catch {
    return input;
  }
}

export function getRemoteBrowserConfig(): RemoteBrowserConfig {
  const raw = read("REMOTE_BROWSER_URL");
  const url = raw ? withNoVncDefaults(raw) : null;
  return {
    enabled: Boolean(url),
    url,
    label: read("REMOTE_BROWSER_LABEL") || "Open VPS Browser",
  };
}
