import { homeFeaturedEvent } from "@/data/home";
import { foundationPhotos } from "@/data/foundation-photos";

export const eventPage = {
  hero: {
    badge: "Evento con propósito",
    tagline: homeFeaturedEvent.subtitle,
    body: homeFeaturedEvent.body,
    image: foundationPhotos.eventHero.src,
    imageAlt: foundationPhotos.eventHero.alt,
    ctaPrimary: "Reservar boletos",
    ctaSecondary: "Conocer la causa",
  },
  experience: {
    label: "La experiencia",
    title: "Inmersión sensorial",
    body: "Una experiencia audiovisual inspirada en la música de Pink Floyd, creada para apoyar la educación artística y musical a través de FARECOH.",
    bodySecondary:
      "Reviva los clásicos con una puesta en escena que fusiona la rigurosidad académica con la psicodelia británica, en un entorno diseñado para la apreciación sonora pura.",
    image: "/images/evento/106.webp",
    imageAlt: foundationPhotos.eventExperience.alt,
  },
  purpose: {
    label: "Arte con propósito",
    title: "Cada boleto genera oportunidades",
    body: "Tu aporte apoya programas artísticos y educativos de FARECOH. Cada boleto es una inversión directa en el futuro de los músicos y artistas de nuestra región.",
    highlight: "Un concierto puede durar unas horas. Su impacto puede transformar una vida para siempre.",
  },
  lineup: {
    label: "Elenco",
    subtitle: "Cada integrante aporta su talento al tributo",
    footer: "Pink Floyd sinfónico — tributo",
    directorBadge: "Dirección musical",
    onStageLabel: "músicos en escena",
  },
  cta: {
    title: "Asegura tu lugar en el viaje",
    body: "Cupos limitados para garantizar la calidad de la experiencia acústica y el impacto social de tu aporte.",
    button: "Reservar boletos",
  },
} as const;
