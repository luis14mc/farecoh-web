export interface ProgramItem {
  readonly id: string;
  readonly index?: string;
  readonly title: string;
  readonly category: string;
  readonly description: string;
  readonly badge: string;
  readonly tag?: string;
  readonly discipline?: "music" | "inclusion" | "early-childhood" | "visual-arts";
}

export interface BoardMember {
  readonly name: string;
  readonly role: string;
}

export interface StrategicPartner {
  readonly name: string;
  readonly entity?: string;
  readonly type?: string;
  readonly region?: "multilateral" | "americas" | "europe" | "central-america";
}

export interface NarrativeContent {
  readonly about: string;
  readonly mission: string;
  readonly vision: string;
}

export interface SiteMetadata {
  readonly acronym: string;
  readonly fullName: string;
  readonly tagline: string;
  readonly established: number;
  readonly legalSeat: string;
}

export interface ContactInfo {
  readonly email: string;
  readonly phone: string;
  readonly postalAddress: string;
  readonly social: ReadonlyArray<{
    readonly label: string;
    readonly href: string;
  }>;
}

export const FARECOH_METADATA: SiteMetadata = {
  acronym: "FARECOH",
  fullName: "Fundación Artes Educativas, Coros y Orquestas de Honduras",
  tagline: "El arte como pedagogía de prevención y cohesión comunitaria.",
  established: 2003,
  legalSeat: "Tegucigalpa, Honduras",
};

export const FARECOH_NARRATIVE: NarrativeContent = {
  about:
    "Educamos por medio de programas de prevención artística a la niñez y juventud, fortaleciendo la conducta y habilidades para la vida de un ciudadano integral: el «ser social solidario», forjado bajo valores humanistas y derechos fundamentales al servicio del país.",
  mission:
    "Fundación al servicio de la sociedad hondureña, con excelencia en el desarrollo de las artes que coadyuven al desarrollo integral del ser humano, insertándolo a la comunidad por medio del intercambio, la prevención, la cooperación y la identidad nacional.",
  vision:
    "Ser una fundación líder y modelo de excelencia en Honduras, dedicada al rescate pedagógico y ocupacional como modelo de prevención de la violencia para la inclusión social.",
};

export const FARECOH_PROGRAMS: readonly ProgramItem[] = [
  {
    id: "musica",
    index: "01",
    tag: "01",
    title: "Coros y Orquestas Infantiles-Juveniles",
    category: "Programa Académico Musical",
    description:
      "Proceso formativo colectivo e inclusivo donde el rigor instrumental y coral edifica convivencia pacífica y desarrollo integral.",
    badge: "Práctica Sinfónica",
    discipline: "music",
  },
  {
    id: "manos-blancas",
    index: "02",
    tag: "02",
    title: "Coro de Manos Blancas",
    category: "Educación Especial y Accesibilidad",
    description:
      "Integración plena de niños, jóvenes y adultos con capacidades físicas comprometidas y necesidades educativas especiales a través del arte.",
    badge: "Inclusión Radical",
    discipline: "inclusion",
  },
  {
    id: "estimulacion",
    index: "03",
    tag: "03",
    title: "Estimulación Temprana",
    category: "Primera Infancia",
    description:
      "Desarrollo cognitivo, motriz y socioafectivo mediante estimulación sonora estructurada, entendiendo al infante como un ser humano completo.",
    badge: "Neurodesarrollo",
    discipline: "early-childhood",
  },
  {
    id: "artes-visuales",
    index: "04",
    tag: "04",
    title: "Pintura y Formación Visual",
    category: "Artes Visuales",
    description:
      "Despertar de la creatividad y la agudeza perceptiva, proveyendo al estudiante herramientas plásticas para reflexionar sobre su entorno.",
    badge: "Expresión Plástica",
    discipline: "visual-arts",
  },
];

export interface MobilityProgram {
  readonly title: string;
  readonly description: string;
  readonly badge: string;
  readonly destinations: ReadonlyArray<{
    readonly institution: string;
    readonly country: string;
  }>;
}

export const FARECOH_MOBILITY: MobilityProgram = {
  title: "Intercambios Culturales y Becas de Verano",
  description:
    "Oportunidades de inmersión y becas internacionales en conservatorios e instituciones aliadas para estudiantes destacados y voluntarios de la fundación.",
  badge: "Proyección Internacional",
  destinations: [
    { institution: "International Music Camp", country: "Estados Unidos" },
    { institution: "Wanny Angerer in Moving Cultures", country: "Alemania" },
    { institution: "Conservatorio Nacional", country: "México" },
  ],
};

export const FARECOH_BOARD: readonly BoardMember[] = [
  { name: "Vivian Alvarado", role: "Presidenta" },
  { name: "Wanayran Alvarez", role: "Vicepresidenta" },
  { name: "Christian Anariba", role: "Secretario" },
  { name: "Luis E. Godoy", role: "Tesorero" },
  { name: "Norma Pineda", role: "Vocal I" },
  { name: "Elena Figueroa", role: "Vocal II" },
  { name: "Cinthya Thomas", role: "Vocal III" },
];

export const FARECOH_PARTNERS: readonly StrategicPartner[] = [
  {
    name: "Organización de los Estados Americanos",
    entity: "OEA · Cooperación Multilateral",
    type: "Organismo Multilateral",
    region: "multilateral",
  },
  {
    name: "AMEXCID",
    entity: "Agencia Mexicana de Cooperación Internacional para el Desarrollo",
    type: "Cooperación Internacional",
    region: "americas",
  },
  {
    name: "Wanny Angerer in Moving Cultures",
    entity: "Red Artística Internacional",
    type: "Red Cultural Global",
    region: "europe",
  },
  {
    name: "International Music Camp",
    entity: "Formación Musical Global",
    type: "Educación Musical Internacional",
    region: "americas",
  },
  {
    name: "Arpas en Armonía",
    entity: "Desarrollo Cultural",
    type: "Alianza Cultural",
    region: "central-america",
  },
];

export const FARECOH_CONTACT: ContactInfo = {
  email: "info@farecoh.org",
  phone: "+504 2233-0000",
  postalAddress: "Tegucigalpa, Francisco Morazán, Honduras",
  social: [
    { label: "Correo electrónico", href: "mailto:info@farecoh.org" },
  ],
};

export interface InstitutionalNavItem {
  readonly label: string;
  readonly href: string;
  readonly description?: string;
}

export const INSTITUTIONAL_NAV: readonly InstitutionalNavItem[] = [
  { label: "Nosotros", href: "/sobre-nosotros" },
  { label: "Programas", href: "/programas" },
  { label: "Intercambios", href: "/programas#intercambios" },
  { label: "Junta Directiva", href: "/junta-directiva" },
  { label: "Alianzas", href: "/alianzas" },
];

export interface InstitutionalStat {
  readonly value: string;
  readonly label: string;
  readonly caption: string;
}

export const INSTITUTIONAL_STATS: readonly InstitutionalStat[] = [
  {
    value: "+20",
    label: "Años de trayectoria",
    caption: "al servicio de la formación artística en Honduras",
  },
  {
    value: "04",
    label: "Programas activos",
    caption: "música, inclusión, primera infancia y artes visuales",
  },
  {
    value: "05",
    label: "Aliados estratégicos",
    caption: "cooperación multilateral y redes internacionales",
  },
];

// Compatibilidad hacia atrás
export const FARECOH_DATA = {
  identity: {
    acronym: FARECOH_METADATA.acronym,
    fullName: FARECOH_METADATA.fullName,
    heroHeadline: "Transformación social a través de la armonía y las artes.",
    heroSubheadline: FARECOH_NARRATIVE.about,
    mission: FARECOH_NARRATIVE.mission,
    vision: FARECOH_NARRATIVE.vision,
  },
  programs: FARECOH_PROGRAMS,
  initiatives: {
    title: FARECOH_MOBILITY.title,
    description: FARECOH_MOBILITY.description,
    badge: FARECOH_MOBILITY.badge,
  },
  board: FARECOH_BOARD,
  partners: FARECOH_PARTNERS,
};
