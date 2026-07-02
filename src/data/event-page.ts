import { foundationPhotos } from "@/data/foundation-photos";

export const eventPage = {
  hero: {
    tagline:
      "Una noche. Una experiencia. Un viaje sensorial a través de los sonidos que redefinieron el rock progresivo.",
    image: foundationPhotos.eventHero.src,
    imageAlt: foundationPhotos.eventHero.alt,
    ctaPrimary: "Reservar boleto",
  },
  experience: {
    titleLead: "Inmersión",
    titleAccent: "Sensorial",
    body: "Una experiencia audiovisual cruda y cinematográfica inspirada en el legado de Pink Floyd, diseñada para elevar el estándar de la educación artística en Honduras.",
    bodySecondary:
      "Reviva los clásicos en un entorno institucional transformado en un templo de experimentación sonora y visual. Una producción de alto impacto para audífonos y almas exigentes.",
    image: foundationPhotos.eventExperience.src,
    imageAlt: foundationPhotos.eventExperience.alt,
  },
  purpose: {
    title: "Arte con Propósito Real",
    quote: "En conjunto, tu asistencia financia la próxima generación de virtuosos.",
    body: "Cada boleto es una inversión directa en becas y equipamiento para los estudiantes de FARECOH. El rock no solo suena, transforma realidades.",
  },
  lineup: {
    titleLead: "Lineup del",
    titleAccent: "Tour",
    subtitle: "Élite Musical Académica",
    directorBadge: "Director Musical",
  },
  cta: {
    titleLead: "Únete al",
    titleAccent: "Lado Oscuro",
    titleTail: "de la Luna",
    body: "Cupos limitados. La acústica perfecta requiere exclusividad.",
    button: "Comprar ahora",
  },
} as const;
