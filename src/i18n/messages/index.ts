import en from "./en";
import gu from "./gu";
import type { Locale } from "../types";
import type { Messages } from "./en";

export const messages: Record<Locale, Messages> = { en, gu };

export type { Messages } from "./en";
