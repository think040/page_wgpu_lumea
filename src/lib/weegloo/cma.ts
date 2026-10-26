import { COLLECTIONS, SETTINGS_FIELDS } from "@/lib/content/schema";
import { DEFAULT_DATA } from "@/lib/content/defaults";
import type { CollectionItem, CollectionKey, ImageRef, SiteData, SiteSettings } from "@/lib/content/types";
import { CMA_BASE, CONTENT_TYPE_IDS, LOCALE, SPACE_ID, UPLOAD_BASE } from "./config";
import { byOrder, entryToItem, itemToFields, mediaUrlMap, type ListResponse, type RawEntry } from "./mapping";
import type { AdminStore, Versioned } from "@/lib/content/store";

const MANAGEMENT = { kind: "management", locale: LOCALE } as const;

export class WeeglooError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
  }
}

async function readError(res: Response): Promise<WeeglooError> {
  let code: string | undefined;
  let detail = "";
  try {
    const body = (await res.json()) as { sys?: { id?: string }; code?: string; message?: string };
    code = body.code ?? body.sys?.id;
    detail = body.message ?? "";
  } catch {
    /* non-JSON error body */
  }
  if (res.status === 401) return new WeeglooError("로그인이 만료되었습니다. 다시 로그인해 주세요.", 401, code);
  if (res.status === 403) return new WeeglooError("이 작업을 할 권한이 없습니다.", 403, code);
  if (res.status === 409) return new WeeglooError("다른 곳에서 먼저 수정되었습니다. 새로고침 후 다시 시도해 주세요.", 409, code);
  if (code === "WGL429004")
    return new WeeglooError("파일이 현재 요금제의 업로드 한도를 넘습니다. 더 작은 파일을 선택하거나 요금제를 올려 주세요.", 429, code);
  return new WeeglooError(detail || `요청이 실패했습니다 (${res.status})`, res.status, code);
}

/** Admin data access over the management plane with the signed-in user's token. */
export class WeeglooAdminStore implements AdminStore {
  readonly mode = "weegloo" as const;

  constructor(private token: string) {}

  private async call<T>(path: string, init: RequestInit = {}, base = CMA_BASE): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${this.token}`);
    const res = await fetch(`${base}${path}`, { ...init, headers });
    if (!res.ok) throw await readError(res);
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }

  private space(path: string) {
    return `/spaces/${SPACE_ID}${path}`;
  }

  isConfigured(key: "settings" | CollectionKey) {
    return Boolean(CONTENT_TYPE_IDS[key]);
  }

  private async list(contentTypeId: string, withMedia: boolean): Promise<ListResponse> {
    const params = new URLSearchParams({ limit: "100", select: "sys.id,sys.version,sys.status,fields" });
    if (withMedia) params.set("include", "1");
    return this.call(this.space(`/content-types/${contentTypeId}/contents?${params}`));
  }

  async loadAll(): Promise<SiteData & { settingsMeta: Versioned }> {
    const settingsCt = CONTENT_TYPE_IDS.settings;
    let settings: SiteSettings & Versioned = { ...DEFAULT_DATA.settings };
    if (settingsCt) {
      const res = await this.list(settingsCt, false);
      const first = res.items?.[0];
      if (first) settings = entryToItem<SiteSettings>(first, SETTINGS_FIELDS, MANAGEMENT, new Map(), DEFAULT_DATA.settings);
    }

    const load = async <K extends CollectionKey>(key: K): Promise<SiteData[K]> => {
      const ct = CONTENT_TYPE_IDS[key];
      if (!ct) return [] as unknown as SiteData[K];
      const schema = COLLECTIONS[key].fields;
      const withMedia = schema.some((f) => f.kind === "image");
      const res = await this.list(ct, withMedia);
      const media = mediaUrlMap(res.include?.Media, MANAGEMENT);
      return (res.items ?? []).map((e) => entryToItem(e, schema, MANAGEMENT, media)).sort(byOrder) as unknown as SiteData[K];
    };

    const [services, projects, process, testimonials] = await Promise.all([
      load("services"),
      load("projects"),
      load("process"),
      load("testimonials"),
    ]);
    return {
      settings,
      settingsMeta: { id: settings.id, _version: (settings as Versioned)._version },
      services,
      projects,
      process,
      testimonials,
    };
  }

  private async publish(entry: RawEntry): Promise<RawEntry> {
    const published = await this.call<RawEntry | undefined>(this.space(`/contents/${entry.sys.id}/publish`), {
      method: "PUT",
      headers: { "X-Weegloo-Version": String(entry.sys.version) },
    });
    return published?.sys?.version ? published : { sys: { ...entry.sys, version: (entry.sys.version ?? 0) + 1 } };
  }

  private async createEntry(contentTypeId: string, fields: Record<string, unknown>): Promise<RawEntry> {
    const created = await this.call<RawEntry>(this.space(`/content-types/${contentTypeId}/contents`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields }),
    });
    return this.publish(created);
  }

  /** PUT is a full replacement, so the payload carries every field of the form. */
  private async replaceEntry(contentTypeId: string, id: string, version: number, fields: Record<string, unknown>) {
    const updated = await this.call<RawEntry>(this.space(`/content-types/${contentTypeId}/contents/${id}`), {
      method: "PUT",
      headers: { "Content-Type": "application/json", "X-Weegloo-Version": String(version) },
      body: JSON.stringify({ fields }),
    });
    return this.publish(updated);
  }

  async saveSettings(settings: SiteSettings, meta: Versioned): Promise<Versioned> {
    const ct = CONTENT_TYPE_IDS.settings;
    const fields = itemToFields(settings as unknown as Record<string, unknown>, SETTINGS_FIELDS, LOCALE);
    const entry =
      meta.id && meta._version
        ? await this.replaceEntry(ct, meta.id, meta._version, fields)
        : await this.createEntry(ct, fields);
    return { id: entry.sys.id, _version: entry.sys.version };
  }

  async createItem(key: CollectionKey, item: CollectionItem): Promise<CollectionItem & Versioned> {
    const fields = itemToFields(item as unknown as Record<string, unknown>, COLLECTIONS[key].fields, LOCALE);
    const entry = await this.createEntry(CONTENT_TYPE_IDS[key], fields);
    return { ...item, id: entry.sys.id, _version: entry.sys.version, _status: "Published" };
  }

  async updateItem(key: CollectionKey, item: CollectionItem & Versioned): Promise<CollectionItem & Versioned> {
    const fields = itemToFields(item as unknown as Record<string, unknown>, COLLECTIONS[key].fields, LOCALE);
    const entry = await this.replaceEntry(CONTENT_TYPE_IDS[key], item.id, item._version ?? 0, fields);
    return { ...item, _version: entry.sys.version, _status: "Published" };
  }

  async deleteItem(key: CollectionKey, item: CollectionItem & Versioned): Promise<void> {
    let version = item._version ?? 0;
    if (item._status === "Published" || item._status === "Changed") {
      const unpublished = await this.call<RawEntry | undefined>(this.space(`/contents/${item.id}/publish`), {
        method: "DELETE",
        headers: { "X-Weegloo-Version": String(version) },
      });
      version = unpublished?.sys?.version ?? version + 1;
    }
    await this.call(this.space(`/content-types/${CONTENT_TYPE_IDS[key]}/contents/${item.id}`), {
      method: "DELETE",
      headers: { "X-Weegloo-Version": String(version) },
    });
  }

  /** Upload → Media create → wait until the platform publishes it. */
  async uploadImage(file: File): Promise<NonNullable<ImageRef>> {
    const form = new FormData();
    form.append("file", file);
    const upload = await this.call<{ sys: { id: string } }>(
      this.space("/uploads/multipart"),
      { method: "POST", body: form },
      UPLOAD_BASE,
    );

    const media = await this.call<{ sys: { id: string } }>(this.space("/medias"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fields: {
          title: { [LOCALE]: file.name.replace(/\.[^.]+$/, "").slice(0, 64) },
          file: {
            [LOCALE]: {
              fileName: file.name,
              contentType: file.type || "image/jpeg",
              upload: { sys: { id: upload.sys.id, type: "Refer", targetType: "Upload" } },
            },
          },
        },
      }),
    });

    // poll this one Media with backoff until processing finishes
    let delay = 800;
    for (let attempt = 0; attempt < 10; attempt++) {
      await new Promise((r) => setTimeout(r, delay));
      delay = Math.min(delay * 1.6, 5000);
      const m = await this.call<{
        sys: { status?: string };
        fields?: { file?: Record<string, { url?: string; state?: string | null }> };
      }>(this.space(`/medias/${media.sys.id}?select=sys.status,fields.file`));
      const f = m.fields?.file?.[LOCALE];
      if (f?.state === "FAILED") throw new Error("이미지 처리에 실패했습니다. 다른 파일로 시도해 주세요.");
      if (m.sys.status === "Published" && !f?.state && f?.url) {
        return { id: media.sys.id, url: f.url.startsWith("//") ? `https:${f.url}` : f.url };
      }
    }
    throw new Error("이미지 처리가 지연되고 있습니다. 잠시 후 다시 시도해 주세요.");
  }
}
