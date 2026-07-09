/** Shared headless detection for Playwright automation worker */
export function isAutomationHeadless(): boolean {
  const isLinux = process.platform === "linux";
  const hasDisplay = Boolean(process.env.DISPLAY || process.env.WAYLAND_DISPLAY);
  const forceHeadless = process.env.AUTOMATION_HEADLESS === "1";
  return forceHeadless || (isLinux && !hasDisplay);
}

export const VPS_LOGIN_HELP =
  "VPS par: sudo apt install -y xvfb && pm2 restart school-shs (xvfb-run ke saath). " +
  "Playwright: npm run playwright:setup";
