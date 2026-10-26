// Particle simulation: spring back to home, repelled by the pointer
// and by a "ghost" pointer that sweeps through the field while scrolling.

struct Particle {
  pos  : vec2f,
  vel  : vec2f,
  home : vec2f,
  seed : f32,
  kind : f32,   // 0 = wordmark, 1 = ambient field
};

struct Sim {
  mouse         : vec2f,
  ghost         : vec2f,
  shapeOffset   : vec2f,
  dt            : f32,
  time          : f32,
  radius        : f32,
  strength      : f32,
  mouseActive   : f32,
  ghostStrength : f32,
  scrollVel     : f32,
  spread        : f32,
  halfWidth     : f32,
  count         : u32,
};

@group(0) @binding(0) var<storage, read_write> particles : array<Particle>;
@group(0) @binding(1) var<uniform> sim : Sim;

const STIFFNESS : f32 = 7.5;
const DAMPING   : f32 = 4.2;

fn repel(p : vec2f, center : vec2f, radius : f32, strength : f32) -> vec2f {
  let d = p - center;
  let dist = length(d);
  if (dist >= radius || dist < 1e-5) {
    return vec2f(0.0);
  }
  let falloff = 1.0 - dist / radius;
  return (d / dist) * falloff * falloff * strength;
}

fn homeOf(p : Particle) -> vec2f {
  if (p.kind > 0.5) {
    // ambient field spans the whole viewport and drifts slowly
    let drift = vec2f(
      sin(sim.time * 0.11 + p.seed * 40.0),
      cos(sim.time * 0.09 + p.seed * 31.0)
    ) * 0.035;
    return vec2f(p.home.x * sim.halfWidth, p.home.y * 1.35) + drift;
  }
  // the wordmark shimmers slightly and expands with scroll
  let shimmer = vec2f(
    sin(sim.time * 1.7 + p.seed * 51.0),
    cos(sim.time * 1.3 + p.seed * 37.0)
  ) * 0.004;
  return (p.home + shimmer) * sim.spread + sim.shapeOffset;
}

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) gid : vec3u) {
  let i = gid.x;
  if (i >= sim.count) {
    return;
  }

  var p = particles[i];
  let home = homeOf(p);
  let toHome = home - p.pos;

  var acc = toHome * STIFFNESS;
  acc += repel(p.pos, sim.mouse, sim.radius, sim.strength) * sim.mouseActive;
  acc += repel(p.pos, sim.ghost, sim.radius * 1.15, sim.strength) * sim.ghostStrength;

  // scrolling adds a gentle swirl around the word center, scaled to its size
  let rel = (p.pos - sim.shapeOffset) / max(sim.spread, 0.5);
  acc += vec2f(-rel.y, rel.x) * sim.scrollVel * (0.6 + p.seed);

  p.vel = (p.vel + acc * sim.dt) * exp(-DAMPING * sim.dt);
  p.pos = p.pos + p.vel * sim.dt;

  particles[i] = p;
}
