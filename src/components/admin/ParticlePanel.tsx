"use client";

import { useState } from "react";
import { PARTICLE_LIMITS, type SiteSettings } from "@/lib/content/types";

type Props = {
  settings: SiteSettings;
  onSave: (next: SiteSettings) => Promise<void>;
};

const PRESETS = [
  { label: "가볍게", desktop: 20000, mobile: 6000, note: "오래된 노트북·저사양 기기까지 고려" },
  { label: "권장", desktop: 50000, mobile: 15000, note: "대부분의 기기에서 부드럽게 동작" },
  { label: "풍성하게", desktop: 100000, mobile: 25000, note: "고성능 PC·최신 스마트폰 위주" },
];

const fmt = (n: number) => n.toLocaleString("ko-KR");

function CountControl({
  label,
  device,
  value,
  onChange,
}: {
  label: string;
  device: "desktop" | "mobile";
  value: number;
  onChange: (n: number) => void;
}) {
  const lim = PARTICLE_LIMITS[device];
  const clamp = (n: number) => Math.min(lim.max, Math.max(lim.min, Math.round(n / lim.step) * lim.step));
  return (
    <div className="pcount">
      <div className="pcount__head">
        <label htmlFor={`pc-${device}`}>{label}</label>
        <output>{fmt(value)}개</output>
      </div>
      <input
        id={`pc-${device}`}
        type="range"
        min={lim.min}
        max={lim.max}
        step={lim.step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <div className="pcount__range">
        <span>{fmt(lim.min)}</span>
        <input
          type="number"
          aria-label={`${label} 직접 입력`}
          min={lim.min}
          max={lim.max}
          step={lim.step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          onBlur={(e) => onChange(clamp(Number(e.target.value)))}
        />
        <span>{fmt(lim.max)}</span>
      </div>
    </div>
  );
}

export default function ParticlePanel({ settings, onSave }: Props) {
  const [desktop, setDesktop] = useState(settings.particleCountDesktop);
  const [mobile, setMobile] = useState(settings.particleCountMobile);
  const [saving, setSaving] = useState(false);

  const valid =
    desktop >= PARTICLE_LIMITS.desktop.min &&
    desktop <= PARTICLE_LIMITS.desktop.max &&
    mobile >= PARTICLE_LIMITS.mobile.min &&
    mobile <= PARTICLE_LIMITS.mobile.max;
  const dirty = desktop !== settings.particleCountDesktop || mobile !== settings.particleCountMobile;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setSaving(true);
    try {
      await onSave({ ...settings, particleCountDesktop: desktop, particleCountMobile: mobile });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="apanel" onSubmit={submit}>
      <div className="apanel__head">
        <div>
          <h2>히어로 파티클</h2>
          <p>메인 화면의 빛 입자 개수입니다. 화면이 좁거나 터치 기기면 모바일 값이 적용됩니다.</p>
        </div>
      </div>

      <div className="presets">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            className={`preset ${p.desktop === desktop && p.mobile === mobile ? "is-active" : ""}`}
            onClick={() => {
              setDesktop(p.desktop);
              setMobile(p.mobile);
            }}
          >
            <strong>{p.label}</strong>
            <span>
              PC {fmt(p.desktop)} · 모바일 {fmt(p.mobile)}
            </span>
            <small>{p.note}</small>
          </button>
        ))}
      </div>

      <div className="agroup__fields">
        <CountControl label="PC 파티클 개수" device="desktop" value={desktop} onChange={setDesktop} />
        <CountControl label="모바일 파티클 개수" device="mobile" value={mobile} onChange={setMobile} />
      </div>

      {!valid && <p className="field__error">허용 범위 안의 값을 입력해 주세요.</p>}
      {desktop > 100000 && <p className="anotice">10만 개를 넘으면 내장 그래픽 노트북에서 화면이 끊길 수 있습니다.</p>}

      <div className="apanel__save">
        <a className="abtn abtn--ghost" href="/" target="_blank" rel="noreferrer">
          사이트에서 확인
        </a>
        <button type="submit" className="abtn" disabled={!dirty || !valid || saving}>
          {saving ? "저장 중…" : "저장하고 게시"}
        </button>
      </div>
    </form>
  );
}
