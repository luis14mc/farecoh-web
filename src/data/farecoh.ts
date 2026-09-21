export interface ProgramItem {
  id: string;
  title: string;
  category: string;
  description: string;
  badge: string;
  tag: string;
}

export interface BoardMember {
  name: string;
  role: string;
}

export interface Partner {
  name: string;
  type: string;
}

export const FARECOH_DATA = {
  identity: {
    acronym: "FARECOH",
    fullName: "Fundación Artes Educativas, Coros y Orquestas de Honduras",
    heroHeadline: "Transformación social a través de la armonía y las artes.",
    heroSubheadline: "Educamos a la niñez y juventud de Honduras mediante programas de prevención artística, forjando seres sociales solidarios bajo valores universales e identidad comunitaria.",
    mission: "Fundación al servicio de la sociedad hondureña con excelencia en el desarrollo de las artes, coadyuvando al desarrollo integral del ser humano e insertándolo a la comunidad mediante el intercambio, la prevención, la cooperación y los valores.",
    vision: "Ser una fundación líder y modelo de excelencia en Honduras, dedicada al rescate pedagógico y ocupacional como modelo de prevención de la violencia para la inclusión social."
  },
  programs: [
    {
      id: "orquestas-coros",
      title: "Coros y Orquestas Infantiles-Juveniles",
      category: "Programa Académico Musical",
      description: "Proceso pedagógico colectivo, riguroso e inclusivo enfocado en la práctica orquestal y coral como espacio de convivencia pacífica.",
      badge: "Música Sinfónica",
      tag: "01"
    },
    {
      id: "manos-blancas",
      title: "Coro de Manos Blancas",
      category: "Educación Especial & Accesibilidad",
      description: "Integración artística para niños, jóvenes y adultos con capacidades físicas comprometidas y necesidades especiales, usando la música gestual y coral como catalizador de inclusión.",
      badge: "Inclusión Social",
      tag: "02"
    },
    {
      id: "estimulacion-temprana",
      title: "Estimulación Temprana",
      category: "Primera Infancia",
      description: "Desarrollo de capacidades cognitivas, sensoriales y socioafectivas en infantes a través del sonido guiado, concibiendo al bebé como un ser humano integral.",
      badge: "Desarrollo Cognitivo",
      tag: "03"
    },
    {
      id: "artes-visuales",
      title: "Pintura y Formación Visual",
      category: "Programa de Artes Plásticas",
      description: "Despierta la creatividad y el pensamiento crítico estético, otorgando a los jóvenes herramientas para interpretar y transformar positivamente su entorno.",
      badge: "Artes Visuales",
      tag: "04"
    }
  ] satisfies ProgramItem[],
  initiatives: {
    title: "Intercambios Culturales & Becas de Verano",
    description: "Movilidad internacional y oportunidades de estudio para niños, jóvenes talentos y voluntarios en países con convenios de cooperación artística vigentes.",
    badge: "Proyección Global"
  },
  board: [
    { name: "Vivian Alvarado", role: "Presidenta" },
    { name: "Wanayran Alvarez", role: "Vice Presidenta" },
    { name: "Christian Anariba", role: "Secretario" },
    { name: "Luis E. Godoy", role: "Tesorero" },
    { name: "Norma Pineda", role: "Vocal I" },
    { name: "Elena Figueroa", role: "Vocal II" },
    { name: "Cinthya Thomas", role: "Vocal III" }
  ] satisfies BoardMember[],
  partners: [
    { name: "OEA (Organización de los Estados Americanos)", type: "Organismo Multilateral" },
    { name: "AMEXCID", type: "Cooperación Internacional" },
    { name: "Wanny Angerer in Moving Cultures", type: "Red Cultural Global" },
    { name: "International Music Camp", type: "Educación Musical Internacional" },
    { name: "Arpas en Armonía", type: "Alianza Cultural" }
  ] satisfies Partner[]
};
