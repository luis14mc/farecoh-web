export type Artist = {
  name: string;
  role: string;
  description: string;
};

export type ProgramItem = {
  time: string;
  title: string;
  description: string;
};

export type Event = {
  slug: string;
  name: string;
  eyebrow: string;
  dateLabel: string;
  venue: string;
  city: string;
  shortDescription: string;
  description: string;
  donationGoal: string;
  heroImageAlt: string;
  programs: ProgramItem[];
  artists: Artist[];
};

export const events: Event[] = [
  {
    slug: "pink-floyd-2026",
    name: "Pink Floyd Symphonic Experience",
    eyebrow: "FARECOH presenta",
    dateLabel: "18 abril 2026",
    venue: "Auditorio Nacional",
    city: "Tegucigalpa, Honduras",
    shortDescription:
      "Una noche inmersiva de rock sinfonico, visuales prismáticos y recaudación solidaria para los programas de FARECOH.",
    description:
      "FARECOH reúne música en vivo, arte visual y comunidad en una producción premium inspirada en el universo sonoro de Pink Floyd. Cada boleto impulsa iniciativas culturales y sociales, con una experiencia preparada para audiencias que buscan algo más que un concierto.",
    donationGoal: "Apoyar programas culturales, becas artísticas y experiencias comunitarias.",
    heroImageAlt: "Prisma luminoso sobre un escenario oscuro con humo escénico",
    programs: [
      {
        time: "06:00 PM",
        title: "Apertura de puertas",
        description: "Ingreso escalonado, ambientación audiovisual y bienvenida de FARECOH.",
      },
      {
        time: "07:15 PM",
        title: "Preludio visual",
        description: "Secuencia de luces, humo y narrativas prismáticas para iniciar la experiencia.",
      },
      {
        time: "08:00 PM",
        title: "Concierto principal",
        description: "Interpretación sinfónica y progresiva con banda, ensamble vocal y visuales inmersivos.",
      },
      {
        time: "10:00 PM",
        title: "Cierre solidario",
        description: "Mensaje institucional, agradecimientos y llamado a donación para proyectos FARECOH.",
      },
    ],
    artists: [
      {
        name: "Ensamble Prisma",
        role: "Banda principal",
        description: "Músicos de rock progresivo con arreglos fieles, expresivos y de gran formato.",
      },
      {
        name: "Orquesta Invitada",
        role: "Sección sinfónica",
        description: "Cuerdas, metales y percusión para elevar los pasajes más cinematográficos.",
      },
      {
        name: "Coro Eclipse",
        role: "Voces",
        description: "Texturas corales y armonías atmosféricas para los momentos más expansivos.",
      },
      {
        name: "Colectivo Spectrum",
        role: "Visuales",
        description: "Diseño de luz, proyección y humo escénico sincronizado con la música.",
      },
    ],
  },
];

export function getEventBySlug(slug: string) {
  return events.find((event) => event.slug === slug);
}
