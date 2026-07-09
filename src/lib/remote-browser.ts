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

export function getRemoteBrowserConfig(): RemoteBrowserConfig {
  const url = read("REMOTE_BROWSER_URL") || null;
  return {
    enabled: Boolean(url),
    url,
    label: read("REMOTE_BROWSER_LABEL") || "Open VPS Browser",
  };
}
