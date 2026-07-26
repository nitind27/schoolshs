/** Browser-side auth session sync (AppShell / navbar listen for this). */

export const AUTH_CHANGED_EVENT = "shs:auth-changed";

export type AuthChangedDetail = {
  role?: string | null;
  userId?: string | null;
};

export function notifyAuthChanged(detail?: AuthChangedDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(AUTH_CHANGED_EVENT, { detail: detail ?? {} }));
}
