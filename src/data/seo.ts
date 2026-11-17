/**
 * SEO central del sitio público: títulos, descripciones, imágenes y datos estructurados.
 *
 * Reglas:
 * - Títulos de 50–60 caracteres, con la palabra clave al inicio y la marca al final.
 * - Descripciones de 140–160 caracteres, con verbo de acción y ubicación (Honduras).
 * - Un solo JSON-LD de organización (@id estable) referenciado desde las demás entidades.
 */
import { FARECOH_CONTACT, FARECOH_HISTORY, FARECOH_METADATA, FARECOH_NARRATIVE, FARECOH_PROGRAMS } from "@/data/farecoh";
import { absoluteUrl, truncateDescription } from "@/lib/seo";

export const SEO_DEFAULT_IMAGE = "/images/og/farecoh-og.jpg";
export const SEO_IMAGE_WIDTH = 1200;
export const SEO_IMAGE_HEIGHT = 630;

export const ORG_ID = absoluteUrl("/#organizacion");
export const WEBSITE_ID = absoluteUrl("/#sitio");

export interface PageSeo {
  readonly title: string;
  readonly description: string;
  readonly path: string;
  readonly image?: string;
  readonly imageAlt?: string;
}

export const seoPages = {
  home: {
    title: "FARECOH | Coros y Orquestas Infantiles y Juveniles de Honduras",
    description:
      "Fundación hondureña que transforma vidas con música, arte y educación: coros, orquestas y escuelas de música para niñez y juventud. Conoce y apoya FARECOH.",
    path: "/",
    imageAlt: "Orquesta juvenil de FARECOH en concierto",
  },
  about: {
    title: "Sobre FARECOH: historia, misión y visión desde 2013",
    description:
      "Desde 2013 FARECOH usa la música y las artes para prevenir la violencia y formar a la niñez de Choluteca, Tela y Francisco Morazán. Conoce nuestra historia.",
    path: "/sobre-nosotros",
    imageAlt: "Integrantes de FARECOH en un encuentro institucional",
  },
  programs: {
    title: "Programas de música y arte para niños y jóvenes | FARECOH",
    description:
      "Coros y orquestas, escuelas de música comunitarias, artes, cultura de paz, intercambios y fortalecimiento familiar: 6 programas de FARECOH en Honduras.",
    path: "/programas",
    imageAlt: "Estudiantes de violín de FARECOH en clase",
  },
  board: {
    title: "Junta Directiva de FARECOH | Gobierno de la fundación",
    description:
      "Conoce a la Junta Directiva de FARECOH: personas voluntarias que guían a la fundación de coros, orquestas y artes educativas de Honduras.",
    path: "/junta-directiva",
  },
  partners: {
    title: "Alianzas y cooperación internacional | FARECOH Honduras",
    description:
      "OEA, AMEXCID y redes artísticas internacionales acompañan a FARECOH. Descubre cómo tu organización puede aliarse por la niñez y juventud de Honduras.",
    path: "/alianzas",
  },
  events: {
    title: "Conciertos y eventos benéficos en Honduras | FARECOH",
    description:
      "Cartelera de conciertos de FARECOH. Cada boleto financia becas, instrumentos y programas de música para niños y jóvenes de Honduras. Reserva tu entrada.",
    path: "/eventos",
    imageAlt: "Concierto de coros y orquestas de FARECOH",
  },
  ticketLookup: {
    title: "Consulta de boleto | FARECOH",
    description: "Consulta el estado de un boleto FARECOH. Esta página no valida el ingreso al evento.",
    path: "/t",
  },
  notFound: {
    title: "Página no encontrada | FARECOH",
    description: "La página que buscas no existe o fue movida. Vuelve al inicio de FARECOH.",
    path: "/404",
  },
} as const satisfies Record<string, PageSeo>;

/** Organización (ONG) — se publica una vez en cada página pública. */
export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "NGO",
    "@id": ORG_ID,
    name: FARECOH_METADATA.acronym,
    alternateName: FARECOH_METADATA.fullName,
    legalName: FARECOH_METADATA.fullName,
    url: absoluteUrl("/"),
    logo: {
      "@type": "ImageObject",
      url: absoluteUrl("/images/Logos/logo.png"),
    },
    image: absoluteUrl(SEO_DEFAULT_IMAGE),
    description: FARECOH_NARRATIVE.about,
    slogan: FARECOH_METADATA.tagline,
    foundingDate: String(FARECOH_METADATA.established),
    nonprofitStatus: "https://schema.org/NonprofitType",
    email: FARECOH_CONTACT.email,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Tegucigalpa",
      addressRegion: "Francisco Morazán",
      addressCountry: "HN",
    },
    areaServed: [
      { "@type": "Country", name: "Honduras" },
      ...FARECOH_HISTORY.regions.map((name) => ({ "@type": "AdministrativeArea", name })),
    ],
    knowsAbout: ["Educación musical", "Coros infantiles", "Orquestas juveniles", "Prevención de la violencia", "Cultura de paz", "Artes"],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "atención general",
      email: FARECOH_CONTACT.email,
      areaServed: "HN",
      availableLanguage: ["es"],
    },
  };
}

export function webSiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    name: FARECOH_METADATA.acronym,
    alternateName: FARECOH_METADATA.fullName,
    url: absoluteUrl("/"),
    inLanguage: "es-419",
    publisher: { "@id": ORG_ID },
  };
}

export function breadcrumbJsonLd(items: ReadonlyArray<{ name: string; path: string }>) {
  const all = [{ name: "Inicio", path: "/" }, ...items];
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: all.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function aboutPageJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    url: absoluteUrl(seoPages.about.path),
    name: seoPages.about.title,
    description: seoPages.about.description,
    inLanguage: "es-419",
    isPartOf: { "@id": WEBSITE_ID },
    about: { "@id": ORG_ID },
  };
}

export function programsJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Programas de FARECOH",
    numberOfItems: FARECOH_PROGRAMS.length,
    itemListElement: FARECOH_PROGRAMS.map((program, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: absoluteUrl(`/programas#${program.id}`),
      name: program.title,
      description: program.description,
    })),
  };
}

export interface SeoEvent {
  slug: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  event_date: string;
  event_time: string;
  location: string;
  city?: string | null;
  ticket_price: number;
  capacity: number;
  sold?: number;
  status: string;
  sales_open?: boolean;
  image_url?: string | null;
}

/** Convierte "7:00 p. m." / "19:30" a "19:00" para startDate ISO. */
export function eventStartIso(date: string, time: string): string {
  const match = time.toLowerCase().replace(/\s|\./g, "").match(/^(\d{1,2})(?::(\d{2}))?(am|pm)?/);
  if (!match) return date;
  let hour = Number(match[1]);
  const minute = match[2] ?? "00";
  if (match[3] === "pm" && hour < 12) hour += 12;
  if (match[3] === "am" && hour === 12) hour = 0;
  return `${date}T${String(hour).padStart(2, "0")}:${minute}:00-06:00`;
}

export function eventImage(event: Pick<SeoEvent, "slug" | "image_url">): string {
  return event.image_url ?? (event.slug === "pink-floyd" ? "/images/evento/hero.webp" : SEO_DEFAULT_IMAGE);
}

export function eventDescription(event: SeoEvent, dateLabel: string): string {
  const base = event.description ?? event.subtitle ?? "Concierto benéfico de FARECOH.";
  return truncateDescription(`${base} ${dateLabel}, ${event.event_time} en ${event.location}. Tu entrada apoya la formación artística de la niñez hondureña.`);
}

export function musicEventJsonLd(event: SeoEvent) {
  const url = absoluteUrl(`/eventos/${event.slug}`);
  const statusMap: Record<string, string> = {
    cancelled: "https://schema.org/EventCancelled",
  };
  const soldOut = event.sold !== undefined && event.sold >= event.capacity;
  return {
    "@context": "https://schema.org",
    "@type": "MusicEvent",
    "@id": `${url}#evento`,
    name: event.title,
    description: event.description ?? event.subtitle ?? `Concierto benéfico de ${FARECOH_METADATA.acronym}.`,
    url,
    image: [absoluteUrl(eventImage(event))],
    startDate: eventStartIso(event.event_date, event.event_time),
    eventStatus: statusMap[event.status] ?? "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    inLanguage: "es",
    isAccessibleForFree: event.ticket_price === 0,
    location: {
      "@type": "Place",
      name: event.location,
      address: {
        "@type": "PostalAddress",
        addressLocality: event.city ?? "Tegucigalpa",
        addressCountry: "HN",
      },
    },
    organizer: { "@id": ORG_ID },
    performer: { "@type": "MusicGroup", name: "Coros y Orquestas FARECOH" },
    offers: {
      "@type": "Offer",
      url: event.sales_open ? `${url}/boletos` : url,
      price: String(event.ticket_price),
      priceCurrency: "HNL",
      availability: soldOut
        ? "https://schema.org/SoldOut"
        : event.sales_open
          ? "https://schema.org/InStock"
          : "https://schema.org/PreOrder",
    },
  };
}

export function eventListJsonLd(events: ReadonlyArray<Pick<SeoEvent, "slug" | "title">>) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Eventos de FARECOH",
    numberOfItems: events.length,
    itemListElement: events.map((event, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: absoluteUrl(`/eventos/${event.slug}`),
      name: event.title,
    })),
  };
}
