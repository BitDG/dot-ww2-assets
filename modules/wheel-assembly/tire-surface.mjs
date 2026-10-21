import {sampleProfile} from './geometry.mjs';

// One continuous carcass cross-section shared by the lathe and every tread root.
export function createTireSurface(p,d){
  const wall=d.outerRadius-d.rimRadius,depth=p.treadDepthMm*.001;
  const radius=d.outerRadius-depth,crownDrop=Math.min(wall*.12,d.treadHalf**2/(2*p.crownRadiusMm*.001));
  const edgeRadius=radius-crownDrop,slope=2*crownDrop/d.treadHalf;
  const maxAxial=Math.max(d.treadHalf+.004,d.halfWidth+p.sidewallBulgeMm*.001),span=maxAxial-d.treadHalf;
  const available=edgeRadius-d.rimRadius;
  const shoulderDrop=Math.max(.0002,Math.min(p.shoulderRadiusMm*.001,available*.30,available-slope*span-wall*.08));
  const joinRadius=edgeRadius-slope*span-shoulderDrop;
  function crown(x){
    const a=Math.abs(x);let r,dr;
    if(a<=d.treadHalf){r=radius-crownDrop*(a/d.treadHalf)**2;dr=-2*crownDrop*a/d.treadHalf**2;}
    else{const q=Math.min(1-1e-8,(a-d.treadHalf)/span),c=Math.sqrt(1-q*q);r=edgeRadius-slope*span*q-shoulderDrop*(1-c);dr=-slope-shoulderDrop*q/(span*c);}
    const normalLength=Math.hypot(1,dr);return {radius:r,normalAxial:-Math.sign(x)*dr/normalLength,normalRadial:1/normalLength};
  }
  function map(x,circumference,height){
    const s=crown(x),angle=circumference/radius,r=s.radius+s.normalRadial*height;
    return [x+s.normalAxial*height,r*Math.cos(angle),r*Math.sin(angle)];
  }
  function axialAtRadius(r){
    if(r>=edgeRadius)return d.treadHalf*Math.sqrt(Math.max(0,(radius-Math.min(radius,r))/crownDrop));
    if(r<=joinRadius){const t=Math.max(0,Math.min(1,(joinRadius-r)/(joinRadius-d.rimRadius)));return d.beadHalf+(maxAxial-d.beadHalf)*Math.sqrt(1-t*t);}
    let a=0,b=Math.PI/2;
    for(let i=0;i<32;i++){const t=(a+b)/2,rr=edgeRadius-slope*span*Math.sin(t)-shoulderDrop*(1-Math.cos(t));if(rr>r)a=t;else b=t;}
    return d.treadHalf+span*Math.sin((a+b)/2);
  }
  const profileTolerance=Math.min(.00025,d.outerRadius*(1-Math.cos(Math.PI/p.detail)));
  const right=sampleProfile(t=>{const x=d.treadHalf*t;return [x,crown(x).radius];},profileTolerance);
  right.push(...sampleProfile(q=>{const t=q*Math.PI/2;return [d.treadHalf+span*Math.sin(t),edgeRadius-slope*span*Math.sin(t)-shoulderDrop*(1-Math.cos(t))];},profileTolerance).slice(1));
  right.push(...sampleProfile(q=>{const t=q*Math.PI/2;return [d.beadHalf+(maxAxial-d.beadHalf)*Math.cos(t),joinRadius-(joinRadius-d.rimRadius)*Math.sin(t)];},profileTolerance).slice(1));
  const left=right.slice().reverse().map(([x,r])=>[-x,r]);
  const profile=[...left,...right.slice(1),[d.beadHalf,d.rimRadius-.009],[-d.beadHalf,d.rimRadius-.009],left[0]];
  // The analytic circle is outside the lathe facets. Include their maximum sag
  // in the root embedding, even at detail=24, instead of leaving a visible gap.
  const embedding=Math.max(.0015,d.outerRadius*(1-Math.cos(Math.PI/p.detail))+profileTolerance+.001);
  return {radius,edgeRadius,maxAxial,span,crownDrop,embedding,crown,map,axialAtRadius,profile,profileTolerance};
}
