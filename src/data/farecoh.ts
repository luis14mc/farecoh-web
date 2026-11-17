export type ProgramDiscipline = "music" | "community" | "arts" | "peace" | "exchange" | "family";

export interface ProgramItem {
  readonly id: string;
  readonly index?: string;
  readonly title: string;
  readonly category: string;
  readonly description: string;
  readonly badge: string;
  readonly tag?: string;
  readonly discipline?: ProgramDiscipline;
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
  tagline: "Transformando vidas a través del arte, la educación y la esperanza.",
  established: 2013,
  legalSeat: "Tegucigalpa, Honduras",
};

export const FARECOH_NARRATIVE: NarrativeContent = {
  about:
    "La Fundación Artes Educativas, Coros y Orquestas de Honduras (FARECOH) es una organización sin fines de lucro que utiliza la música, las artes y la educación como herramientas de transformación social, promoviendo la formación integral de la niñez y juventud hondureña para construir comunidades más seguras, inclusivas y resilientes.",
  mission:
    "Formar integralmente a niños, niñas y jóvenes mediante programas artísticos, educativos y culturales que fortalezcan valores, desarrollen talentos y contribuyan a la construcción de una sociedad más justa, pacífica y solidaria.",
  vision:
    "Ser la organización líder en Honduras y referente regional en el uso de las artes como herramienta de desarrollo humano, prevención de la violencia y transformación social, generando oportunidades para las nuevas generaciones y fortaleciendo el tejido social de nuestras comunidades.",
};

/** Contexto y propósito (texto institucional). */
export const FARECOH_CONTEXT = {
  problem:
    "En Honduras, miles de niños, niñas y jóvenes enfrentan diariamente desafíos relacionados con la violencia, la exclusión social, la pobreza y la falta de oportunidades. En FARECOH creemos que el arte puede cambiar esta realidad.",
  purpose:
    "Desde nuestra creación, hemos trabajado para que cada niño y joven descubra su potencial, fortalezca sus valores y encuentre en el arte un camino hacia una vida digna, productiva y llena de oportunidades.",
  quote:
    "Donde otros ven vulnerabilidad, nosotros vemos talento. Donde existe riesgo, sembramos esperanza. Donde hay silencio, hacemos sonar la música del cambio.",
  pillars: "Arte • Educación • Cultura • Transformación Social",
  closing:
    "Transformando vidas a través del arte. Fortaleciendo comunidades a través de la educación. Construyendo el futuro de Honduras a través de la cultura.",
} as const;

export const FARECOH_PROGRAMS: readonly ProgramItem[] = [
  {
    id: "coros-orquestas",
    index: "01",
    tag: "01",
    title: "Coros y Orquestas Infantiles y Juveniles",
    category: "Formación musical colectiva",
    description:
      "Formación musical colectiva que promueve disciplina, liderazgo, trabajo en equipo y excelencia artística.",
    badge: "Música",
    discipline: "music",
  },
  {
    id: "escuelas-musica",
    index: "02",
    tag: "02",
    title: "Escuelas de Música Comunitarias",
    category: "Acceso a la educación musical",
    description: "Acceso a educación musical para niños y jóvenes de escasos recursos.",
    badge: "Comunidad",
    discipline: "community",
  },
  {
    id: "artes-transformacion",
    index: "03",
    tag: "03",
    title: "Artes para la Transformación Social",
    category: "Expresión artística",
    description: "Programas de pintura, teatro, danza, literatura y expresión artística.",
    badge: "Artes",
    discipline: "arts",
  },
  {
    id: "cultura-paz",
    index: "04",
    tag: "04",
    title: "Cultura de Paz y Prevención de Violencia",
    category: "Habilidades para la vida",
    description:
      "Espacios seguros que fortalecen habilidades para la vida, convivencia pacífica y resolución positiva de conflictos.",
    badge: "Cultura de paz",
    discipline: "peace",
  },
  {
    id: "intercambios-festivales",
    index: "05",
    tag: "05",
    title: "Intercambios y Festivales Culturales",
    category: "Proyección nacional e internacional",
    description:
      "Oportunidades de crecimiento, aprendizaje y proyección nacional e internacional.",
    badge: "Intercambios",
    discipline: "exchange",
  },
  {
    id: "familia-comunidad",
    index: "06",
    tag: "06",
    title: "Fortalecimiento Familiar y Comunitario",
    category: "Participación ciudadana",
    description:
      "Actividades que promueven la integración familiar y la participación ciudadana.",
    badge: "Familia",
    discipline: "family",
  },
];

/** Contribuciones de impacto (sección "Nuestro Impacto"). */
export const FARECOH_IMPACT = {
  intro:
    "Cada instrumento entregado, cada clase impartida y cada presentación artística representa una oportunidad de transformación.",
  contributions: [
    "Reducir factores de riesgo asociados a la violencia.",
    "Promover la permanencia escolar.",
    "Fortalecer la autoestima y la salud emocional.",
    "Desarrollar liderazgo y habilidades para la vida.",
    "Impulsar la inclusión social.",
    "Rescatar y promover la identidad cultural hondureña.",
    "Crear oportunidades para el desarrollo profesional y artístico.",
  ],
} as const;

export const FARECOH_METHODOLOGY = {
  lead: "Creemos en el poder del aprendizaje colectivo.",
  body:
    "Nuestro modelo se inspira en experiencias internacionales exitosas de educación artística para la transformación social, donde la música y las artes son herramientas para fortalecer valores, disciplina, responsabilidad, empatía y sentido de pertenencia.",
  statement: "No formamos únicamente músicos o artistas.",
  emphasis: "Formamos ciudadanos comprometidos con la paz, la cultura y el desarrollo de Honduras.",
} as const;

export const FARECOH_WHY_SUPPORT = {
  reasons: [
    "Porque invertir en arte es invertir en prevención.",
    "Porque una orquesta puede alejar a un niño de la violencia.",
    "Porque un instrumento puede convertirse en una herramienta de esperanza.",
    "Porque la educación artística transforma vidas y fortalece comunidades.",
  ],
  body:
    "Su apoyo permite ampliar oportunidades para niños, niñas y jóvenes que necesitan espacios seguros para aprender, crecer y construir un futuro mejor.",
  join:
    "Sea parte de una red de personas, empresas, organismos de cooperación y aliados comprometidos con el desarrollo humano y la construcción de una Honduras más segura, inclusiva y llena de oportunidades para su niñez y juventud.",
} as const;

export const FARECOH_HISTORY = {
  title: "Una historia de transformación que comenzó en 2013",
  paragraphs: [
    "En el año 2013 nació un sueño: demostrar que el arte, la música y la educación podían convertirse en herramientas poderosas para cambiar vidas y construir una mejor Honduras.",
    "En un contexto donde miles de niños y jóvenes enfrentaban desafíos relacionados con la violencia, la exclusión social, la pobreza y la falta de oportunidades, un grupo de educadores, músicos, artistas y líderes comunitarios decidió actuar. No bastaba con señalar los problemas; era necesario crear espacios donde la niñez y la juventud pudieran descubrir sus talentos, fortalecer sus valores y encontrar nuevas oportunidades para su futuro.",
    "Así comenzó el camino de FARECOH, la Fundación Artes Educativas, Coros y Orquestas de Honduras. Lo que inició como una iniciativa para acercar la música a niños y jóvenes, pronto se convirtió en un movimiento de transformación social que ha impactado comunidades, centros educativos y familias en distintas regiones del país.",
    "Desde sus primeros ensayos, clases y conciertos, quedó demostrado que la música tiene la capacidad de unir personas, fortalecer la autoestima, fomentar la disciplina y crear sentido de pertenencia. Cada instrumento entregado representaba una oportunidad; cada presentación artística era una muestra de que el talento existe en todos los rincones de Honduras cuando se brindan las condiciones adecuadas para desarrollarlo.",
    "Con el paso de los años, FARECOH amplió su trabajo incorporando programas de formación artística, coros infantiles y juveniles, orquestas, festivales culturales, proyectos de prevención de violencia, liderazgo juvenil, identidad cultural y desarrollo comunitario en Choluteca, Tela y Francisco Morazán. Miles de niños y jóvenes encontraron en el arte una alternativa positiva para ocupar su tiempo, fortalecer sus capacidades y construir un proyecto de vida alejado de los riesgos sociales.",
  ],
  regions: ["Choluteca", "Tela", "Francisco Morazán"],
  closing: "Desde 2013, nuestra historia ha sido escrita por miles de sueños, notas musicales, aprendizajes y oportunidades compartidas. Y apenas estamos comenzando.",
} as const;

export const FARECOH_IMPORTANCE = {
  reasons: [
    "Porque Honduras necesita más oportunidades para su niñez y juventud.",
    "Porque la prevención es más efectiva que la recuperación.",
    "Porque la cultura y las artes son herramientas comprobadas para fortalecer el tejido social y promover la convivencia pacífica.",
    "Porque cada niño que aprende música, arte o cultura desarrolla habilidades que le acompañarán durante toda su vida: disciplina, responsabilidad, trabajo en equipo, liderazgo, creatividad y resiliencia.",
  ],
  body:
    "FARECOH contribuye directamente a la construcción de una sociedad más segura, inclusiva y solidaria, generando espacios donde los jóvenes pueden crecer, aprender y convertirse en agentes de cambio dentro de sus comunidades.",
  investment: [
    "Apoyar a FARECOH significa apostar por el talento, la educación, la cultura y la paz.",
    "Significa creer que un instrumento musical puede convertirse en una herramienta de esperanza.",
    "Significa brindar a un niño la posibilidad de descubrir sus capacidades y desarrollar todo su potencial.",
    "Significa fortalecer comunidades y construir un país donde el arte sea un puente hacia el desarrollo humano.",
  ],
} as const;

/** "¿Por qué apoyar nuestros conciertos?" */
export const FARECOH_CONCERTS = {
  title: "Nuestros conciertos: mucho más que música",
  intro:
    "Los conciertos de FARECOH son mucho más que una presentación artística. Cada evento representa una oportunidad para transformar vidas y fortalecer los programas sociales que benefician a niños, niñas y jóvenes en situación de vulnerabilidad.",
  support:
    "Al asistir, patrocinar o apoyar nuestros conciertos, usted contribuye directamente al sostenimiento de iniciativas de formación musical, artística y humana que promueven la prevención de la violencia, la inclusión social y el desarrollo integral de la niñez y juventud hondureña.",
  funds: [
    { icon: "music", text: "Otorgar becas de formación artística a niños y jóvenes de escasos recursos." },
    { icon: "violin", text: "Adquirir y dar mantenimiento a instrumentos musicales y materiales educativos." },
    { icon: "teacher", text: "Fortalecer los procesos de enseñanza y capacitación de maestros y voluntarios." },
    { icon: "school", text: "Mantener espacios seguros para el aprendizaje, la creatividad y la convivencia." },
    { icon: "sprout", text: "Desarrollar programas comunitarios de cultura de paz, liderazgo y valores." },
    { icon: "globe", text: "Promover intercambios culturales, festivales y oportunidades de crecimiento artístico." },
  ],
  investment:
    "Cada boleto adquirido, cada patrocinio y cada aporte recibido se convierte en una inversión social que ayuda a construir oportunidades, prevenir la violencia y sembrar esperanza en las nuevas generaciones.",
  ally:
    "Cuando apoya un concierto de FARECOH, no solo disfruta de una experiencia artística de alto nivel; se convierte en aliado de una causa que transforma el talento en oportunidades y el arte en una herramienta de desarrollo humano.",
  closing: ["Un concierto puede durar unas horas.", "Su impacto puede transformar una vida para siempre."],
} as const;

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
    value: "06",
    label: "Programas",
    caption: "música, artes, cultura de paz, intercambios y comunidad",
  },
  {
    value: "03",
    label: "Regiones",
    caption: "Choluteca, Tela y Francisco Morazán",
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
    heroHeadline: "Transformando vidas a través del arte, la educación y la esperanza.",
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
