import { PARTICLE_LIMITS, PROJECT_CATEGORIES, SERVICE_ICONS, type CollectionKey } from "./types";

export type FieldKind = "text" | "textarea" | "number" | "select" | "color" | "image";

export type FieldDef = {
  key: string;
  label: string;
  kind: FieldKind;
  required?: boolean;
  maxLength?: number;
  min?: number;
  max?: number;
  step?: number;
  options?: readonly { value: string; label: string }[];
  help?: string;
};

const SHORT = 64; // platform limit for short text values

export const ICON_LABELS: Record<(typeof SERVICE_ICONS)[number], string> = {
  pendant: "펜던트",
  spot: "스포트",
  line: "라인",
  sun: "외관",
  scene: "씬 제어",
  wrench: "유지관리",
};

export const COLLECTIONS: Record<
  CollectionKey,
  { label: string; singular: string; titleKey: string; fields: FieldDef[] }
> = {
  services: {
    label: "서비스",
    singular: "서비스",
    titleKey: "title",
    fields: [
      { key: "title", label: "서비스명", kind: "text", required: true, maxLength: SHORT },
      { key: "summary", label: "설명", kind: "textarea", required: true, maxLength: 400 },
      {
        key: "icon",
        label: "아이콘",
        kind: "select",
        required: true,
        options: SERVICE_ICONS.map((v) => ({ value: v, label: ICON_LABELS[v] })),
      },
      { key: "order", label: "표시 순서", kind: "number", required: true, min: 0, max: 999 },
    ],
  },
  projects: {
    label: "포트폴리오",
    singular: "프로젝트",
    titleKey: "title",
    fields: [
      { key: "title", label: "프로젝트명", kind: "text", required: true, maxLength: SHORT },
      {
        key: "category",
        label: "분야",
        kind: "select",
        required: true,
        options: PROJECT_CATEGORIES.map((v) => ({ value: v, label: v })),
      },
      { key: "location", label: "위치", kind: "text", maxLength: SHORT },
      { key: "year", label: "준공 연도", kind: "number", required: true, min: 1990, max: 2100 },
      { key: "description", label: "소개", kind: "textarea", maxLength: 600 },
      { key: "accent", label: "대표 색상", kind: "color", help: "이미지가 없을 때 카드에 표시되는 빛의 색" },
      { key: "image", label: "대표 이미지", kind: "image" },
      { key: "order", label: "표시 순서", kind: "number", required: true, min: 0, max: 999 },
    ],
  },
  process: {
    label: "진행 과정",
    singular: "단계",
    titleKey: "title",
    fields: [
      { key: "title", label: "단계명", kind: "text", required: true, maxLength: SHORT },
      { key: "description", label: "설명", kind: "textarea", required: true, maxLength: 400 },
      { key: "order", label: "표시 순서", kind: "number", required: true, min: 0, max: 999 },
    ],
  },
  testimonials: {
    label: "고객 후기",
    singular: "후기",
    titleKey: "author",
    fields: [
      { key: "quote", label: "후기 내용", kind: "textarea", required: true, maxLength: 500 },
      { key: "author", label: "작성자", kind: "text", required: true, maxLength: SHORT },
      { key: "role", label: "소속 / 직함", kind: "text", maxLength: SHORT },
      { key: "order", label: "표시 순서", kind: "number", required: true, min: 0, max: 999 },
    ],
  },
};

export const SETTINGS_GROUPS: { id: string; label: string; fields: FieldDef[] }[] = [
  {
    id: "hero",
    label: "메인 히어로",
    fields: [
      {
        key: "heroWordmark",
        label: "파티클 문구",
        kind: "text",
        maxLength: 12,
        help: "히어로 캔버스에 빛 입자로 그려지는 글자입니다. 영문 대문자 4~8자가 가장 잘 보입니다.",
      },
      { key: "heroEyebrow", label: "상단 라벨", kind: "text", maxLength: SHORT },
      { key: "heroTitle", label: "메인 타이틀", kind: "textarea", required: true, maxLength: 120, help: "줄바꿈이 그대로 표시됩니다." },
      { key: "heroSubtitle", label: "서브 문구", kind: "textarea", maxLength: 400 },
      { key: "heroCtaLabel", label: "버튼 문구", kind: "text", maxLength: 32 },
    ],
  },
  {
    id: "about",
    label: "스튜디오 소개",
    fields: [
      { key: "aboutTitle", label: "소개 제목", kind: "text", maxLength: SHORT },
      { key: "aboutBody", label: "소개 본문", kind: "textarea", maxLength: 2000 },
      { key: "stat1Value", label: "지표 1 값", kind: "text", maxLength: 16 },
      { key: "stat1Label", label: "지표 1 설명", kind: "text", maxLength: 32 },
      { key: "stat2Value", label: "지표 2 값", kind: "text", maxLength: 16 },
      { key: "stat2Label", label: "지표 2 설명", kind: "text", maxLength: 32 },
      { key: "stat3Value", label: "지표 3 값", kind: "text", maxLength: 16 },
      { key: "stat3Label", label: "지표 3 설명", kind: "text", maxLength: 32 },
    ],
  },
  {
    id: "contact",
    label: "연락처",
    fields: [
      { key: "email", label: "이메일", kind: "text", maxLength: SHORT },
      { key: "phone", label: "전화번호", kind: "text", maxLength: 32 },
      { key: "address", label: "주소", kind: "textarea", maxLength: 200 },
      { key: "hours", label: "운영 시간", kind: "text", maxLength: SHORT },
      { key: "instagram", label: "인스타그램 주소", kind: "text", maxLength: 300, help: "비워두면 표시되지 않습니다." },
    ],
  },
  {
    id: "particles",
    label: "파티클",
    fields: [
      {
        key: "particleCountDesktop",
        label: "PC 파티클 개수",
        kind: "number",
        required: true,
        min: PARTICLE_LIMITS.desktop.min,
        max: PARTICLE_LIMITS.desktop.max,
        step: PARTICLE_LIMITS.desktop.step,
      },
      {
        key: "particleCountMobile",
        label: "모바일 파티클 개수",
        kind: "number",
        required: true,
        min: PARTICLE_LIMITS.mobile.min,
        max: PARTICLE_LIMITS.mobile.max,
        step: PARTICLE_LIMITS.mobile.step,
      },
    ],
  },
];

/** Every settings field, plus the console label field `title`. */
export const SETTINGS_FIELDS: FieldDef[] = [
  { key: "title", label: "설정 이름", kind: "text", required: true, maxLength: SHORT },
  ...SETTINGS_GROUPS.flatMap((g) => g.fields),
];
