export const homeHero = {
  eyebrow: "FARECOH",
  title: "Transformando vidas a través del arte, la educación y la esperanza",
  subtitle:
    "Utilizamos la música, las artes y la educación como herramientas para construir oportunidades, fortalecer comunidades y transformar vidas en Honduras.",
  body: "Fundación Artes Educativas, Coros y Orquestas de Honduras.",
  image: "/images/farecoh-hero-orchestra.png",
  imageAlt: "Orquesta juvenil profesional en un escenario moderno con iluminación azul institucional",
  ctaEvent: "Conocer el evento",
  ctaStory: "Nuestra historia",
} as const;

export const homeAbout = {
  label: "Nuestra historia",
  title: "Una historia que comenzó en 2013",
  body: "FARECOH nació con un propósito claro: demostrar que el arte puede convertirse en una poderosa herramienta de transformación social.",
  bodySecondary:
    "Desde entonces trabajamos para que niños, niñas y jóvenes descubran sus talentos, fortalezcan sus valores y construyan un futuro lleno de oportunidades.",
  image: "/images/farecoh-welcome.webp",
  imageAlt: "Niñas presentándose en una actividad artística de FARECOH",
} as const;

export const homeCause = {
  title: "Miles de jóvenes necesitan oportunidades",
  body: "En muchas comunidades, la violencia, la exclusión social y la falta de oportunidades limitan el desarrollo de miles de niños y jóvenes. Creemos que el arte puede cambiar esta realidad.",
  items: ["Violencia", "Exclusión social", "Falta de oportunidades"],
} as const;

export const homeMissionVision = {
  mission: {
    label: "Modelo FARECOH",
    text: "No formamos únicamente músicos. Formamos ciudadanos comprometidos con la cultura, la paz y el desarrollo de Honduras.",
  },
  vision: {
    label: "Aprendizaje colectivo",
    text: "A través del aprendizaje colectivo fortalecemos liderazgo, disciplina, empatía, responsabilidad y sentido de pertenencia.",
  },
} as const;

export type ProgramIconName =
  | "music"
  | "school"
  | "palette"
  | "heart-handshake"
  | "globe"
  | "users";

export const homeWhatWeDo = {
  label: "Programas",
  title: "Programas que transforman comunidades",
  intro:
    "Cada programa une excelencia artística, acompañamiento humano y pertenencia comunitaria.",
  items: [
    {
      title: "Coros y Orquestas",
      description: "Formación musical colectiva que promueve disciplina, liderazgo y trabajo en equipo.",
      icon: "music" as ProgramIconName,
      image: "/images/farecoh-hero-orchestra.png",
    },
    {
      title: "Escuelas de Música Comunitarias",
      description: "Acceso a educación musical para niños y jóvenes de escasos recursos.",
      icon: "school" as ProgramIconName,
      image: "/images/bg-musica.webp",
    },
    {
      title: "Artes para la Transformación Social",
      description: "Pintura, teatro, danza, literatura y expresión artística al servicio de la comunidad.",
      icon: "palette" as ProgramIconName,
      image: "/images/farecoh-welcome.webp",
    },
    {
      title: "Cultura de Paz",
      description: "Espacios seguros que fortalecen convivencia, valores y resolución positiva de conflictos.",
      icon: "heart-handshake" as ProgramIconName,
      image: "/images/farecoh-welcome.webp",
    },
    {
      title: "Intercambios Culturales",
      description: "Oportunidades de crecimiento, aprendizaje y proyección nacional e internacional.",
      icon: "globe" as ProgramIconName,
      image: "/images/farecoh-hero-orchestra.png",
    },
    {
      title: "Fortalecimiento Comunitario",
      description: "Actividades que promueven integración familiar y participación ciudadana.",
      icon: "users" as ProgramIconName,
      image: "/images/bg-musica.webp",
    },
  ],
} as const;

export const homeImpact = {
  label: "Impacto",
  title: "Transformando vidas todos los días",
  body: "Nuestro trabajo contribuye a reducir factores de riesgo, promover permanencia escolar, fortalecer autoestima, desarrollar liderazgo, impulsar inclusión social y rescatar la identidad cultural hondureña.",
  items: [
    ["+500", "Niños y jóvenes beneficiados"],
    ["+10", "Programas activos"],
    ["+12", "Años de impacto"],
    ["Miles", "De oportunidades creadas"],
  ],
} as const;

export const homeGallery = {
  label: "Galería de impacto",
  title: "Historias que inspiran",
  images: [
    {
      src: "/images/farecoh-welcome.webp",
      alt: "Presentación artística infantil de FARECOH",
    },
    {
      src: "/images/bg-musica.webp",
      alt: "Instrumento de cuerda como símbolo de formación musical",
    },
    {
      src: "/images/farecoh-hero-orchestra.png",
      alt: "Orquesta juvenil en escenario moderno",
    },
  ],
} as const;

export const homeFeaturedEvent = {
  badge: "Evento destacado",
  title: "Tributo a Pink Floyd",
  subtitle: "Una noche. Una experiencia. Un viaje inolvidable.",
  body: "Una experiencia audiovisual creada para celebrar la música de Pink Floyd y apoyar los programas educativos y artísticos de FARECOH.",
  ctaEvent: "Ver evento",
  ctaTickets: "Reservar boletos",
  image: "/images/bg-musica.webp",
  imageAlt: "Escenario oscuro con luces y ambiente musical",
} as const;

export const homeQuote = {
  text: "Donde otros ven vulnerabilidad, nosotros vemos talento. Donde existe riesgo, sembramos esperanza. Donde hay silencio, hacemos sonar la música del cambio.",
  signature: "FARECOH",
} as const;

export const homeFinalCta = {
  title: "Conoce cómo tu apoyo transforma vidas",
  body: "Cada programa, cada encuentro artístico y cada comunidad que acompañamos es una apuesta por el talento hondureño y un futuro con más oportunidades.",
  cta: "Descubre nuestros programas",
  href: "#programas",
  image: "/images/farecoh-hero-orchestra.png",
} as const;
