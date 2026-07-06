import { useCallback, useSyncExternalStore } from "react";
import type { Locale } from "@/lib/i18n";
import { t as translate } from "@/lib/i18n";

let currentLocale: Locale = "en";
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useLocale() {
  const locale = useSyncExternalStore(
    subscribe,
    () => currentLocale,
    () => currentLocale,
  );
  const setLocale = useCallback((l: Locale) => {
    currentLocale = l;
    listeners.forEach((cb) => cb());
    if (typeof document !== "undefined") {
      document.documentElement.lang = l;
      document.documentElement.dir = l === "ar" ? "rtl" : "ltr";
    }
  }, []);
  const t = useCallback((key: string) => translate(locale, key), [locale]);
  return { locale, setLocale, t };
}
