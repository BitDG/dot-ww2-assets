/** Nonfunctional exterior game prop. All layout numbers are arbitrary art units. */
import * as THREE from 'three';
import {unzlibSync} from 'fflate';
import low from './assets/blender-detail-kit-low.mjs';
import medium from './assets/blender-detail-kit-medium.mjs';
import high from './assets/blender-detail-kit-high.mjs';
import {createDeckFinish} from './deck-finish.mjs';
import {batchRuleLeaves} from './batch.mjs';
import {box,rod,cylinder,ring,disposeTree as disposeRuleTree} from '../rule-kit/geometry.mjs';
import {generateBridge} from '../bridge/src/bridge-core.js';
import {buildCurve} from '../curve-infrastructure/core.mjs';
import {createPortableArmorMaps,PORTABLE_FINISH_DEFAULTS} from '../tank/src/portable-vehicle-finish.mjs';
export function disposeTree(root){
 if(root.userData.disposed)return;const activeTextures=new Set(),activeMaterials=new Set();root.traverse(o=>{if(o.material){activeMaterials.add(o.material);for(const t of Object.values(o.material))if(t?.isTexture)activeTextures.add(t);}});
 for(const t of root.userData.ownedTextures??[])if(!activeTextures.has(t))t.dispose();for(const m of root.userData.ownedMaterials??[])if(!activeMaterials.has(m))m.dispose();disposeRuleTree(root);root.userData.disposed=true;
}
export const defaults=Object.freeze({silhouetteLength:1,silhouetteWidth:1,silhouetteHeight:1,wheelVisualScale:1,shellLengthFactor:1,frameChunkiness:1,detail:'medium',rivetDensity:.55,weathering:.28,paintColor:'#747c80',metalColor:'#727a80',showRails:true,showRailings:true,showStairs:true,showRivets:true,showRearDeck:true,showDecorativeBoxes:true,...PORTABLE_FINISH_DEFAULTS});
export const TIER_BUDGETS={low:{triangles:70000,draws:75},medium:{triangles:200000,draws:90},high:{triangles:360000,draws:110}};
const kits={low,medium,high};
function decode(s,Type){const bytes=unzlibSync(Uint8Array.from(atob(s),c=>c.charCodeAt(0)));return new Type(bytes.buffer,bytes.byteOffset,bytes.byteLength/Type.BYTES_PER_ELEMENT);}
function materials(p,seed){
 const maps=createPortableArmorMaps({seed,weathering:p.weathering,resolution:p.detail==='low'?128:p.detail==='medium'?256:512});
 // Local exterior-art attenuation of the shared tank normal/roughness contrast.
 // Original tank source and painter remain untouched; physical seams come from geometry.
 for(let i=0;i<maps.normal.image.data.length;i+=4){const d=maps.normal.image.data;let x=(d[i]/255*2-1)*.2,y=(d[i+1]/255*2-1)*.2,z=d[i+2]/255*2-1;const n=Math.hypot(x,y,z);d[i]=Math.round((x/n*.5+.5)*255);d[i+1]=Math.round((y/n*.5+.5)*255);d[i+2]=Math.round((z/n*.5+.5)*255);maps.orm.image.data[i+1]=Math.round(174+(maps.orm.image.data[i+1]-174)*.45);}
 for(let i=0;i<maps.albedo.image.data.length;i+=4)for(let c=0;c<3;c++)maps.albedo.image.data[i+c]=Math.round([188,195,199][c]+(maps.albedo.image.data[i+c]-[188,195,199][c])*.55);
 const deckMaps=createDeckFinish({resolution:p.detail==='low'?128:256,weathering:p.weathering});
 const specs={panel:[new THREE.Color(p.paintColor).multiplyScalar(1.12),.66,.28],paint:[p.paintColor,.7,.22],trim:[new THREE.Color(p.paintColor).multiplyScalar(.82),.72,.25],steel:[p.metalColor,.43,.8],dark:['#252b2d',.86,.15],sleeper:['#514f48',.93,0],deck:[new THREE.Color(p.paintColor).multiplyScalar(.8),.91,.2]};
 return Object.fromEntries(Object.entries(specs).map(([name,[color,roughness,metalness]])=>{const m=new THREE.MeshStandardMaterial({color,roughness,metalness});m.name=name;m.userData.appearanceRole=['paint','trim','deck','panel'].includes(name)?'armorPaint':'bare-'+name;
 if(m.userData.appearanceRole==='armorPaint'){m.map=maps.albedo;m.normalMap=maps.normal;m.roughnessMap=m.metalnessMap=maps.orm;}if(name==='deck'){m.map=deckMaps.albedo;m.normalMap=deckMaps.normal;m.roughnessMap=m.metalnessMap=deckMaps.orm;}return [name,m];}));
}
function sourceGeometry(kit){return Object.fromEntries(kit.nodes.filter(n=>n.mesh!==undefined).map(n=>{const p=kit.meshes[n.mesh].primitives[0],g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(decode(p.positions,Float32Array),3));g.setAttribute('normal',new THREE.BufferAttribute(decode(p.normals,Float32Array),3));g.setAttribute('uv',new THREE.BufferAttribute(decode(p.uv,Float32Array),2));g.setIndex(new THREE.BufferAttribute(decode(p.indices,Uint32Array),1));const matrix=new THREE.Matrix4().compose(new THREE.Vector3(...n.position),new THREE.Quaternion(...n.rotation),new THREE.Vector3(...n.scale));g.applyMatrix4(matrix);return [n.name,g];}));}
export function createGustavVisualModel(params={},options={}){
 const p={...defaults,...params},kit=kits[p.detail];if(!kit)throw Error('Unknown detail');
 const seed=String(options.seed??'gustav-art-1'),m=materials(p,seed),geo=sourceGeometry(kit),root=new THREE.Group();root.name='gustav-visual-prop';root.userData.ownedMaterials=Object.values(m);root.userData.ownedTextures=[...new Set(Object.values(m).flatMap(a=>Object.values(a).filter(t=>t?.isTexture)))];
 const L=p.silhouetteLength,W=p.silhouetteWidth,H=p.silhouetteHeight,wheelScale=p.wheelVisualScale,railTop=p.showRails?.34:0,baseline=railTop+.73*wheelScale-.73*H;
 const endStretch=Math.max(L,wheelScale),wheelX=(end,i)=>end*(4.55*L+i*.74*endStretch),endX=end=>end*(6.8*L+2.22*(endStretch-L));
 const pos=([x,y,z])=>[x*L,baseline+y*H,z*W];
 function group(name,parent=root){const g=new THREE.Group();g.name=name;parent.add(g);return g;}
 function mark(o,source){o.castShadow=true;o.receiveShadow=true;o.userData.source=source;return o;}
 function bx(g,id,s,at,mat=m.paint){const mesh=mark(box(g,id,[s[0]*L,s[1]*H,s[2]*W],mat,pos(at)), 'PGF rule-kit box');if(mat===m.deck){const a=mesh.geometry.attributes.position,n=mesh.geometry.attributes.normal,u=mesh.geometry.attributes.uv;for(let i=0;i<a.count;i++){if(n.getY(i)>.5)u.setXY(i,(a.getX(i)+at[0]*L)*1.8,(a.getZ(i)+at[2]*W)*1.8);else u.setXY(i,.001,.001);}}return mesh;}
 function line(g,id,a,b,r=.028,mat=m.trim){return mark(rod(g,id,pos(a),pos(b),r,mat,p.detail==='low'?6:8),'PGF rule-kit rod');}
 function proto(g,id,key,at,scale=[L,H,W],mat=m.paint){const mesh=new THREE.Mesh(geo[key],mat);mesh.name=id;mesh.position.fromArray(at);mesh.scale.fromArray(scale);g.add(mesh);return mark(mesh,'Blender MCP '+key);}
 function railings(g,id,points){
  if(!p.showRailings)return;
  const scaled=points.map((a,i)=>({id:'p'+i,position:pos(a).map(n=>n*5)}));
  const {asset}=buildCurve({seed,params:{lamps:false,fenceHeight:3.4,spacing:p.detail==='low'?7:5},input:{points:scaled}});
  const cache=new Map();for(const source of asset.meshes){const pr=source.primitives[0],g0=new THREE.BufferGeometry();g0.setAttribute('position',new THREE.BufferAttribute(pr.positions,3));g0.setAttribute('normal',new THREE.BufferAttribute(pr.normals,3));g0.setIndex(new THREE.BufferAttribute(pr.indices,1));g0.setAttribute('uv',new THREE.Float32BufferAttribute(Array.from({length:pr.positions.length/3},(_,i)=>[pr.positions[i*3]*.2,pr.positions[i*3+1]*.2]).flat(),2));cache.set(source.id,g0);}
  for(const n of asset.nodes){if(!n.meshId)continue;const mesh=new THREE.Mesh(cache.get(n.meshId),m.trim);mesh.name=id+'-'+n.id;mesh.position.fromArray(n.transform.position.map(v=>v*.2));mesh.quaternion.fromArray(n.transform.rotation);mesh.scale.setScalar(.2);if(n.id.includes('post:')){const shared=g.children.find(o=>o.isMesh&&o.material===mesh.material&&o.name.includes('post:')&&o.position.distanceToSquared(mesh.position)<1e-16);if(shared){root.userData.sharedGuardPosts.push({omitted:mesh.name,retained:shared.name,owner:g.name,reason:'Identical square guard endpoint post shared by adjoining rail paths'});continue;}}g.add(mesh);mark(mesh,'PGF curve-infrastructure buildCurve');}
 }
 const stairGuardConnections=[];root.userData.sharedGuardPosts=[];
 const rails=group('display-rails'),wheels=group('rail-wheel-facades'),frame=group('main-outer-frame'),shell=group('closed-cylinder-shell'),decks=group('walkways'),rear=group('rear-display-deck'),surface=group('surface-decoration');
 if(p.showRails){
  const plan=generateBridge({params:{bridgeType:'steel-girder',spanCount:1,spanLength:26,bridgeWidth:8,trackCount:2,trackSpacing:3.5,trackGauge:1,trackBed:'ballast',supportPillars:false,hasRailings:false,hasCatenary:false}});
  for(const part of plan.parts.filter(a=>/^(sleeper-|clip-|rail-)/.test(a.id))){const t=part.ops.find(a=>a[0]==='t').slice(1),s=part.args,mesh=box(rails,part.id,[s[2]*L,s[1],s[0]*.85*W],part.material==='sleeper'?m.sleeper:m.steel,[t[2]*L,t[1]-.26,t[0]*.85*W]);mark(mesh,'PGF bridge generateBridge rail descriptor');}
 }
 // Each visual wheel is a separate rigid circular part. Long/width sliders affect its center only.
 const wheelCenters=[];
 for(const side of [-1,1])for(const laneSide of [-1,1])for(const end of [-1,1])for(let i=0;i<7;i++){
  const x=wheelX(end,i)/L,z=side*1.4875+laneSide*.45475,y=railTop+.365*wheelScale;
  const name=`wheel-${side}-${laneSide}-${end}-${i}`;proto(wheels,name,'rail-wheel',[x*L,y,z*W],[wheelScale,wheelScale,wheelScale],m.steel);wheelCenters.push({name,center:[x*L,y,z*W],radius:.365*wheelScale});bx(frame,'closed-wheel-backing-'+name,[.18,.44,.12],[x,.9,z-laneSide*.1],m.trim);
 }
 for(const side of [-1,1]){
  const z=side*1.4875;
  for(const end of [-1,1]){
   bx(frame,`end-chassis-${side}-${end}`,[5.1*endStretch/L,.28,1.24],[endX(end)/L,1.02,z]);
   bx(decks,`end-walkway-${side}-${end}`,[5.25*endStretch/L,.12,1.5],[endX(end)/L,1.25,z],m.deck);
   for(const outer of [-1,1])proto(frame,`end-fairing-${side}-${end}-${outer}`,'end-side-fairing',pos([endX(end)/L,1.03,z+outer*.64]),[endStretch,H,W]);
   railings(decks,`end-guard-${side}-${end}`,[[(endX(end)+end*2.5*endStretch)/L,1.31,z+side*.7],[(endX(end)-end*2.5*endStretch)/L,1.31,z+side*.7]]);
  }
  proto(frame,'sloping-shell-'+side,'sloping-side-shell',pos([0,0,side*1.67]),[L,H,W*p.frameChunkiness]);
  bx(frame,'lower-long-beam-'+side,[12.9,.22,.3],[0,1.14,side*1.72]);
  bx(frame,'middle-long-beam-'+side,[11.5,.15,.28],[-.1,1.69,side*1.76]);
  bx(decks,'side-walkway-'+side,[12.2,.12,.72],[-.25,1.45,side*2.04],m.deck);
  railings(decks,'side-low-guard-'+side,[[-6.35,1.51,side*2.37],[5.85,1.51,side*2.37]]);
  railings(decks,'slope-guard-'+side,[[-6.25,1.65,side*1.82],[-1.7,2.82,side*1.82],[2.25,2.82,side*1.82],[5.05,1.85,side*1.82]]);
  // Closed central apron with repeated purely decorative external ribs.
  bx(frame,'central-opaque-apron-'+side,[6.1,1.22,.17],[.3,1.2,side*1.55],m.trim);
  for(let i=0;i<=9;i++){const x=-2.75+i*.68;bx(frame,`apron-rib-${side}-${i}`,[.11,1.37,.23],[x,1.2,side*1.67]);
   if(i<9&&p.detail!=='low'){line(frame,`apron-brace-a-${side}-${i}`,[x+.1,.61,side*1.7],[x+.58,1.68,side*1.7],.035);line(frame,`apron-brace-b-${side}-${i}`,[x+.1,1.68,side*1.7],[x+.58,.61,side*1.7],.035);}}
  bx(decks,'upper-walkway-'+side,[4.4,.13,.85],[.65,3.2,side*1.35],m.deck);
  railings(decks,'upper-guard-'+side,[[-1.55,3.28,side*1.76],[2.85,3.28,side*1.76]]);
  if(p.showStairs){
   for(let i=0;i<9;i++)bx(decks,`step-${side}-${i}`,[.3,.1,.72],[-2.9+i*.16,1.7+i*.175,side*1.3],m.deck);
   for(const edge of [-1,1]){
    const z=side*1.3+edge*.36;proto(decks,`stair-stringer-folded-${side}-${edge}`,'folded-stair-side',pos([-2.24,2.42,z]),[L,H,W],m.trim);
    if(p.showRailings){
     const A=pos([-3.05,2.3,z]),B=pos([-1.52,3.28,z]);B[1]+=.5304;
     const make=(id,a,b,r=.024)=>mark(rod(decks,id,a,b,r,m.trim,p.detail==='low'?6:8),'PGF rule-kit connected exterior handguard');
     make(`stair-continuous-guard-${side}-${edge}`,A,B);
     for(const i of (p.detail==='low'?[0,8]:[0,4,8])){const x=-2.9+i*.16,y=1.75+i*.175,t=(x+3.05)/1.53;const at=pos([x,y,z]),top=[at[0],A[1]+(B[1]-A[1])*t,at[2]];make(`stair-post-${side}-${edge}-${i}`,at,top,.023);}
     if(edge===side){
      const post=decks.children.filter(o=>o.name.startsWith('upper-guard-'+side+'-')&&o.name.includes('post:')).sort((a,b)=>a.position.x-b.position.x)[0];
      if(!post)throw Error('Upper guard connection target is missing');const to=post.position.toArray();to[1]+=.5304;make(`stair-platform-elbow-${side}`,B,to);
      stairGuardConnections.push({side,from:B,to,post:post.name});
      mark(cylinder(decks,'stair-platform-collar-'+side,.041,.082,m.trim,to,12),'PGF rule-kit closed handguard collar');
     }else make(`stair-end-return-${side}`,B,pos([-1.52,3.265,z]));
    }
   }
  }
 }
 bx(frame,'central-cross-deck',[4.3,.25,3.3],[.65,2.92,0]);
 proto(shell,'closed-display-plinth','closed-stepped-plinth',pos([.55,3.4,0]),[L,H,W],m.trim);
 proto(shell,'central-closed-housing','central-outer-housing',pos([.7,4.05,0]),[L,H,W]);
 bx(shell,'rear-upper-box',[.62,.92,1.44],[2.04,4.02,0]);
 bx(shell,'upper-spine',[2.15,.15,.53],[.52,4.82,0],m.trim);
 for(const side of [-1,1]){
  const disk=cylinder(shell,'closed-side-accent-'+side,.24,.035,m.trim,pos([.25,4.2,side*.755]),24);disk.rotation.x=Math.PI/2;mark(disk,'PGF rule-kit closed decorative disc');
  line(shell,'diagonal-exterior-trim-'+side,[-.95,3.82,side*.76],[.86,4.52,side*.73],.027);
  bx(shell,'rear-exterior-panel-'+side,[.53,.54,.035],[1.22,4.05,side*.7]);
 }
 for(const side of [-1,1])for(let i=0;i<12;i++){
  const x=-4.35+i*.68;bx(frame,`open-band-post-${side}-${i}`,[.055,.24,.1],[x,1.825,side*1.7]);
  if(i<11){line(frame,`open-band-cross-a-${side}-${i}`,[x,1.72,side*1.71],[x+.63,1.93,side*1.71],.022);line(frame,`open-band-cross-b-${side}-${i}`,[x,1.93,side*1.71],[x+.63,1.72,side*1.71],.022);}
 }
 // Cylinder consists entirely of closed cosmetic sections and visible collars.
 const nose=1.1-13.1*p.shellLengthFactor,steps=[[nose,-6.7,.26],[-6.7,-4.1,.32],[-4.1,-1.8,.38],[-1.8,1.1,.46]];
 for(const [i,[a,b,r]]of steps.entries()){const ob=cylinder(shell,'closed-silhouette-section-'+i,r*(W+H)/2,(b-a)*L,m.paint,pos([(a+b)/2,4.58,0]),p.detail==='low'?20:p.detail==='medium'?32:48);ob.rotation.z=Math.PI/2;mark(ob,'PGF rule-kit closed cylinder');
  for(const edge of [a+.05,b-.05]){const collar=cylinder(shell,`collar-${i}-${edge}`,r*(W+H)/2+.028,.08*L,m.steel,pos([edge,4.58,0]),32);collar.rotation.z=Math.PI/2;mark(collar,'PGF rule-kit closed cylinder collar');}}
 const cap=cylinder(shell,'opaque-front-recess',.208*(W+H)/2,.004,m.dark,pos([nose-.003,4.58,0]),32);cap.rotation.z=Math.PI/2;mark(cap,'Opaque shallow visual cap; no bore');
 if(p.showRearDeck){
  bx(rear,'rear-elevated-deck',[7.0,.16,3.22],[6.1,3.7,0],m.deck);
  for(const side of [-1,1]){
   bx(rear,'rear-deck-skirt-'+side,[7,.47,.15],[6.1,3.41,side*1.53]);
   railings(rear,'rear-deck-guard-'+side,[[2.6,3.8,side*1.55],[9.6,3.8,side*1.55]]);
   bx(rear,'rear-lower-platform-'+side,[3,.12,1.15],[8.1,2.03,side*1.05],m.deck);
   line(rear,'rear-gantry-'+side,[9.2,1.95,side*1.35],[9.2,6.13,side*1.35],.06);
   line(rear,'gantry-brace-a-'+side,[8.2,3.8,side*1.35],[9.2,5.96,side*1.35],.042);
   line(rear,'gantry-brace-b-'+side,[9.7,3.8,side*1.35],[9.2,5.96,side*1.35],.042);
   bx(rear,'rear-support-'+side,[.18,1.45,.2],[6.9,2.84,side*1.27]);
  }
  bx(rear,'gantry-crossbar',[.22,.16,3.05],[9.2,6.12,0]);
  bx(rear,'rear-closed-hanging-box',[1.65,.9,2.7],[7.7,2.9,0],m.trim);
  if(p.showDecorativeBoxes)for(const [i,[x,z,w,h,d]]of [[4.05,-.45,1.22,.62,.87],[6.3,.45,.62,.82,.69],[7.6,-.43,1.14,.32,.78]].entries()){proto(rear,'decorative-box-'+i,'beveled-utility-case',pos([x,3.79+h/2,z]),[w*L,h/.6*H,d/.8*W]);}
 }


 // Closed stepped external wheel-row covers and paired connecting strips add real depth.
 for(const side of [-1,1])for(const end of [-1,1])for(let i=0;i<7;i++){
  const x=wheelX(end,i)/L,cover=proto(frame,`wheel-frame-cover-${side}-${end}-${i}`,'wheel-frame-cover',pos([x,.91,side*2.23]),[L,H,W],i%2?m.trim:m.paint);if(side<0)cover.rotation.y=Math.PI;
  if(i%2===0&&i<6){const center=(wheelX(end,i)+wheelX(end,i+1))*.5/L;bx(frame,`wheel-row-bridge-${side}-${end}-${i}`,[(.74*endStretch-.30*L)/L,.065,.17],[center,1.115,side*2.23],m.trim);}
 }
 // G3: exterior-only surface hierarchy. All repeats remain deterministic and bounded.
 const quality=p.detail==='low'?0:p.detail==='medium'?1:2;
 if(quality){
  // Painted inset disks distinguish wheel faces from the bare running lip.
  for(const side of [-1,1])for(const laneSide of [-1,1])for(const end of [-1,1])for(let i=0;i<7;i++){
   const x=wheelX(end,i)/L,z=(side*1.4875+laneSide*.45475)*W+laneSide*.135*wheelScale,at=[x*L,railTop+.365*wheelScale,z];
   const disk=proto(surface,`wheel-face-paint-${side}-${laneSide}-${end}-${i}`,'sculpted-wheel-face',at,[wheelScale,wheelScale,wheelScale],m.paint);if(laneSide<0)disk.rotation.y=Math.PI;
   const hub=cylinder(surface,`wheel-face-cap-${side}-${laneSide}-${end}-${i}`,.055*wheelScale,.035*wheelScale,m.steel,[at[0],at[1],z+laneSide*.02*wheelScale],12);hub.rotation.x=Math.PI/2;mark(hub,'PGF rule-kit closed cosmetic cap');
  }
  for(const side of [-1,1]){
   for(const end of [-1,1])for(const offset of [-1.72,0,1.72]){
    const x=(endX(end)+offset*endStretch)/L;
    bx(surface,`end-face-panel-${side}-${end}-${offset}`,[.61,.25,.026],[x,1.38,side*2.2],m.trim);
    bx(surface,`end-face-trim-${side}-${end}-${offset}`,[.5,.026,.045],[x,1.46,side*2.225]);
    if(quality===2)bx(surface,`end-face-label-${side}-${end}-${offset}`,[.28,.05,.038],[x,1.36,side*2.23],m.steel);
   }
   // Sparse geometric seams on the broad upper plate, not a tiled brick texture.
   for(const x of [-1.05,.02,1.12,2.12])bx(surface,`upper-panel-seam-${side}-${x}`,[.018,.68,.035],[x,2.32,side*1.77],m.trim);
   for(let i=0;i<9;i++){
    const x=-2.75+i*.68;
    bx(surface,`rib-foot-${side}-${i}`,[.3,.11,.26],[x,.58,side*1.69]);
    bx(surface,`rib-collar-${side}-${i}`,[.2,.065,.28],[x,1.25,side*1.69],m.trim);
   }
   for(const end of [-1,1]){
    const x=(endX(end)+end*2.63*endStretch)/L;
    bx(surface,`end-bumper-beam-${side}-${end}`,[.17,.2,1.6],[x,1.09,side*1.4875],m.trim);
   }
   // Two closed decorative bosses and straps across the central exterior housing.
   bx(surface,`shell-lower-trim-${side}`,[2.2,.065,.08],[.24,3.62,side*.65],m.trim);
   if(p.showStairs)for(let i=0;i<9;i++){
    const x=-2.9+i*.16,y=1.76+i*.175;
    for(let j=0;j<(quality===1?3:5);j++)bx(surface,`step-tread-${side}-${i}-${j}`,[.23,.008,.018],[x,y,side*1.3-.23+j*(quality===1?.23:.115)],m.dark);
   }
  }
  if(p.showRearDeck)for(const side of [-1,1]){
   bx(surface,'gantry-foot-'+side,[.57,.12,.48],[9.2,2.12,side*1.35],m.trim);
   line(surface,'gantry-lower-brace-'+side,[8.4,2.09,side*1.35],[9.2,3.72,side*1.35],.045);
   line(surface,'gantry-lower-cross-'+side,[9.67,2.09,side*1.35],[9.2,3.72,side*1.35],.045);
   for(let i=0;i<6;i++)bx(surface,`rear-skirt-rib-${side}-${i}`,[.05,.43,.07],[3.1+i*1.12,3.43,side*1.63],m.trim);
  }
  if(p.showRearDeck&&p.showDecorativeBoxes)for(const [i,[x,z,w,h,d]]of [[4.05,-.45,1.22,.62,.87],[6.3,.45,.62,.82,.69],[7.6,-.43,1.14,.32,.78]].entries()){
   for(const e of [-1,1])bx(surface,`box-strap-${i}-${e}`,[.045,h+.09,d+.075],[x+e*w*.32,3.8+h/2,z],m.trim);
   bx(surface,`box-label-${i}`,[w*.4,.075,.026],[x,3.82+h*.65,z+d*.5+.02],m.steel);
  }
 }

 // G4: three visible detail families, parameter-assembled from authored closed prototypes.
 if(quality){
  for(const side of [-1,1]){
   const plate=proto(surface,'layered-central-cladding-'+side,'layered-central-cladding',pos([.65,4.13,side*.78]),[L,H,W],m.panel);if(side<0)plate.rotation.y=Math.PI;
   for(const end of [-1,1])for(let j=0;j<4;j++){
    const x=(endX(end)+(-1.83+j*1.22)*endStretch)/L,cover=proto(surface,`layered-end-cover-${side}-${end}-${j}`,'layered-side-cover',pos([x,1.07,side*2.16]),[endStretch,H*.72,W],j%2?m.paint:m.panel);if(side<0)cover.rotation.y=Math.PI;
    bx(surface,`end-cover-divider-${side}-${end}-${j}`,[.045,.39,.06],[x+.57*endStretch/L,1.06,side*2.23],m.trim);
   }
   for(let j=0;j<9;j++){
    const x=-5.25+j*1.12,top=x< -1.3?1.48+(x+6.3)/5*1.22:x<2.2?2.7:2.7-(x-2.2)/2.9*1.02;
    const bottom=x< -1.3?1.13+(x+6.3)/5*.83:x<2.2?1.96:1.96-(x-2.2)/2.9*.83;
    const cover=proto(surface,`layered-frame-panel-${side}-${j}`,'layered-side-cover',pos([x,(top+bottom)/2,side*1.765]),[L*.86,H*(top-bottom)*1.35,W*.7],j%3===1?m.panel:m.paint);if(side<0)cover.rotation.y=Math.PI;
   }
   for(let j=0;j<10;j++){
    const x=-2.75+j*.68;bx(surface,`rib-flange-${side}-${j}`,[.035,1.28,.06],[x-.07,1.2,side*1.825],m.panel);
    bx(surface,`rib-cap-${side}-${j}`,[.23,.055,.3],[x,1.86,side*1.7],m.trim);
   }
   for(let j=0;j<3;j++){bx(surface,`central-panel-lower-${side}-${j}`,[.66,.22,.05],[-.26+j*.75,3.57,side*.55],m.panel);}
   if(p.showStairs)for(let j=0;j<9;j++)bx(surface,`stair-edge-strip-${side}-${j}`,[.034,.018,.73],[-3.035+j*.16,1.759+j*.175,side*1.3],m.steel);
  }
  if(p.showRearDeck){
   railings(rear,'rear-end-guard',[[9.6,3.8,-1.55],[9.6,3.8,1.55]]);
   for(const side of [-1,1])for(let j=0;j<3;j++){
    const plate=proto(surface,`hanging-box-panel-${side}-${j}`,'layered-side-cover',pos([7.1+j*.6,2.91,side*1.37]),[L*.48,H*1.25,W*.7],m.panel);if(side<0)plate.rotation.y=Math.PI;
   }
   if(p.showDecorativeBoxes){
    for(const [j,[x,z,w,h,d]] of [[4.7,.55,.74,.35,.62],[5.5,-.6,.68,.46,.58],[8.4,.47,.72,.27,.62]].entries()){
     proto(surface,'extra-closed-case-'+j,'beveled-utility-case',pos([x,3.79+h/2,z]),[w*L,h/.6*H,d/.8*W],m.panel);
     bx(surface,'extra-case-label-'+j,[w*.34,.06,.025],[x,3.83+h*.5,z+d*.5+.02],m.steel);
    }
    for(const [j,[x,z,k]]of [[3.2,.3,.8],[6.6,-.65,.72],[8.5,-.64,.68]].entries())proto(surface,'decorative-coil-'+j,'decorative-cable-coil',pos([x,3.805,z]),[k*L,k*H,k*W],m.dark);
    const path=[[4.9,3.805,-.25],[5.15,3.805,-.15],[5.7,3.805,-.2],[5.95,3.805,.1]];for(let j=0;j<path.length-1;j++)line(surface,'loose-surface-cable-'+j,path[j],path[j+1],.023,m.dark);
   }
  }
  // Derive collars from the actual public railing post placements, not an extra spacing estimate.
  for(const g of [decks,rear])for(const ob of [...g.children].filter(o=>o.isMesh&&o.name.includes('post:'))){
   const q=ob.position;mark(box(surface,'foot-'+ob.name,[.13,.035,.13],m.panel,[q.x,q.y+.017,q.z]),'PGF rule-kit railing foot');
   mark(box(surface,'joint-'+ob.name,[.072,.08,.072],m.trim,[q.x,q.y+.5304,q.z]),'PGF rule-kit railing joint');
  }
 }

 if(p.showRivets&&quality&&p.rivetDensity>0){
  const rows=quality===1?3:5,columns=Math.round((quality===1?13:23)*p.rivetDensity);
  for(const side of [-1,1])for(let row=0;row<rows;row++)for(let col=0;col<columns;col++){
   const x=-1.16+(3.28*col/Math.max(1,columns-1)),y=2.02+.6*row/Math.max(1,rows-1);
   const rivet=cylinder(surface,`decorative-rivet-${side}-${row}-${col}`,.021,.017,m.trim,pos([x,y,side*1.78]),quality===1?6:8);rivet.rotation.x=Math.PI/2;mark(rivet,'PGF rule-kit cosmetic rivet head');
  }
  for(const side of [-1,1])for(const end of [-1,1])for(let col=0;col<columns;col++){
   const x=(endX(end)+(-2.15+4.3*col/Math.max(1,columns-1))*endStretch)/L,rivet=cylinder(surface,`end-rivet-${side}-${end}-${col}`,.018,.015,m.trim,pos([x,1.53,side*2.205]),6);rivet.rotation.x=Math.PI/2;mark(rivet,'PGF rule-kit cosmetic rivet head');
  }
 }
 root.userData.pgf={visualOnly:true,unitMeaning:'Unmeasured arbitrary art proportions',hiddenFaces:'Artistic inference',detail:p.detail,kitSha256:kit.sourceSha256,wheelCenters,railTop,stairGuardConnections,sharedGuardPosts:root.userData.sharedGuardPosts,partSource:'PGF rule-kit, bridge rail descriptors, curve-infrastructure; actual Blender MCP exterior prototypes'};
 const referencedGeometry=new Set();root.traverse(o=>{if(o.isMesh)referencedGeometry.add(o.geometry);});for(const g of Object.values(geo))if(!referencedGeometry.has(g))g.dispose();
 if(options.batch!==false)batchRuleLeaves(root);root.updateMatrixWorld(true);return root;
}
