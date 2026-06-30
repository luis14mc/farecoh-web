export type Artist = {
  order: number;
  name: string;
  role: string;
  image: string;
  imageAlt: string;
  featured?: boolean;
  description?: string;
};

const ARTISTS_BASE = "/images/artists";

function artistImage(slug: string, ext: "webp" | "jpg" = "webp") {
  return `${ARTISTS_BASE}/${slug}.${ext}`;
}

function artistAlt(name: string, role: string) {
  return `${name}, ${role} — Tributo a Pink Floyd FARECOH`;
}

export const lineupPhotoFallback = `${ARTISTS_BASE}/placeholder.webp`;

export const musicalDirector: Artist = {
  order: 0,
  name: "Cristóbal Pineda",
  role: "Director Musical",
  image: artistImage("cristobal-pineda"),
  imageAlt: artistAlt("Cristóbal Pineda", "Director Musical"),
  featured: true,
  description: "Guía la interpretación, el ensamble y la puesta en escena del tributo.",
};

export const ensembleMembers: Artist[] = [
  {
    order: 1,
    name: "Gustavo Madrid",
    role: "Guitarra Principal",
    image: artistImage("gustavo-madrid", "jpg"),
    imageAlt: artistAlt("Gustavo Madrid", "Guitarra Principal"),
  },
  {
    order: 2,
    name: "Sergio Molina",
    role: "Guitarra",
    image: artistImage("sergio-molina", "jpg"),
    imageAlt: artistAlt("Sergio Molina", "Guitarra"),
  },
  {
    order: 3,
    name: "Luis Martínez",
    role: "Guitarra Acústica",
    image: artistImage("luis-martinez"),
    imageAlt: artistAlt("Luis Martínez", "Guitarra Acústica"),
  },
  {
    order: 4,
    name: "Miguel Enríquez",
    role: "Bajo",
    image: artistImage("miguel-enriquez", "jpg"),
    imageAlt: artistAlt("Miguel Enríquez", "Bajo"),
  },
  {
    order: 5,
    name: "Mauricio Rodríguez",
    role: "Voz Principal",
    image: artistImage("mauricio-rodriguez", "jpg"),
    imageAlt: artistAlt("Mauricio Rodríguez", "Voz Principal"),
  },
  {
    order: 6,
    name: "Óscar Olivera",
    role: "Percusión",
    image: artistImage("oscar-olivera"),
    imageAlt: artistAlt("Óscar Olivera", "Percusión"),
  },
  {
    order: 7,
    name: "Iris Rodríguez",
    role: "Saxofón",
    image: artistImage("iris-rodriguez"),
    imageAlt: artistAlt("Iris Rodríguez", "Saxofón"),
  },
  {
    order: 8,
    name: "Gabriela Moncada",
    role: "Coros",
    image: artistImage("gabriela-moncada"),
    imageAlt: artistAlt("Gabriela Moncada", "Coros"),
  },
  {
    order: 9,
    name: "Gabriela Zelaya",
    role: "Coros",
    image: artistImage("gabriela-zelaya", "jpg"),
    imageAlt: artistAlt("Gabriela Zelaya", "Coros"),
  },
  {
    order: 10,
    name: "Valery Pineda",
    role: "Coros",
    image: artistImage("valery-pineda"),
    imageAlt: artistAlt("Valery Pineda", "Coros"),
  },
];

export const ensembleOnStageCount = ensembleMembers.length;
