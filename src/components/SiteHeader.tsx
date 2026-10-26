"use client";

import { useEffect, useState } from "react";

const NAV = [
  { href: "#studio", label: "스튜디오" },
  { href: "#services", label: "서비스" },
  { href: "#projects", label: "프로젝트" },
  { href: "#process", label: "프로세스" },
  { href: "#contact", label: "문의" },
];

export default function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
  }, [open]);

  return (
    <header className={`site-header ${scrolled ? "is-scrolled" : ""} ${open ? "is-open" : ""}`}>
      <div className="container site-header__inner">
        <a href="#top" className="brand" onClick={() => setOpen(false)}>
          <span className="brand__mark" aria-hidden="true" />
          LUMEA
        </a>
        <nav className="site-nav" aria-label="주요 메뉴">
          {NAV.map((n) => (
            <a key={n.href} href={n.href} onClick={() => setOpen(false)}>
              {n.label}
            </a>
          ))}
          <a href="#contact" className="btn btn--small site-nav__cta" onClick={() => setOpen(false)}>
            상담 예약
          </a>
        </nav>
        <button
          type="button"
          className="menu-toggle"
          aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span />
          <span />
        </button>
      </div>
    </header>
  );
}
