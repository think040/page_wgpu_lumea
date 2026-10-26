# Lumea — 조명 디자인 스튜디오 샘플 홈페이지

## 실행

```bash
npm install
npm run dev      # http://localhost:3000  (관리자: /admin/)
npm run build    # 정적 결과물 → out/
```

## 구조

| 경로 | 내용 |
|---|---|
| `src/shaders/particles.compute.wgsl` | 파티클 시뮬레이션 (홈 복귀 스프링, 포인터/스크롤 반발, 스크롤 소용돌이) |
| `src/shaders/particles.render.wgsl` | 인스턴스 스프라이트 렌더링 (가산 블렌딩) |
| `src/lib/particles/engine.ts` | GPU 초기화, 버퍼, 카메라·역투영(`wgpu-matrix`) |
| `src/components/ParticleHero.tsx` | 히어로 캔버스, 입력·스크롤 연결, 미지원 시 CSS 폴백 |
| `src/components/HomePage.tsx` | 메인 페이지 섹션 |
| `src/components/admin/*` | 관리자 페이지 (기본 정보, 파티클, 서비스, 포트폴리오, 진행 과정, 고객 후기) |
| `src/lib/weegloo/*` | 공개 읽기(CDA), 관리자 쓰기(CMA), 로그인, 이미지 업로드 |

`.wgsl` 파일은 `next.config.ts`의 로더 설정으로 문자열로 import 됩니다.

## 데이터 모드

- **데모 모드** (`NEXT_PUBLIC_WEEGLOO_SPACE_ID` 미설정): 관리자 변경 내용이 브라우저 `localStorage`에만 저장되고 같은 브라우저의 메인 페이지에 반영됩니다.
- **Weegloo 모드**: `.env.local.example`을 `.env.local`로 복사하고 값을 채우면, 메인 페이지는 게시된 콘텐츠를 읽고 관리자는 Weegloo 계정으로 로그인해 수정·게시합니다.

## Weegloo 콘텐츠 모델 (배포 시 생성 예정)

기본 언어 `ko-KR`. 모든 필드는 기본 언어 버킷에 저장합니다.

| 타입 | 필드 |
|---|---|
| 사이트 설정 (기존, 필드 추가) | title, particleCountDesktop(5,000–150,000), particleCountMobile(2,000–40,000), heroWordmark, heroEyebrow, heroTitle, heroSubtitle, heroCtaLabel, aboutTitle, aboutBody, stat1~3Value/Label, email, phone, address, hours, instagram |
| 서비스 | title, summary, icon(pendant·spot·line·sun·scene·wrench), order |
| 프로젝트 | title, category(주거·상업·호스피탈리티·오피스·전시·공공), location, year, description, accent, image(→Media), order |
| 진행 과정 | title, description, order |
| 고객 후기 | quote, author, role, order |

공개 페이지용 읽기 전용 토큰은 위 5개 타입만 읽을 수 있는 역할에 묶습니다.
