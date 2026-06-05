import { ca } from "./ca";
import { en } from "./en";
import { es } from "./es";
import type { AppMessages, LocaleCode } from "../types";

export const catalogs: Record<LocaleCode, AppMessages> = {
  ca,
  en,
  es,
};
