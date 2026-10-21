/** Keep enough depth precision for millimetre fittings at a metre-scale overview.
 * The old radius/10000 near plane quantized depth by centimetres at this range.
 * Shrink near when approaching the asset; far always covers the complete sphere.
 */
export function previewClipPlanes(radius,distance){
  const r=Math.max(.001,radius),d=Math.max(0,distance);
  const near=Math.max(r*1e-5,Math.min(r*.02,Math.max(0,d-r)*.25));
  return {near,far:Math.max(near*100,d+r*2)};
}
