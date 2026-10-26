// Instanced soft-glow sprites read straight from the simulation buffer.

struct Particle {
  pos  : vec2f,
  vel  : vec2f,
  home : vec2f,
  seed : f32,
  kind : f32,
};

struct View {
  viewProj  : mat4x4f,
  viewport  : vec2f,
  pointSize : f32,
  time      : f32,
};

@group(0) @binding(0) var<storage, read> particles : array<Particle>;
@group(0) @binding(1) var<uniform> view : View;

struct VSOut {
  @builtin(position) position : vec4f,
  @location(0) uv    : vec2f,
  @location(1) color : vec3f,
  @location(2) alpha : f32,
};

const CORNERS = array<vec2f, 6>(
  vec2f(-1.0, -1.0), vec2f(1.0, -1.0), vec2f(-1.0, 1.0),
  vec2f(-1.0,  1.0), vec2f(1.0, -1.0), vec2f(1.0,  1.0)
);

// warm amber -> champagne -> cool white palette
fn palette(t : f32) -> vec3f {
  let amber = vec3f(1.00, 0.58, 0.22);
  let gold  = vec3f(1.00, 0.82, 0.52);
  let white = vec3f(0.86, 0.92, 1.00);
  if (t < 0.5) {
    return mix(amber, gold, t * 2.0);
  }
  return mix(gold, white, (t - 0.5) * 2.0);
}

@vertex
fn vs(@builtin(vertex_index) vi : u32, @builtin(instance_index) ii : u32) -> VSOut {
  let p = particles[ii];
  let corner = CORNERS[vi];

  let speed = length(p.vel);
  let excite = clamp(speed * 0.9, 0.0, 1.0);
  let twinkle = 0.75 + 0.25 * sin(view.time * (1.5 + p.seed * 3.0) + p.seed * 60.0);

  var size = view.pointSize * (0.6 + p.seed * 0.8);
  var alpha = 0.95 * twinkle;
  var color = palette(fract(p.seed * 1.7 + excite * 0.45));
  if (p.kind > 0.5) {
    // ambient field: dim violet-blue dust
    size = size * 0.85;
    alpha = 0.42 * twinkle;
    color = mix(vec3f(0.42, 0.36, 0.95), vec3f(0.62, 0.55, 1.0), p.seed);
  }
  size = size * (1.0 + excite * 0.8);
  alpha = min(alpha + excite * 0.5, 1.0);

  let clip = view.viewProj * vec4f(p.pos, 0.0, 1.0);
  let offset = corner * size / view.viewport * 2.0 * clip.w;

  var out : VSOut;
  out.position = vec4f(clip.xy + offset, clip.z, clip.w);
  out.uv = corner;
  out.color = mix(color, vec3f(1.0, 0.97, 0.92), excite * 0.6);
  out.alpha = alpha;
  return out;
}

@fragment
fn fs(in : VSOut) -> @location(0) vec4f {
  let d = length(in.uv);
  if (d > 1.0) {
    discard;
  }
  let core = exp(-d * d * 5.5);
  let a = core * in.alpha;
  return vec4f(in.color * a, a);
}
