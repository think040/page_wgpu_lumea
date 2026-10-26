"use client";

import { useRef, useState } from "react";
import type { FieldDef } from "@/lib/content/schema";
import type { ImageRef } from "@/lib/content/types";

type Props = {
  field: FieldDef;
  value: unknown;
  onChange: (value: unknown) => void;
  onUpload?: (file: File) => Promise<NonNullable<ImageRef>>;
};

const MAX_IMAGE_MB = 20;

export default function FieldInput({ field, value, onChange, onUpload }: Props) {
  const id = `f-${field.key}`;
  const label = (
    <label htmlFor={id} className="field__label">
      {field.label}
      {field.required && <em aria-label="필수"> *</em>}
    </label>
  );
  const help = field.help && <small className="field__help">{field.help}</small>;
  const str = value === undefined || value === null ? "" : String(value);

  if (field.kind === "textarea") {
    return (
      <div className="field">
        {label}
        <textarea
          id={id}
          value={str}
          required={field.required}
          maxLength={field.maxLength}
          rows={Math.min(8, Math.max(3, Math.ceil((field.maxLength ?? 200) / 160)))}
          onChange={(e) => onChange(e.target.value)}
        />
        <div className="field__foot">
          {help}
          {field.maxLength && (
            <small className="field__count">
              {str.length} / {field.maxLength}
            </small>
          )}
        </div>
      </div>
    );
  }

  if (field.kind === "select") {
    return (
      <div className="field">
        {label}
        <select id={id} value={str} required={field.required} onChange={(e) => onChange(e.target.value)}>
          {!field.required && <option value="">선택 안 함</option>}
          {field.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {help}
      </div>
    );
  }

  if (field.kind === "number") {
    return (
      <div className="field">
        {label}
        <input
          id={id}
          type="number"
          inputMode="numeric"
          value={str}
          required={field.required}
          min={field.min}
          max={field.max}
          step={field.step ?? 1}
          onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
        />
        {help}
      </div>
    );
  }

  if (field.kind === "color") {
    const color = /^#[0-9a-f]{6}$/i.test(str) ? str : "#f5a54a";
    return (
      <div className="field">
        {label}
        <div className="field__color">
          <input id={id} type="color" value={color} onChange={(e) => onChange(e.target.value)} />
          <code>{color}</code>
        </div>
        {help}
      </div>
    );
  }

  if (field.kind === "image") {
    return <ImageField id={id} field={field} value={value as ImageRef} onChange={onChange} onUpload={onUpload} label={label} />;
  }

  return (
    <div className="field">
      {label}
      <input
        id={id}
        type="text"
        value={str}
        required={field.required}
        maxLength={field.maxLength}
        onChange={(e) => onChange(e.target.value)}
      />
      {help}
    </div>
  );
}

function ImageField({
  id,
  value,
  onChange,
  onUpload,
  label,
}: {
  id: string;
  field: FieldDef;
  value: ImageRef;
  onChange: (v: unknown) => void;
  onUpload?: (file: File) => Promise<NonNullable<ImageRef>>;
  label: React.ReactNode;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const pick = async (file: File | undefined) => {
    if (!file || !onUpload) return;
    setError("");
    if (!file.type.startsWith("image/")) {
      setError("이미지 파일만 올릴 수 있습니다.");
      return;
    }
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      setError(`${MAX_IMAGE_MB}MB 이하의 이미지를 선택해 주세요. 큰 사진은 가로 2000px 정도로 줄이면 충분합니다.`);
      return;
    }
    setBusy(true);
    try {
      onChange(await onUpload(file));
    } catch (e) {
      setError(e instanceof Error ? e.message : "업로드에 실패했습니다.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="field">
      {label}
      <div className="field__image">
        <div className="field__thumb">
          {value?.url ? <img src={`${value.url}/style5`} alt="" /> : <span>이미지 없음</span>}
        </div>
        <div className="field__image-actions">
          {onUpload ? (
            <>
              <input
                ref={inputRef}
                id={id}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => pick(e.target.files?.[0])}
              />
              <button type="button" className="abtn abtn--ghost" disabled={busy} onClick={() => inputRef.current?.click()}>
                {busy ? "업로드 중…" : value ? "이미지 교체" : "이미지 업로드"}
              </button>
              {value && (
                <button type="button" className="abtn abtn--text" disabled={busy} onClick={() => onChange(null)}>
                  이미지 빼기
                </button>
              )}
            </>
          ) : (
            <small className="field__help">데모 모드에서는 이미지를 올릴 수 없습니다. 대표 색상으로 표시됩니다.</small>
          )}
          {error && <small className="field__error">{error}</small>}
        </div>
      </div>
    </div>
  );
}
