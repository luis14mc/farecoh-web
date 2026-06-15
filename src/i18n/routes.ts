import type { Lang, RouteKey } from "./types";

export const routes: Record<Lang, Record<RouteKey, string>> = {
  es: {
    home: "/",
    about: "/nosotros",
    programs: "/programas",
    events: "/eventos",
    donate: "/donar",
    pinkFloyd: "/eventos/pink-floyd-2026",
  },
  en: {
    home: "/en",
    about: "/en/about",
    programs: "/en/programs",
    events: "/en/events",
    donate: "/en/donate",
    pinkFloyd: "/en/events/pink-floyd-2026",
  },
};

const pathToRouteKey = new Map<string, RouteKey>([
  ["/", "home"],
  ["/en", "home"],
  ["/nosotros", "about"],
  ["/en/about", "about"],
  ["/programas", "programs"],
  ["/en/programs", "programs"],
  ["/eventos", "events"],
  ["/en/events", "events"],
  ["/donar", "donate"],
  ["/en/donate", "donate"],
  ["/eventos/pink-floyd-2026", "pinkFloyd"],
  ["/en/events/pink-floyd-2026", "pinkFloyd"],
]);

export function getLangFromPath(pathname: string): Lang {
  return pathname === "/en" || pathname.startsWith("/en/") ? "en" : "es";
}

export function getLocalizedPath(lang: Lang, key: RouteKey): string {
  return routes[lang][key];
}

export function getAlternateLang(lang: Lang): Lang {
  return lang === "es" ? "en" : "es";
}

export function getRouteKeyFromPath(pathname: string): RouteKey | undefined {
  const normalized = pathname.replace(/\/$/, "") || "/";
  return pathToRouteKey.get(normalized);
}

export function getAlternateLangPath(pathname: string): string {
  const normalized = pathname.replace(/\/$/, "") || "/";
  const routeKey = pathToRouteKey.get(normalized);

  if (routeKey) {
    return getLocalizedPath(getAlternateLang(getLangFromPath(normalized)), routeKey);
  }

  return getLocalizedPath(getAlternateLang(getLangFromPath(normalized)), "home");
}
