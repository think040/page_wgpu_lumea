import type { CSSProperties } from "react";

// Deterministic pseudo-random so every render places the dots the same way.
function rand(i: number, salt: number) {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

type Dot = { left: number; top: number; size: number; delay: number; duration: number };

const FIELD: Dot[] = Array.from({ length: 70 }, (_, i) => ({
  left: rand(i, 4) * 100,
  top: rand(i, 5) * 100,
  size: 1.5 + rand(i, 6) * 2.5,
  delay: -rand(i, 7) * 10,
  duration: 6 + rand(i, 8) * 8,
}));

// sparks scattered over the word band
const SPARKS: Dot[] = Array.from({ length: 46 }, (_, i) => ({
  left: 4 + rand(i, 9) * 92,
  top: 15 + rand(i, 10) * 70,
  size: 2 + rand(i, 11) * 3,
  delay: -rand(i, 12) * 5,
  duration: 2.5 + rand(i, 13) * 3,
}));

function dotStyle(d: Dot): CSSProperties {
  return {
    left: `${d.left}%`,
    top: `${d.top}%`,
    width: d.size,
    height: d.size,
    animationDelay: `${d.delay}s`,
    animationDuration: `${d.duration}s`,
  };
}

/** Lightweight fallback for browsers without the GPU effect. */
export default function CssParticles({ word }: { word: string }) {
  return (
    <div className="css-particles" aria-hidden="true">
      {FIELD.map((d, i) => (
        <span key={`f${i}`} className="css-dot" style={dotStyle(d)} />
      ))}
      <div className="css-word">
        <span className="css-word__text">{word || "LUMEA"}</span>
        {SPARKS.map((d, i) => (
          <span key={`s${i}`} className="css-dot css-dot--spark" style={dotStyle(d)} />
        ))}
      </div>
    </div>
  );
}
