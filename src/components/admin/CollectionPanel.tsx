"use client";

import { useState } from "react";
import FieldInput from "./FieldInput";
import { COLLECTIONS, ICON_LABELS } from "@/lib/content/schema";
import type { AdminStore, Versioned } from "@/lib/content/store";
import type { CollectionItem, CollectionKey } from "@/lib/content/types";

type Item = CollectionItem & Versioned;

type Props = {
  kind: CollectionKey;
  items: Item[];
  store: AdminStore;
  onItemsChange: (items: Item[]) => void;
  notify: (msg: string, tone?: "ok" | "error") => void;
};

function emptyItem(kind: CollectionKey, nextOrder: number): Record<string, unknown> {
  const base: Record<string, unknown> = { id: "", order: nextOrder };
  for (const f of COLLECTIONS[kind].fields) {
    if (f.key === "order") continue;
    if (f.kind === "select") base[f.key] = f.options?.[0]?.value ?? "";
    else if (f.kind === "number") base[f.key] = f.key === "year" ? new Date().getFullYear() : 0;
    else if (f.kind === "image") base[f.key] = null;
    else if (f.kind === "color") base[f.key] = "#f5a54a";
    else base[f.key] = "";
  }
  return base;
}

function subtitle(kind: CollectionKey, item: Record<string, unknown>) {
  if (kind === "services") return ICON_LABELS[item.icon as keyof typeof ICON_LABELS] ?? "";
  if (kind === "projects") return [item.category, item.location, item.year].filter(Boolean).join(" · ");
  if (kind === "testimonials") return String(item.role ?? "");
  return String(item.description ?? "").slice(0, 48);
}

export default function CollectionPanel({ kind, items, store, onItemsChange, notify }: Props) {
  const meta = COLLECTIONS[kind];
  const [draft, setDraft] = useState<Record<string, unknown> | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  if (!store.isConfigured(kind)) {
    return (
      <div className="apanel">
        <p className="anotice">이 항목은 아직 연결되지 않았습니다. 사이트 설정에 {meta.label} 콘텐츠 타입 ID를 추가해 주세요.</p>
      </div>
    );
  }

  const nextOrder = items.reduce((m, i) => Math.max(m, Number((i as { order?: number }).order ?? 0)), 0) + 1;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    setBusyId(String(draft.id || "new"));
    try {
      if (draft.id) {
        const saved = await store.updateItem(kind, draft as unknown as Item);
        onItemsChange(items.map((i) => (i.id === saved.id ? saved : i)));
        notify(`${meta.singular}을(를) 수정했습니다.`);
      } else {
        const created = await store.createItem(kind, draft as unknown as CollectionItem);
        onItemsChange([...items, created]);
        notify(`${meta.singular}을(를) 추가했습니다.`);
      }
      setDraft(null);
    } catch (err) {
      notify(err instanceof Error ? err.message : "저장하지 못했습니다.", "error");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (item: Item) => {
    const name = String((item as unknown as Record<string, unknown>)[meta.titleKey] ?? "");
    if (!window.confirm(`'${name}' 항목을 삭제할까요? 삭제하면 되돌릴 수 없습니다.`)) return;
    setBusyId(item.id);
    try {
      await store.deleteItem(kind, item);
      onItemsChange(items.filter((i) => i.id !== item.id));
      notify("삭제했습니다.");
    } catch (err) {
      notify(err instanceof Error ? err.message : "삭제하지 못했습니다.", "error");
    } finally {
      setBusyId(null);
    }
  };

  /** Swaps the display order of two neighbours. */
  const move = async (index: number, dir: -1 | 1) => {
    const a = items[index];
    const b = items[index + dir];
    if (!a || !b) return;
    const ao = Number((a as { order?: number }).order ?? index);
    const bo = Number((b as { order?: number }).order ?? index + dir);
    setBusyId(a.id);
    try {
      const savedA = await store.updateItem(kind, { ...a, order: bo === ao ? ao + dir : bo } as Item);
      const savedB = await store.updateItem(kind, { ...b, order: ao } as Item);
      const next = [...items];
      next[index] = savedB;
      next[index + dir] = savedA;
      onItemsChange(next);
    } catch (err) {
      notify(err instanceof Error ? err.message : "순서를 바꾸지 못했습니다.", "error");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="apanel">
      <div className="apanel__head">
        <div>
          <h2>{meta.label}</h2>
          <p>{items.length}개 항목 · 위에서부터 순서대로 표시됩니다.</p>
        </div>
        <button type="button" className="abtn" onClick={() => setDraft(emptyItem(kind, nextOrder))}>
          + {meta.singular} 추가
        </button>
      </div>

      {items.length === 0 ? (
        <p className="anotice">등록된 항목이 없습니다. 이 섹션은 메인 페이지에서 숨겨집니다.</p>
      ) : (
        <ul className="alist">
          {items.map((item, i) => {
            const rec = item as unknown as Record<string, unknown>;
            const img = rec.image as { url?: string } | null | undefined;
            return (
              <li key={item.id} className={busyId === item.id ? "is-busy" : ""}>
                {kind === "projects" && (
                  <span className="alist__thumb" style={{ background: String(rec.accent || "#f5a54a") }}>
                    {img?.url && <img src={`${img.url}/style3`} alt="" />}
                  </span>
                )}
                <div className="alist__text">
                  <strong>{String(rec[meta.titleKey] ?? "(제목 없음)")}</strong>
                  <span>{subtitle(kind, rec)}</span>
                </div>
                <div className="alist__actions">
                  <button type="button" className="abtn abtn--icon" aria-label="위로" disabled={i === 0 || !!busyId} onClick={() => move(i, -1)}>
                    ↑
                  </button>
                  <button
                    type="button"
                    className="abtn abtn--icon"
                    aria-label="아래로"
                    disabled={i === items.length - 1 || !!busyId}
                    onClick={() => move(i, 1)}
                  >
                    ↓
                  </button>
                  <button type="button" className="abtn abtn--ghost" disabled={!!busyId} onClick={() => setDraft({ ...rec })}>
                    수정
                  </button>
                  <button type="button" className="abtn abtn--danger" disabled={!!busyId} onClick={() => remove(item)}>
                    삭제
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {draft && (
        <div className="amodal" role="dialog" aria-modal="true" aria-label={`${meta.singular} 편집`}>
          <form className="amodal__card" onSubmit={save}>
            <h3>
              {meta.singular} {draft.id ? "수정" : "추가"}
            </h3>
            <div className="amodal__fields">
              {meta.fields.map((f) => (
                <FieldInput
                  key={f.key}
                  field={f}
                  value={draft[f.key]}
                  onChange={(v) => setDraft((d) => (d ? { ...d, [f.key]: v } : d))}
                  onUpload={store.uploadImage?.bind(store)}
                />
              ))}
            </div>
            <div className="amodal__actions">
              <button type="button" className="abtn abtn--ghost" onClick={() => setDraft(null)} disabled={!!busyId}>
                취소
              </button>
              <button type="submit" className="abtn" disabled={!!busyId}>
                {busyId ? "저장 중…" : "저장하고 게시"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
