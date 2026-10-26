import { COLLECTIONS, SETTINGS_FIELDS } from "@/lib/content/schema";
import { DEFAULT_DATA } from "@/lib/content/defaults";
import type { CollectionKey, SiteData, SiteSettings } from "@/lib/content/types";
import { CDA_BASE, CONTENT_TYPE_IDS, DELIVERY_TOKEN, SPACE_ID } from "./config";
import { byOrder, entryToItem, mediaUrlMap, type ListResponse } from "./mapping";

const DELIVERY = { kind: "delivery" } as const;

async function listPublished(contentTypeId: string, withMedia: boolean): Promise<ListResponse> {
  const params = new URLSearchParams({ limit: "100", select: "sys.id,fields" });
  if (withMedia) params.set("include", "1");
  const res = await fetch(
    `${CDA_BASE}/spaces/${SPACE_ID}/content-types/${contentTypeId}/contents?${params}`,
    { headers: { Authorization: `Bearer ${DELIVERY_TOKEN}` } },
  );
  if (!res.ok) throw new Error(`CDA ${res.status}`);
  return res.json();
}

async function loadCollection<K extends CollectionKey>(key: K): Promise<SiteData[K]> {
  const ct = CONTENT_TYPE_IDS[key];
  if (!ct) return DEFAULT_DATA[key];
  const schema = COLLECTIONS[key].fields;
  const withMedia = schema.some((f) => f.kind === "image");
  const res = await listPublished(ct, withMedia);
  const media = mediaUrlMap(res.include?.Media, DELIVERY);
  const items = (res.items ?? []).map((e) => entryToItem(e, schema, DELIVERY, media));
  return items.sort(byOrder) as unknown as SiteData[K];
}

async function loadSettings(): Promise<SiteSettings> {
  const ct = CONTENT_TYPE_IDS.settings;
  if (!ct) return DEFAULT_DATA.settings;
  const res = await listPublished(ct, false);
  const first = res.items?.[0];
  if (!first) return DEFAULT_DATA.settings;
  // fields the editor left empty keep the bundled copy
  return entryToItem<SiteSettings>(first, SETTINGS_FIELDS, DELIVERY, new Map(), DEFAULT_DATA.settings);
}

/** One request per section; a section that fails keeps its bundled copy. */
export async function loadPublishedSite(): Promise<SiteData> {
  const keep = <T,>(p: Promise<T>, fallback: T) =>
    p.catch((err) => {
      console.warn("[content]", err);
      return fallback;
    });
  const [settings, services, projects, process, testimonials] = await Promise.all([
    keep(loadSettings(), DEFAULT_DATA.settings),
    keep(loadCollection("services"), DEFAULT_DATA.services),
    keep(loadCollection("projects"), DEFAULT_DATA.projects),
    keep(loadCollection("process"), DEFAULT_DATA.process),
    keep(loadCollection("testimonials"), DEFAULT_DATA.testimonials),
  ]);
  return { settings, services, projects, process, testimonials };
}
