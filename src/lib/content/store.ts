import { DEFAULT_DATA } from "./defaults";
import type { CollectionItem, CollectionKey, ImageRef, SiteData, SiteSettings } from "./types";

export type Versioned = { id?: string; _version?: number; _status?: string };

export interface AdminStore {
  readonly mode: "weegloo" | "demo";
  isConfigured(key: "settings" | CollectionKey): boolean;
  loadAll(): Promise<SiteData & { settingsMeta: Versioned }>;
  saveSettings(settings: SiteSettings, meta: Versioned): Promise<Versioned>;
  createItem(key: CollectionKey, item: CollectionItem): Promise<CollectionItem & Versioned>;
  updateItem(key: CollectionKey, item: CollectionItem & Versioned): Promise<CollectionItem & Versioned>;
  deleteItem(key: CollectionKey, item: CollectionItem & Versioned): Promise<void>;
  uploadImage?(file: File): Promise<NonNullable<ImageRef>>;
}

const DEMO_KEY = "lumea-demo-site";

/** Demo data saved in this browser only — used when no Weegloo space is configured. */
export function readDemoData(): SiteData | null {
  try {
    const raw = localStorage.getItem(DEMO_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SiteData>;
    return {
      settings: { ...DEFAULT_DATA.settings, ...parsed.settings },
      services: parsed.services ?? DEFAULT_DATA.services,
      projects: parsed.projects ?? DEFAULT_DATA.projects,
      process: parsed.process ?? DEFAULT_DATA.process,
      testimonials: parsed.testimonials ?? DEFAULT_DATA.testimonials,
    };
  } catch {
    return null;
  }
}

function writeDemoData(data: SiteData) {
  try {
    localStorage.setItem(DEMO_KEY, JSON.stringify(data));
  } catch {
    throw new Error("브라우저 저장소를 사용할 수 없어 저장하지 못했습니다.");
  }
}

export function resetDemoData() {
  try {
    localStorage.removeItem(DEMO_KEY);
  } catch {
    /* storage unavailable */
  }
}

export class DemoAdminStore implements AdminStore {
  readonly mode = "demo" as const;

  private data(): SiteData {
    return readDemoData() ?? structuredClone(DEFAULT_DATA);
  }

  isConfigured() {
    return true;
  }

  async loadAll() {
    return { ...this.data(), settingsMeta: {} };
  }

  async saveSettings(settings: SiteSettings): Promise<Versioned> {
    const d = this.data();
    writeDemoData({ ...d, settings });
    return {};
  }

  async createItem(key: CollectionKey, item: CollectionItem) {
    const d = this.data();
    const created = { ...item, id: `${key}-${Date.now().toString(36)}` };
    (d[key] as CollectionItem[]).push(created);
    writeDemoData(d);
    return created;
  }

  async updateItem(key: CollectionKey, item: CollectionItem) {
    const d = this.data();
    const list = d[key] as CollectionItem[];
    const i = list.findIndex((x) => x.id === item.id);
    if (i >= 0) list[i] = item;
    writeDemoData(d);
    return item;
  }

  async deleteItem(key: CollectionKey, item: CollectionItem) {
    const d = this.data();
    (d as Record<CollectionKey, CollectionItem[]>)[key] = (d[key] as CollectionItem[]).filter((x) => x.id !== item.id);
    writeDemoData(d);
  }
}
