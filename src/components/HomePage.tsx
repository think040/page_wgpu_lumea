"use client";

import { useEffect } from "react";
import ParticleHero from "./ParticleHero";
import SiteHeader from "./SiteHeader";
import { ArrowIcon, ServiceGlyph } from "./Icons";
import { useSiteData } from "@/lib/content/useSiteData";
import type { Project } from "@/lib/content/types";

function Lines({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <>
      {lines.map((l, i) => (
        <span key={i}>
          {l}
          {i < lines.length - 1 && <br />}
        </span>
      ))}
    </>
  );
}

function Paragraphs({ text }: { text: string }) {
  return (
    <>
      {text
        .split(/\n{2,}/)
        .filter(Boolean)
        .map((p, i) => (
          <p key={i}>
            <Lines text={p} />
          </p>
        ))}
    </>
  );
}

function ProjectVisual({ project }: { project: Project }) {
  if (project.image?.url) {
    // 640px preset keeps cards sharp without loading the original
    return <img src={`${project.image.url}/style8`} alt={project.title} loading="lazy" />;
  }
  return (
    <div className="project-card__placeholder" style={{ ["--accent" as string]: project.accent || "#f5a54a" }} aria-hidden="true">
      <span className="ph-glow" />
      <span className="ph-ring" />
    </div>
  );
}

/** Fades sections in as they enter the viewport. */
function useReveal(dep: unknown) {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>("[data-reveal]");
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-revealed");
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.12 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [dep]);
}

export default function HomePage() {
  const { data, ready } = useSiteData();
  const s = data.settings;
  useReveal(data);

  const stats = [
    [s.stat1Value, s.stat1Label],
    [s.stat2Value, s.stat2Label],
    [s.stat3Value, s.stat3Label],
  ].filter(([v]) => v);

  return (
    <>
      <SiteHeader />
      <main id="top">
        <section className="hero">
          <ParticleHero
            word={s.heroWordmark || "LUMEA"}
            desktopCount={s.particleCountDesktop}
            mobileCount={s.particleCountMobile}
            ready={ready}
          />
          <div className="hero__vignette" aria-hidden="true" />
          {/* the canvas wordmark is decorative; keep the brand name readable for assistive tech */}
          <p className="visually-hidden">{s.heroWordmark || "LUMEA"}</p>
          <div className="container hero__content">
            {s.heroEyebrow && <p className="eyebrow">{s.heroEyebrow}</p>}
            <h1 className="hero__title">
              <Lines text={s.heroTitle} />
            </h1>
            {s.heroSubtitle && <p className="hero__subtitle">{s.heroSubtitle}</p>}
            <div className="hero__actions">
              <a href="#contact" className="btn">
                {s.heroCtaLabel || "프로젝트 문의하기"} <ArrowIcon />
              </a>
              <a href="#projects" className="btn btn--ghost">
                작업 보기
              </a>
            </div>
          </div>
          <a href="#studio" className="scroll-cue" aria-label="아래로 스크롤">
            <span>SCROLL</span>
            <i />
          </a>
        </section>

        <section id="studio" className="section studio">
          <div className="container studio__grid" data-reveal>
            <div>
              <p className="eyebrow">STUDIO</p>
              <h2 className="section-title">{s.aboutTitle}</h2>
            </div>
            <div className="studio__body">
              <Paragraphs text={s.aboutBody} />
              {stats.length > 0 && (
                <dl className="stats">
                  {stats.map(([v, l], i) => (
                    <div key={i}>
                      <dt>{v}</dt>
                      <dd>{l}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          </div>
        </section>

        {data.services.length > 0 && (
          <section id="services" className="section">
            <div className="container">
              <div className="section-head" data-reveal>
                <p className="eyebrow">SERVICES</p>
                <h2 className="section-title">공간에 맞는 빛을, 처음부터 끝까지</h2>
              </div>
              <ul className="service-grid" data-reveal>
                {data.services.map((svc) => (
                  <li key={svc.id} className="service-card">
                    <span className="service-card__icon">
                      <ServiceGlyph name={svc.icon} />
                    </span>
                    <h3>{svc.title}</h3>
                    <p>{svc.summary}</p>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {data.projects.length > 0 && (
          <section id="projects" className="section section--dark">
            <div className="container">
              <div className="section-head" data-reveal>
                <p className="eyebrow">SELECTED WORKS</p>
                <h2 className="section-title">빛으로 완성한 공간들</h2>
              </div>
              <ul className="project-grid">
                {data.projects.map((p) => (
                  <li key={p.id} className="project-card" data-reveal>
                    <div className="project-card__media">
                      <ProjectVisual project={p} />
                      <span className="project-card__tag">{p.category}</span>
                    </div>
                    <div className="project-card__body">
                      <h3>{p.title}</h3>
                      <p className="project-card__meta">
                        {[p.location, p.year].filter(Boolean).join(" · ")}
                      </p>
                      {p.description && <p>{p.description}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {data.process.length > 0 && (
          <section id="process" className="section">
            <div className="container">
              <div className="section-head" data-reveal>
                <p className="eyebrow">PROCESS</p>
                <h2 className="section-title">빛이 완성되기까지</h2>
              </div>
              <ol className="process-list">
                {data.process.map((step, i) => (
                  <li key={step.id} data-reveal>
                    <span className="process-list__num">{String(i + 1).padStart(2, "0")}</span>
                    <h3>{step.title}</h3>
                    <p>{step.description}</p>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        )}

        {data.testimonials.length > 0 && (
          <section className="section section--warm">
            <div className="container">
              <div className="section-head" data-reveal>
                <p className="eyebrow">VOICES</p>
                <h2 className="section-title">함께한 분들의 이야기</h2>
              </div>
              <ul className="quote-grid">
                {data.testimonials.map((t) => (
                  <li key={t.id} className="quote-card" data-reveal>
                    <blockquote>“{t.quote}”</blockquote>
                    <p className="quote-card__who">
                      <strong>{t.author}</strong>
                      {t.role && <span>{t.role}</span>}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        <section id="contact" className="section contact">
          <div className="container contact__grid" data-reveal>
            <div>
              <p className="eyebrow">CONTACT</p>
              <h2 className="section-title">
                당신의 공간에
                <br />
                어떤 빛이 필요할까요?
              </h2>
              <p className="contact__lead">공간의 용도와 일정만 알려주시면, 2영업일 안에 초기 제안을 드립니다.</p>
              {s.email && (
                <a className="btn" href={`mailto:${s.email}?subject=${encodeURIComponent("[Lumea] 조명 디자인 문의")}`}>
                  메일로 문의하기 <ArrowIcon />
                </a>
              )}
            </div>
            <dl className="contact__info">
              {s.email && (
                <div>
                  <dt>Email</dt>
                  <dd>
                    <a href={`mailto:${s.email}`}>{s.email}</a>
                  </dd>
                </div>
              )}
              {s.phone && (
                <div>
                  <dt>Tel</dt>
                  <dd>
                    <a href={`tel:${s.phone.replace(/[^0-9+]/g, "")}`}>{s.phone}</a>
                  </dd>
                </div>
              )}
              {s.address && (
                <div>
                  <dt>Studio</dt>
                  <dd>
                    <Lines text={s.address} />
                  </dd>
                </div>
              )}
              {s.hours && (
                <div>
                  <dt>Hours</dt>
                  <dd>{s.hours}</dd>
                </div>
              )}
              {s.instagram && (
                <div>
                  <dt>Instagram</dt>
                  <dd>
                    <a href={s.instagram} target="_blank" rel="noreferrer">
                      {s.instagram.replace(/^https?:\/\/(www\.)?/, "")}
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container site-footer__inner">
          <a href="#top" className="brand">
            <span className="brand__mark" aria-hidden="true" />
            LUMEA
          </a>
          <p>© {new Date().getFullYear()} Lumea Lighting Studio. All rights reserved.</p>
          <a href="/admin/" className="admin-link">
            관리자
          </a>
        </div>
      </footer>
    </>
  );
}
