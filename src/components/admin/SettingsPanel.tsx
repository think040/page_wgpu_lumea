"use client";

import { useState } from "react";
import FieldInput from "./FieldInput";
import { SETTINGS_GROUPS } from "@/lib/content/schema";
import type { SiteSettings } from "@/lib/content/types";

type Props = {
  groupIds: string[];
  settings: SiteSettings;
  onSave: (next: SiteSettings) => Promise<void>;
};

export default function SettingsPanel({ groupIds, settings, onSave }: Props) {
  const [form, setForm] = useState<SiteSettings>(settings);
  const [saving, setSaving] = useState(false);
  const groups = SETTINGS_GROUPS.filter((g) => groupIds.includes(g.id));
  const dirty = groups.some((g) => g.fields.some((f) => form[f.key as keyof SiteSettings] !== settings[f.key as keyof SiteSettings]));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="apanel" onSubmit={submit}>
      {groups.map((g) => (
        <fieldset key={g.id} className="agroup">
          <legend>{g.label}</legend>
          <div className="agroup__fields">
            {g.fields.map((f) => (
              <FieldInput
                key={f.key}
                field={f}
                value={form[f.key as keyof SiteSettings]}
                onChange={(v) => setForm((s) => ({ ...s, [f.key]: v }))}
              />
            ))}
          </div>
        </fieldset>
      ))}
      <div className="apanel__save">
        <button type="button" className="abtn abtn--ghost" disabled={!dirty || saving} onClick={() => setForm(settings)}>
          되돌리기
        </button>
        <button type="submit" className="abtn" disabled={!dirty || saving}>
          {saving ? "저장 중…" : "저장하고 게시"}
        </button>
      </div>
    </form>
  );
}
