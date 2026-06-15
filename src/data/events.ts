export type EventSlug = "pink-floyd-2026";

export type EventRecord = {
  slug: EventSlug;
  heroImage: string;
  cardImage: string;
  featured: boolean;
};

export const events: EventRecord[] = [
  {
    slug: "pink-floyd-2026",
    heroImage: "/images/bg-musica.webp",
    cardImage: "/images/bg-musica.webp",
    featured: true,
  },
];

export function getEventBySlug(slug: string): EventRecord | undefined {
  return events.find((event) => event.slug === slug);
}

export function getFeaturedEvent(): EventRecord {
  const featured = events.find((event) => event.featured);
  if (!featured) throw new Error("No featured event configured.");
  return featured;
}
