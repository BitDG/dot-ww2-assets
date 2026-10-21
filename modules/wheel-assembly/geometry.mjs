import {mergeVertices, toCreasedNormals} from 'three/addons/utils/BufferGeometryUtils.js';

/** Consume a geometry and share vertices with matching positions, normals and UVs. */
export function compactGeometry(geometry, creaseAngle) {
  let source = geometry;
  if (creaseAngle !== undefined) {
    source = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    const positions = source.attributes.position;
    source.setAttribute('position', positions.clone());
    // Three's crease helper hashes positions in 1 cm cells. Work in scaled
    // coordinates so separate edges of a sub-mm sipe never share a cell.
    source.scale(10000, 10000, 10000);
    toCreasedNormals(source, creaseAngle);
    source.setAttribute('position', positions);
  }
  const compact = mergeVertices(source, 1e-6);
  compact.userData = geometry.userData;
  compact.computeBoundingBox();
  compact.computeBoundingSphere();
  if (source !== geometry) source.dispose();
  geometry.dispose();
  return compact;
}

/** Sample a curved section until its midpoint deviates by at most tolerance. */
export function sampleProfile(curve, tolerance) {
  const points = [curve(0)];
  function append(a, b, start, end, depth) {
    const middle = (a + b) / 2, point = curve(middle);
    const dx = end[0] - start[0], dy = end[1] - start[1], length = dx * dx + dy * dy;
    const t = length ? Math.max(0, Math.min(1, ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / length)) : 0;
    const error = Math.hypot(point[0] - start[0] - t * dx, point[1] - start[1] - t * dy);
    if (error > tolerance && depth < 16) {
      append(a, middle, start, point, depth + 1);
      append(middle, b, point, end, depth + 1);
    } else points.push(end);
  }
  append(0, 1, points[0], curve(1), 0);
  return points;
}
