export type ProgramSlug =
  | "academic-music"
  | "visual-arts"
  | "early-stimulation"
  | "special-education"
  | "choirs-orchestras"
  | "cultural-exchanges"
  | "dance-company"
  | "white-hands-choir"
  | "painting";

export type ProgramRecord = {
  slug: ProgramSlug;
  featured: boolean;
};

export const programs: ProgramRecord[] = [
  { slug: "academic-music", featured: true },
  { slug: "visual-arts", featured: false },
  { slug: "early-stimulation", featured: true },
  { slug: "special-education", featured: false },
  { slug: "choirs-orchestras", featured: true },
  { slug: "cultural-exchanges", featured: false },
  { slug: "dance-company", featured: false },
  { slug: "white-hands-choir", featured: false },
  { slug: "painting", featured: false },
];

export function getFeaturedPrograms(): ProgramRecord[] {
  return programs.filter((p) => p.featured);
}
