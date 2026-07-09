/** Shared headless detection for Playwright automation worker */
export function isAutomationHeadless(): boolean {
  const isLinux = process.platform === "linux";
  const hasDisplay = Boolean(process.env.DISPLAY || process.env.WAYLAND_DISPLAY);
  const forceHeadless = process.env.AUTOMATION_HEADLESS === "1";
  return forceHeadless || (isLinux && !hasDisplay);
}

export const VPS_LOGIN_HELP =
  "VPS par browser dikhane ke liye: sudo apt install -y xvfb && xvfb-run -a npm start. " +
  "Playwright fix: npm run playwright:setup";
