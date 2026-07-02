import { site } from "@/data/site";
import { pinkFloydEvent } from "@/data/event";
import { homeHero } from "@/data/home";
import { eventPage } from "@/data/event-page";
import { absoluteUrl, truncateDescription } from "@/lib/seo";
import { PINK_FLOYD_EVENT_ISO_JSON_LD } from "@/lib/events";

export const seoPages = {
  home: {
    title: `FARECOH | ${truncateDescription(homeHero.title, 42)}`,
    description: truncateDescription(
      `${site.fullName.es}. ${homeHero.subtitle} Conoce el tributo a Pink Floyd y apoya programas artísticos en Honduras.`,
    ),
    image: "/images/farecoh-hero-orchestra.webp",
    path: "/",
  },
  event: {
    title: `${pinkFloydEvent.name} | Concierto benéfico FARECOH`,
    description: truncateDescription(
      `${eventPage.hero.tagline} ${pinkFloydEvent.dateDisplay}, ${pinkFloydEvent.venue}, ${pinkFloydEvent.city}.`,
    ),
    image: "/images/evento/hero.webp",
    path: "/eventos/pink-floyd",
  },
  tickets: {
    title: `Reservar boletos | ${pinkFloydEvent.name}`,
    description: truncateDescription(
      `Reserve boletos para ${pinkFloydEvent.name}. ${pinkFloydEvent.dateDisplay} a las ${pinkFloydEvent.time}, ${pinkFloydEvent.venue}, ${pinkFloydEvent.city}. Aporte solidario L. ${pinkFloydEvent.ticket_price}.`,
    ),
    image: "/images/evento/106.webp",
    path: "/eventos/pink-floyd/boletos",
  },
  ticketLookup: {
    title: "Consulta de boleto | FARECOH",
    description: "Consulta el estado de un boleto FARECOH. Esta página no valida el ingreso al evento.",
    path: "/t",
  },
} as const;

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "NGO",
    name: site.name,
    legalName: site.fullName.es,
    url: absoluteUrl("/"),
    logo: absoluteUrl("/images/Logos/logo.png"),
    email: site.email,
    description: site.tagline.es,
    areaServed: {
      "@type": "Country",
      name: "Honduras",
    },
  };
}

export function webSiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: site.name,
    url: absoluteUrl("/"),
    inLanguage: "es-419",
    publisher: {
      "@type": "Organization",
      name: site.name,
      url: absoluteUrl("/"),
    },
  };
}

export function musicEventJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "MusicEvent",
    name: pinkFloydEvent.name,
    description: eventPage.hero.tagline,
    startDate: PINK_FLOYD_EVENT_ISO_JSON_LD,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    image: [absoluteUrl("/images/evento/hero.webp"), absoluteUrl("/images/evento/106.webp")],
    location: {
      "@type": "Place",
      name: pinkFloydEvent.venue,
      address: {
        "@type": "PostalAddress",
        addressLocality: pinkFloydEvent.city,
        addressCountry: "HN",
      },
    },
    organizer: {
      "@type": "Organization",
      name: site.name,
      url: absoluteUrl("/"),
    },
    offers: {
      "@type": "Offer",
      url: absoluteUrl("/eventos/pink-floyd/boletos"),
      price: String(pinkFloydEvent.ticket_price),
      priceCurrency: "HNL",
      availability: "https://schema.org/InStock",
      validFrom: "2026-01-01",
    },
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}
