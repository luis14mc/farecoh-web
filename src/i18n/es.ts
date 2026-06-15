import type { ProgramSlug } from "@/data/programs";

export type ProgramCopy = Record<ProgramSlug, { title: string; body: string }>;

export const es = {
  meta: {
    homeTitle: "FARECOH | Transformamos vidas a través de la música",
    homeDescription:
      "Fundación Artes Educativas Coros y Orquestas de Honduras. Educación artística, coros, orquestas y prevención social en Honduras.",
    aboutTitle: "Nosotros | FARECOH",
    aboutDescription:
      "Conoce la historia, misión, visión, valores y junta directiva de FARECOH — Fundación Artes Educativas Coros y Orquestas de Honduras.",
    programsTitle: "Programas | FARECOH",
    programsDescription:
      "Programas académicos musicales, artes visuales, estimulación temprana, coros, orquestas y desarrollo cultural comunitario.",
    eventsTitle: "Eventos | FARECOH",
    eventsDescription:
      "Eventos culturales y benéficos de FARECOH con propósito social y educativo en Honduras.",
    donateTitle: "Donar | FARECOH",
    donateDescription:
      "Apoya la educación artística y musical en Honduras. Tu aporte transforma vidas a través de la música.",
    eventTitle: "Tributo a Pink Floyd | FARECOH",
    eventDescription:
      "Experiencia audiovisual benéfica en apoyo a la educación artística y musical de FARECOH. 08 de agosto de 2026, Tegucigalpa.",
  },
  nav: {
    home: "Inicio",
    about: "Nosotros",
    programs: "Programas",
    events: "Eventos",
    donate: "Donar",
    skipToContent: "Saltar al contenido",
    openMenu: "Abrir menú",
    mainNav: "Navegación principal",
  },
  home: {
    eyebrow: "Fundación Artes Educativas Coros y Orquestas de Honduras",
    title: "Transformamos vidas a través de la música.",
    bilingualSubtext: "Transforming lives through music.",
    intro:
      "FARECOH educa por medio de programas de prevención artística a la niñez y juventud, fortaleciendo la conducta y habilidades para la vida de un ciudadano integral.",
    heroImageAlt: "Jóvenes artistas en escenario durante una presentación de FARECOH",
    heroCaption: "Formación artística, escenario y comunidad en una misma experiencia.",
    ctaPrograms: "Conocer programas",
    ctaDonate: "Apoyar FARECOH",
    whoWeAre: {
      label: "Quiénes somos",
      title: "Ser social solidario.",
      body: "FARECOH educa por medio de programas de prevención artística a la niñez y juventud, fortaleciendo la conducta y habilidades para la vida de un ciudadano integral, denominado “ser social solidario”, con características holísticas donde germinan valores, derechos humanos y servicio al país.",
    },
    programs: {
      label: "Programas",
      title: "Prevención artística con excelencia.",
      link: "Ver todos los programas",
    },
    impact: {
      label: "Impacto",
      title: "Arte, convivencia y prevención.",
      metrics: [
        { value: "9+", label: "programas formativos activos" },
        { value: "7", label: "miembros de junta directiva" },
        { value: "100%", label: "compromiso con inclusión y prevención" },
      ],
    },
    featuredEvent: {
      label: "Próximo evento",
      cta: "Ver evento",
    },
    donate: {
      label: "Donar",
      title: "Tu apoyo sostiene el escenario donde comienza el cambio.",
      body: "Las donaciones permiten becas, instrumentos, formación docente y presentaciones que acercan el arte a más familias.",
      cta: "Hacer una donación",
      note: "También puedes apoyar con instrumentos, voluntariado, alianzas o difusión.",
    },
    partners: {
      label: "Aliados",
      title: "Socios estratégicos",
    },
    sponsors: {
      label: "Patrocinadores",
      title: "Patrocinadores",
      placeholder: "Espacio reservado para aliados que impulsan la educación artística en Honduras.",
    },
  },
  about: {
    label: "Institución",
    title: "Una fundación al servicio de Honduras.",
    intro:
      "FARECOH — Fundación Artes Educativas Coros y Orquestas de Honduras — promueve la excelencia en las artes como herramienta de transformación social.",
    history: {
      label: "Historia",
      title: "Raíces pedagógicas y vocación social",
      body: "Desde Honduras, FARECOH ha construido una trayectoria dedicada al rescate pedagógico y ocupacional como modelo de prevención de la violencia, integrando música, artes visuales, danza y formación humana en favor de niñas, niños y jóvenes.",
    },
    mission: {
      label: "Misión",
      title: "Excelencia en las artes al servicio de la sociedad",
      body: "Fundación al servicio de la sociedad hondureña, con excelencia en el desarrollo de las artes, que coadyuven al desarrollo integral del ser humano, insertándolo a la comunidad por medio del intercambio, prevención, cooperación, valores, identidad nacional, que incide en la transformación.",
    },
    vision: {
      label: "Visión",
      title: "Liderazgo y modelo de excelencia",
      body: "Ser una fundación líder y modelo de excelencia en Honduras, dedicada al rescate pedagógico y ocupacional como modelo de prevención de la violencia para la inclusión social.",
    },
    values: {
      label: "Valores",
      title: "Principios que guían nuestro trabajo",
      items: [
        { title: "Excelencia artística", body: "Calidad y rigor en cada proceso formativo y escénico." },
        { title: "Prevención social", body: "El arte como herramienta de convivencia y transformación." },
        { title: "Inclusión", body: "Espacios abiertos para niñas, niños y jóvenes de distintos contextos." },
        { title: "Identidad nacional", body: "Proyección cultural de Honduras desde la formación artística." },
        { title: "Servicio al país", body: "Compromiso con valores, derechos humanos y comunidad." },
      ],
    },
    team: {
      label: "Junta directiva",
      title: "Equipo de liderazgo",
    },
    boardRoles: {
      president: "Presidenta",
      vicePresident: "Vice Presidenta",
      secretary: "Secretario",
      treasurer: "Tesorero",
      member1: "Vocal I",
      member2: "Vocal II",
      member3: "Vocal III",
    },
  },
  programsPage: {
    label: "Programas",
    title: "Formación artística con propósito social.",
    intro:
      "Nuestros programas desarrollan y fortalecen habilidades artísticas y sociales en niños, niñas y jóvenes, creando espacios de sana convivencia y contribuyendo a la prevención de las violencias en espacios comunitarios.",
    items: {
      "academic-music": {
        title: "Programa Académico Musical",
        body: "Formación musical integral que desarrolla técnica, disciplina y sensibilidad artística en niñas, niños y jóvenes.",
      },
      "visual-arts": {
        title: "Programa Académico Artes Visuales",
        body: "Desarrollo de lenguajes plásticos y visuales que fortalecen la expresión creativa y la percepción estética.",
      },
      "early-stimulation": {
        title: "Programa de Estimulación Temprana",
        body: "Programa para desarrollar habilidades cognitivas en niños y niñas por medio de la música, promoviendo bienestar físico, emocional, social y cognitivo.",
      },
      "special-education": {
        title: "Programa de Educación Especial",
        body: "Atención formativa inclusiva adaptada a necesidades educativas especiales mediante metodologías artísticas.",
      },
      "choirs-orchestras": {
        title: "Coros y Orquestas Infantiles-Juveniles",
        body: "Programa dirigido a niños y jóvenes basado en un proceso de enseñanza-aprendizaje integral e inclusivo.",
      },
      "cultural-exchanges": {
        title: "Intercambios Culturales",
        body: "Oportunidad para niños, jóvenes o voluntarios de realizar intercambios o becas de verano en países con convenios musicales de la fundación, fortaleciendo habilidades artísticas y nuevas oportunidades de estudio.",
      },
      "dance-company": {
        title: "Compañía de Danza",
        body: "Formación escénica en danza que integra expresión corporal, disciplina y presentación artística.",
      },
      "white-hands-choir": {
        title: "Coro de Manos Blancas",
        body: "Integra a la vida cotidiana y actividades artísticas a niños, jóvenes y adultos con capacidades físicas comprometidas y necesidades educativas especiales, usando la música como herramienta de desarrollo e inclusión.",
      },
      painting: {
        title: "Pintura",
        body: "Despierta la creatividad en niños y jóvenes, desarrolla capacidades cognitivas y habilidades para percibir el mundo desde un punto de vista estético.",
      },
    } satisfies ProgramCopy,
  },
  eventsPage: {
    label: "Eventos",
    title: "Experiencias culturales con propósito.",
    intro:
      "Cada evento FARECOH es una oportunidad de celebrar el arte, reunir comunidad y sostener programas educativos.",
    upcoming: "Próximos eventos",
    viewEvent: "Ver evento",
    solidarity: "Aporte solidario",
  },
  donatePage: {
    label: "Donar",
    title: "Tu apoyo abre un escenario donde comienza el cambio.",
    intro:
      "Cada donación llega a coros, orquestas, becas, instrumentos y experiencias formativas que transforman la vida de niñas, niños y jóvenes en Honduras.",
    impact: {
      label: "Impacto",
      title: "A dónde va tu aporte",
      items: [
        { title: "Becas y acceso", body: "Facilitamos la participación de jóvenes que de otro modo no tendrían acceso a formación artística." },
        { title: "Instrumentos y recursos", body: "Adquisición y mantenimiento de instrumentos, partituras y materiales pedagógicos." },
        { title: "Formación docente", body: "Capacitación de maestros y directores que sostienen la calidad de nuestros programas." },
        { title: "Presentaciones comunitarias", body: "Conciertos y actividades culturales que acercan el arte a más familias." },
      ],
    },
    ways: {
      label: "Formas de apoyo",
      title: "Hay muchas maneras de acompañarnos",
      items: [
        "Donación económica",
        "Donación de instrumentos",
        "Voluntariado artístico o administrativo",
        "Alianzas institucionales y empresariales",
        "Difusión de eventos y programas",
      ],
    },
    form: {
      label: "Contáctanos",
      title: "Quiero apoyar a FARECOH",
      body: "El sistema de donaciones en línea estará disponible próximamente. Déjanos tus datos y te contactaremos.",
      name: "Nombre completo",
      email: "Correo electrónico",
      message: "Mensaje (opcional)",
      submit: "Enviar interés de donación",
      note: "Toda la información es tratada con confidencialidad.",
    },
    trust: {
      label: "Transparencia",
      body: "FARECOH es una fundación con vocación educativa y social. Trabajamos con aliados, familias y comunidades para garantizar que cada aporte tenga impacto real.",
    },
  },
  event: {
    eyebrow: "FARECOH presenta",
    name: "Tributo a Pink Floyd",
    tagline: "Una noche. Una experiencia. Un viaje inolvidable.",
    date: "08 de agosto de 2026",
    time: "8:00 PM",
    venue: "Escuela Nacional de Música",
    city: "Tegucigalpa, Honduras",
    ticketPrice: "L.500.00",
    ticketLabel: "Aporte solidario",
    purpose: "Apoyar la educación artística y musical a través de FARECOH.",
    description:
      "FARECOH convoca a una noche distinta: no un concierto comercial, sino una experiencia cinematográfica donde el rock progresivo se encuentra con la causa educativa.",
    experience: {
      label: "Experiencia",
      title: "Un viaje audiovisual",
      body: "Luz, proyección y sonido en vivo convergen en un escenario oscuro y elegante. La música guía la mirada; la causa da sentido a la noche.",
      points: [
        "Interpretación en vivo de clásicos de Pink Floyd",
        "Diseño de luz y atmósfera cinematográfica",
        "Narrativa escénica orientada a la experiencia",
        "Recaudación solidaria para programas FARECOH",
      ],
    },
    musicians: { label: "Elenco", title: "Músicos en escena" },
    cta: {
      participate: "Participa",
      title: "Sé parte de la experiencia",
      body: "Los boletos estarán disponibles próximamente. Contáctanos para manifestar tu interés o apoyar la causa educativa de FARECOH.",
      button: "Contactar a FARECOH",
      secondary: "Apoyar la causa",
      note: "Aporte solidario · Sin fines comerciales",
      viewExperience: "Ver experiencia",
      viewCast: "Ver elenco",
    },
    heroImageAlt: "Escenario oscuro con luz prismática durante un tributo musical",
  },
  musicianRoles: {
    leadGuitar: "Guitarra Principal",
    guitarist: "Guitarrista",
    acousticGuitar: "Guitarra Acústica",
    drummer: "Baterista",
    percussionist: "Percusionista",
    leadVocal: "Vocalista Principal",
    bassist: "Bajista",
    saxophonist: "Saxofonista",
    backingVocals: "Armonías Vocales",
  },
  footer: {
    text: "Formación artística, coros, orquestas y experiencias culturales para transformar vidas a través de la música.",
    explore: "Explorar",
    contact: "Contacto",
    rights: "© 2026 FARECOH. Todos los derechos reservados.",
    languageSwitch: "English",
  },
  labels: {
    date: "Fecha",
    time: "Hora",
    venue: "Lugar",
    purpose: "Propósito",
  },
} as const;
