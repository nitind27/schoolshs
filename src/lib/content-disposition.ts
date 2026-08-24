/** RFC 5987 Content-Disposition for downloads (ASCII fallback + UTF-8 filename*). */
export function attachmentDisposition(filename: string) {
  const ascii = filename.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_") || "download";
  const encoded = encodeURIComponent(filename).replace(/['()]/g, (ch) => `%${ch.charCodeAt(0).toString(16).toUpperCase()}`);
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}
