"use client";

import { useEffect, useRef, useState } from "react";
import { ParticleEngine } from "@/lib/particles/engine";
import { PARTICLE_LIMITS } from "@/lib/content/types";
import CssParticles from "./CssParticles";

type Props = {
  word: string;
  desktopCount: number;
  mobileCount: number;
  /** Wait for the configured counts before creating GPU buffers. */
  ready: boolean;
};

type Status = "pending" | "gpu" | "fallback";

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(n)));

function isMobileViewport() {
  return window.matchMedia("(max-width: 768px), (pointer: coarse)").matches;
}

function pickCount(desktop: number, mobile: number) {
  return isMobileViewport()
    ? clamp(mobile, PARTICLE_LIMITS.mobile.min, PARTICLE_LIMITS.mobile.max)
    : clamp(desktop, PARTICLE_LIMITS.desktop.min, PARTICLE_LIMITS.desktop.max);
}

export default function ParticleHero({ word, desktopCount, mobileCount, ready }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<ParticleEngine | null>(null);
  const countsRef = useRef({ desktopCount, mobileCount });
  const wordRef = useRef(word);
  const [status, setStatus] = useState<Status>("pending");
  const [hint, setHint] = useState(false);
  const [touch, setTouch] = useState(false);
  const hintTimer = useRef(0);

  countsRef.current = { desktopCount, mobileCount };
  wordRef.current = word;

  // create the engine once
  useEffect(() => {
    if (!ready) return;
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    if (!ParticleEngine.isSupported()) {
      setStatus("fallback");
      return;
    }

    const engine = new ParticleEngine(canvas);
    engineRef.current = engine;
    let raf = 0;
    let visible = true;
    let running = false;
    let size = { w: 1, h: 1 };
    let lastScrollY = window.scrollY;
    const cleanups: (() => void)[] = [];

    const measure = () => {
      const rect = wrap.getBoundingClientRect();
      size = { w: rect.width, h: rect.height };
      const dpr = Math.min(window.devicePixelRatio || 1, isMobileViewport() ? 1.5 : 2);
      engine.resize(rect.width, rect.height, dpr);
    };

    const loop = (t: number) => {
      engine.frame(t, size.w, size.h);
      raf = requestAnimationFrame(loop);
    };
    const start = () => {
      if (running || !visible || document.hidden) return;
      running = true;
      engine.resetClock();
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    const { desktopCount: d, mobileCount: m } = countsRef.current;
    engine
      .init(pickCount(d, m), wordRef.current)
      .then((ok) => {
        if (!ok) {
          setStatus("fallback");
          return;
        }
        setStatus("gpu");
        measure();

        const ro = new ResizeObserver(() => {
          measure();
          const c = countsRef.current;
          engine.setCount(pickCount(c.desktopCount, c.mobileCount));
        });
        ro.observe(wrap);
        cleanups.push(() => ro.disconnect());

        // pause while the hero is off screen or the tab is hidden
        const io = new IntersectionObserver(([entry]) => {
          visible = entry.isIntersecting;
          if (visible) start();
          else stop();
        });
        io.observe(wrap);
        cleanups.push(() => io.disconnect());

        const onVisibility = () => (document.hidden ? stop() : start());
        document.addEventListener("visibilitychange", onVisibility);
        cleanups.push(() => document.removeEventListener("visibilitychange", onVisibility));

        const onScroll = () => {
          const y = window.scrollY;
          engine.scrollVelocity += y - lastScrollY;
          lastScrollY = y;
          engine.scrollProgress = Math.min(1, Math.max(0, y / Math.max(1, size.h)));
          // scrolling stirs the field; tell the visitor it follows the pointer too
          setHint(true);
          window.clearTimeout(hintTimer.current);
          hintTimer.current = window.setTimeout(() => setHint(false), 2600);
        };
        window.addEventListener("scroll", onScroll, { passive: true });
        cleanups.push(() => window.removeEventListener("scroll", onScroll));

        start();
      })
      .catch((err) => {
        console.warn("[hero]", err);
        setStatus("fallback");
      });

    setTouch(isMobileViewport());
    return () => {
      stop();
      window.clearTimeout(hintTimer.current);
      cleanups.forEach((fn) => fn());
      engine.destroy();
      engineRef.current = null;
    };
  }, [ready]);

  // apply count changes without rebuilding the pipelines
  useEffect(() => {
    engineRef.current?.setCount(pickCount(desktopCount, mobileCount));
  }, [desktopCount, mobileCount]);

  useEffect(() => {
    engineRef.current?.setWord(word);
  }, [word]);

  // pointer tracking (mouse and touch)
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || status !== "gpu") return;
    const update = (e: PointerEvent) => {
      const engine = engineRef.current;
      if (!engine) return;
      const rect = wrap.getBoundingClientRect();
      engine.pointer = { x: e.clientX - rect.left, y: e.clientY - rect.top, active: true };
    };
    const leave = () => {
      if (engineRef.current) engineRef.current.pointer = { ...engineRef.current.pointer, active: false };
    };
    const up = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") leave();
    };
    window.addEventListener("pointermove", update, { passive: true });
    window.addEventListener("pointerdown", update, { passive: true });
    wrap.addEventListener("pointerleave", leave);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", leave);
    return () => {
      window.removeEventListener("pointermove", update);
      window.removeEventListener("pointerdown", update);
      wrap.removeEventListener("pointerleave", leave);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", leave);
    };
  }, [status]);

  return (
    <div ref={wrapRef} className="hero-canvas" data-status={status}>
      {status === "fallback" ? <CssParticles word={word} /> : <canvas ref={canvasRef} aria-hidden="true" />}
      {status === "gpu" && (
        <p className={`hero-hint ${hint ? "is-visible" : ""}`} aria-hidden="true">
          <span className="hero-hint__dot" />
          {touch ? "빛이 손끝을 따라 움직입니다 — 화면을 터치해 보세요" : "빛이 커서를 따라 움직입니다 — 마우스를 움직여 보세요"}
        </p>
      )}
    </div>
  );
}
