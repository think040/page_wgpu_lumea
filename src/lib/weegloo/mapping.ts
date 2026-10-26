import type { FieldDef } from "@/lib/content/schema";
import type { ImageRef } from "@/lib/content/types";

export type Refer = { sys: { id: string; type: "Refer"; targetType: string } };

export type RawEntry = {
  sys: { id: string; version?: number; status?: string };
  fields?: Record<string, unknown>;
};

export type RawMedia = {
  sys: { id: string };
  fields?: { file?: unknown };
};

export type ListResponse = {
  items?: RawEntry[];
  include?: { Media?: RawMedia[] };
  links?: { next?: string };
};

/**
 * Read shape differs by plane: delivery flattens `fields.x` to the value,
 * management keeps per-locale buckets `fields.x[locale]`.
 */
export type Plane = { kind: "delivery" } | { kind: "management"; locale: string };

function readValue(fields: Record<string, unknown> | undefined, key: string, plane: Plane): unknown {
  const raw = fields?.[key];
  if (plane.kind === "delivery") return raw;
  if (raw && typeof raw === "object") return (raw as Record<string, unknown>)[plane.locale];
  return undefined;
}

export function mediaUrlMap(media: RawMedia[] | undefined, plane: Plane): Map<string, string> {
  const map = new Map<string, string>();
  for (const m of media ?? []) {
    const file = readValue(m.fields as Record<string, unknown>, "file", plane) as { url?: string } | undefined;
    if (file?.url) map.set(m.sys.id, file.url.startsWith("//") ? `https:${file.url}` : file.url);
  }
  return map;
}

/** Turns a raw Weegloo entry into a plain object keyed by the schema's field keys. */
export function entryToItem<T>(
  entry: RawEntry,
  schema: FieldDef[],
  plane: Plane,
  media: Map<string, string>,
  fallback: Partial<T> = {},
): T & { id: string; _version?: number; _status?: string } {
  const out: Record<string, unknown> = { ...fallback, id: entry.sys.id };
  for (const f of schema) {
    const v = readValue(entry.fields, f.key, plane);
    if (f.kind === "image") {
      const ref = v as Refer | undefined;
      const id = ref?.sys?.id;
      out[f.key] = id ? ({ id, url: media.get(id) ?? "" } satisfies NonNullable<ImageRef>) : null;
    } else if (v !== undefined && v !== null) {
      out[f.key] = v;
    }
  }
  out._version = entry.sys.version;
  out._status = entry.sys.status;
  return out as T & { id: string; _version?: number; _status?: string };
}

/** Builds the management write payload: every non-empty value under the default-locale bucket. */
export function itemToFields(item: Record<string, unknown>, schema: FieldDef[], locale: string) {
  const fields: Record<string, Record<string, unknown>> = {};
  for (const f of schema) {
    const v = item[f.key];
    if (f.kind === "image") {
      const img = v as ImageRef;
      if (img?.id) fields[f.key] = { [locale]: { sys: { id: img.id, type: "Refer", targetType: "Media" } } };
      continue;
    }
    if (v === undefined || v === null || v === "") continue;
    if (f.kind === "number") {
      const n = Number(v);
      if (Number.isFinite(n)) fields[f.key] = { [locale]: Math.round(n) };
      continue;
    }
    fields[f.key] = { [locale]: v };
  }
  return fields;
}

export function byOrder(a: object, b: object) {
  return Number((a as { order?: number }).order ?? 0) - Number((b as { order?: number }).order ?? 0);
}
