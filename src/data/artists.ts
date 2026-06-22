export type EnsembleMember = {
  name: string;
  role: string;
  initials: string;
  image: string;
  imageAlt: string;
};

function slugify(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, "-");
}

function lineupPhoto(name: string, role: string) {
  return {
    image: `/images/lineup/${slugify(name)}.jpg`,
    imageAlt: `${name}, ${role} — Tributo a Pink Floyd`,
  };
}

export const musicalDirector = {
  name: "Cristóbal Pineda",
  role: "Director Musical",
  initials: "CP",
  note: "Guía la interpretación, el ensamble y la puesta en escena del tributo.",
  ...lineupPhoto("Cristóbal Pineda", "Director Musical"),
} as const;

function member(name: string, role: string, initials: string): EnsembleMember {
  return { name, role, initials, ...lineupPhoto(name, role) };
}

export const ensembleMembers: EnsembleMember[] = [
  member("Gustavo Madrid", "Guitarra principal", "GM"),
  member("Sergio Molina", "Guitarra", "SM"),
  member("Luis Martínez", "Guitarra acústica", "LM"),
  member("Miguel Enríquez", "Bajo", "ME"),
  member("Mauricio Rodríguez", "Voz principal", "MR"),
  member("Óscar Olivera", "Percusión", "OO"),
  member("Iris Rodríguez", "Saxofón", "IR"),
  member("Gabriela Moncada", "Coros", "GaM"),
  member("Gabriela Zelaya", "Coros", "GZ"),
  member("Valery Pineda", "Coros", "VP"),
];

export const lineupPhotoFallback = "/images/lineup/placeholder.jpg";
