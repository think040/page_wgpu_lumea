export type ImageRef = { id: string; url: string } | null;

export type SiteSettings = {
  id?: string;
  title: string;
  particleCountDesktop: number;
  particleCountMobile: number;
  heroWordmark: string;
  heroEyebrow: string;
  heroTitle: string;
  heroSubtitle: string;
  heroCtaLabel: string;
  aboutTitle: string;
  aboutBody: string;
  stat1Value: string;
  stat1Label: string;
  stat2Value: string;
  stat2Label: string;
  stat3Value: string;
  stat3Label: string;
  email: string;
  phone: string;
  address: string;
  hours: string;
  instagram: string;
};

export type Service = {
  id: string;
  title: string;
  summary: string;
  icon: ServiceIcon;
  order: number;
};

export type Project = {
  id: string;
  title: string;
  category: ProjectCategory;
  location: string;
  year: number;
  description: string;
  accent: string;
  image: ImageRef;
  order: number;
};

export type ProcessStep = {
  id: string;
  title: string;
  description: string;
  order: number;
};

export type Testimonial = {
  id: string;
  quote: string;
  author: string;
  role: string;
  order: number;
};

export type SiteData = {
  settings: SiteSettings;
  services: Service[];
  projects: Project[];
  process: ProcessStep[];
  testimonials: Testimonial[];
};

export type CollectionKey = "services" | "projects" | "process" | "testimonials";
export type CollectionItem = Service | Project | ProcessStep | Testimonial;

export const SERVICE_ICONS = ["pendant", "spot", "line", "sun", "scene", "wrench"] as const;
export type ServiceIcon = (typeof SERVICE_ICONS)[number];

export const PROJECT_CATEGORIES = ["주거", "상업", "호스피탈리티", "오피스", "전시", "공공"] as const;
export type ProjectCategory = (typeof PROJECT_CATEGORIES)[number];

/** Particle count bounds — match the validations on the Site Settings ContentType. */
export const PARTICLE_LIMITS = {
  desktop: { min: 5000, max: 150000, default: 50000, step: 1000 },
  mobile: { min: 2000, max: 40000, default: 15000, step: 1000 },
} as const;
