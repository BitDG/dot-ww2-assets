/** One scheduled frame per invalidation; no polling while idle or suspended. */
export function createRenderLoop(draw, continuous = () => false, env = {}) {
  const doc = env.document ?? globalThis.document;
  const request = env.request ?? requestAnimationFrame;
  const cancel = env.cancel ?? cancelAnimationFrame;
  let pending = null, disposed = false, active = true, dirty = false;
  const stats = { frames: 0, invalidations: 0 };
  const schedule = () => {
    if (!disposed && active && !doc.hidden && pending === null && (dirty || continuous())) pending = request(tick);
  };
  function tick(time) {
    pending = null;
    if (disposed || !active || doc.hidden) return;
    dirty = false;
    stats.frames++;
    draw(time);
    schedule();
  }
  const visibility = () => {
    if (doc.hidden) { if (pending !== null) cancel(pending); pending = null; }
    else { dirty = true; schedule(); }
  };
  doc.addEventListener('visibilitychange', visibility);
  return {
    invalidate() { if (disposed) return; stats.invalidations++; dirty = true; schedule(); },
    setActive(value) { active = value; if (!active && pending !== null) { cancel(pending); pending = null; } if (active) { dirty = true; schedule(); } },
    get stats() { return { ...stats, pending: pending !== null, disposed, active, hidden: doc.hidden }; },
    dispose() { disposed = true; if (pending !== null) cancel(pending); pending = null; doc.removeEventListener('visibilitychange', visibility); },
  };
}

/** Preview resolution only; does not change generated geometry or exported textures. */
export function previewPixelRatio(width, height, dpr = globalThis.devicePixelRatio || 1) {
  return Math.min(dpr, 1.5, Math.sqrt(2500000 / Math.max(1, width * height)));
}

export function treeFrameDistance(dimensions, aspect) {
  return Math.max(dimensions[1] * 1.92, Math.max(dimensions[0], dimensions[2]) * 1.72 / Math.max(.1, aspect)) * 1.35;
}
