import en from "./en";
import gu from "./gu";
import type { Locale } from "../types";
import type { Messages } from "./en";

/** Live getters so a language-file update is visible without a stuck copy of the old dictionary. */
export const messages: Record<Locale, Messages> = {
  get en() {
    return en;
  },
  get gu() {
    return gu;
  },
};

export type { Messages } from "./en";
