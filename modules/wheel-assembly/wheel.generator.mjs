import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {threeToIR} from '../../generator-sdk/three-ir.mjs';
import {enforceBudget} from './budget.mjs';
import {centerOutline, shoulderOutline, spokeOutline, validateOutline, sampleOutline, shapeFromPoints, crownBlock,reverseWinding} from './spline.mjs';
import {createTireSurface} from './tire-surface.mjs';
import {compactGeometry} from './geometry.mjs';

const TAU = Math.PI * 2;
export const defaults = {
  sectionWidthMm: 225, aspectRatio: 45, rimDiameterIn: 18, rimWidthMm: 203,
  sidewallBulgeMm: 8, shoulderRadiusMm: 30, crownRadiusMm: 400,
  spokeCount: 7, spokeStyle: 'split', treadStyle: 'road', treadDepthMm: 4,
  hubBoreMm: 67, boltCount: 5, boltPcdMm: 114.3, offsetEtMm: 35, detail: 64,
  component: 'assembly', treadPitchCount: 44, treadRows: 4, treadWidthPercent: 84,
  treadLengthPercent: 86, treadStagger: .5, treadSmooth: 0,
  treadPoints: centerOutline, shoulderPoints: shoulderOutline,
  spokePoints: spokeOutline, spokeSmooth: .35, spokeWidthPercent: 100,
  spokeThicknessMm: 0, rimDishMm: 0, rimColor: '#9aa9ad', hubCap: false, machinedFace: false,
  treadSipes: false,
};
export const parameterSchema = {type: 'object', additionalProperties: false, properties: {
  sectionWidthMm: {type: 'number', title: '胎宽 · mm', minimum: 80, maximum: 420},
  aspectRatio: {type: 'number', title: '扁平比 · %', minimum: 25, maximum: 90},
  rimDiameterIn: {type: 'number', title: '轮辋直径 · 英寸', minimum: 8, maximum: 26},
  rimWidthMm: {type: 'number', title: '轮辋宽度 · mm', minimum: 65, maximum: 350},
  sidewallBulgeMm: {type: 'number', title: '胎侧鼓起 · mm', minimum: 0, maximum: 25},
  shoulderRadiusMm: {type: 'number', title: '胎肩圆角 · mm', minimum: 5, maximum: 60},
  crownRadiusMm: {type: 'number', title: '胎冠半径 · mm', minimum: 150, maximum: 1200},
  spokeCount: {type: 'integer', title: '轮辐数', minimum: 4, maximum: 16},
  spokeStyle: {type: 'string', title: '轮辐', enum: ['straight', 'split', 'turbine', 'y', 'curved', 'custom']},
  treadStyle: {type: 'string', title: '胎面', enum: ['road', 'all-terrain', 'robot', 'reference', 'custom']},
  treadDepthMm: {type: 'number', title: '胎纹深度 · mm', minimum: 0.5, maximum: 16},
  hubBoreMm: {type: 'number', title: '中心孔 · mm', minimum: 10, maximum: 130},
  boltCount: {type: 'integer', title: '螺栓孔数', minimum: 3, maximum: 8},
  boltPcdMm: {type: 'number', title: '孔距圆 · mm', minimum: 35, maximum: 220},
  offsetEtMm: {type: 'number', title: 'ET 偏距 · mm', minimum: -80, maximum: 80},
  detail: {type: 'integer', title: '圆周精度', minimum: 24, maximum: 96},
  component: {type:'string',title:'预览 / 导出组件',enum:['assembly','tire','rim']},
  treadPitchCount: {type:'integer',title:'圆周胎块单元数',minimum:16,maximum:80},
  treadRows: {type:'integer',title:'自定义胎块列数',minimum:1,maximum:6},
  treadWidthPercent: {type:'number',title:'胎块宽度 · %',minimum:30,maximum:96},
  treadLengthPercent: {type:'number',title:'胎块长度 · %',minimum:30,maximum:96},
  treadStagger: {type:'number',title:'相邻列错位',minimum:0,maximum:1},
  treadSmooth: {type:'number',title:'胎块样条平滑度',minimum:0,maximum:1},
  treadPoints: outlineSchema('中心胎块轮廓'), shoulderPoints: outlineSchema('胎肩胎块轮廓'),
  spokePoints: outlineSchema('自定义轮辐轮廓'),
  spokeSmooth: {type:'number',title:'轮辐样条平滑度',minimum:0,maximum:1},
  spokeWidthPercent: {type:'number',title:'轮辐宽度 · %',minimum:40,maximum:360},
  spokeThicknessMm: {type:'number',title:'轮辐厚度 · mm（0 自动）',minimum:0,maximum:40},
  rimDishMm: {type:'number',title:'轮辐凹度 · mm',minimum:0,maximum:70},
  rimColor: {type:'string',title:'轮毂颜色',pattern:'^#[0-9a-fA-F]{6}$'},
  hubCap: {type:'boolean',title:'中心盖'}, machinedFace: {type:'boolean',title:'切削亮面'},
  treadSipes: {type:'boolean',title:'胎块细槽（轮廓可容纳时）'},
}};
function outlineSchema(title){return {type:'array',title,minItems:3,maxItems:32,items:{type:'array',minItems:2,maxItems:2,items:{type:'number',minimum:-1,maximum:1}}};}
export const presets = [
  {id: 'touring', name: '225/45 R18 · 公路', params: defaults},
  {id: 'offroad', name: '285/70 R17 · 越野', params: {sectionWidthMm: 285, aspectRatio: 70, rimDiameterIn: 17, rimWidthMm: 229, spokeCount: 6, spokeStyle: 'straight', treadStyle: 'all-terrain', treadDepthMm: 10, offsetEtMm: 15}},
  {id: 'robot', name: '100/70 R8 · 巡检机器人', params: {sectionWidthMm: 100, aspectRatio: 70, rimDiameterIn: 8, rimWidthMm: 80, spokeCount: 8, spokeStyle: 'turbine', treadStyle: 'robot', treadDepthMm: 6, hubBoreMm: 20, boltCount: 4, boltPcdMm: 50, offsetEtMm: 0, detail: 48}},
  {id:'reference',name:'参考图 · 六辐越野',params:{sectionWidthMm:280,aspectRatio:51.7857,rimDiameterIn:20.86614,rimWidthMm:244,spokeCount:6,spokeStyle:'straight',spokeWidthPercent:330,spokeThicknessMm:20,rimDishMm:40,treadStyle:'reference',treadDepthMm:12,treadPitchCount:44,boltCount:6,boltPcdMm:139.7,hubBoreMm:67,offsetEtMm:80,hubCap:true,machinedFace:true,treadSipes:true,detail:96}},
  {id:'rally',name:'样条 · Y 辐拉力',params:{treadStyle:'custom',spokeStyle:'y',spokeCount:5,rimDishMm:22,treadRows:3,treadDepthMm:8}},
  {id:'turbine',name:'曲辐 · 涡轮',params:{spokeStyle:'curved',spokeCount:10,rimDishMm:30,treadStyle:'custom',treadRows:2,treadDepthMm:5,treadSmooth:.45}},
  {id:'custom',name:'自定义轮辐 · 样条',params:{spokeStyle:'custom',spokeCount:8,rimDishMm:18,treadStyle:'custom',treadRows:4,treadDepthMm:7}},
];
export const enumLabels = {component:['轮胎 + 轮毂','仅轮胎','仅轮毂'],spokeStyle: ['直辐', '双辐', '直线涡轮辐', 'Y 辐', '弯曲涡轮辐', '自定义样条'], treadStyle: ['公路沟槽', '传统越野胎块', '机器人斜纹', '参考图 · 四列胎块', '自定义样条胎块']};

export function normalizeWheelParams(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key => !Object.hasOwn(defaults, key))) throw Error('轮胎参数包含未知字段');
  const p = structuredClone({...defaults, ...input});
  for (const [key, schema] of Object.entries(parameterSchema.properties)) {
    const value = p[key];
    if (schema.enum) { if (!schema.enum.includes(value)) throw Error(`${schema.title} 无效`); continue; }
    if(schema.type==='array'){p[key]=validateOutline(value,schema.title);continue;}
    if(schema.type==='boolean'){if(typeof value!=='boolean')throw Error(`${schema.title} 需为布尔值`);continue;}
    if(schema.type==='string'){if(typeof value!=='string'||!/^#[0-9a-fA-F]{6}$/.test(value))throw Error(`${schema.title} 无效`);continue;}
    if (typeof value !== 'number' || !Number.isFinite(value) || value < schema.minimum || value > schema.maximum || (schema.type === 'integer' && !Number.isInteger(value))) throw Error(`${schema.title} 超出范围`);
  }
  if (p.rimWidthMm > p.sectionWidthMm * 1.15 || p.rimWidthMm < p.sectionWidthMm * .55) throw Error('轮辋宽度需与胎宽匹配');
  const rimRadius = p.rimDiameterIn * .0254 / 2;
  const hubRadius = Math.min(rimRadius * .57, p.boltPcdMm * .0005 + .045);
  if (p.hubBoreMm * .0005 + .007 >= p.boltPcdMm * .0005 - .007 || p.boltPcdMm * .0005 + .009 >= hubRadius) throw Error('中心孔、螺栓孔与轮毂尺寸冲突');
  if(['custom','reference'].includes(p.treadStyle)){sampleOutline(p.treadPoints,p.treadSmooth);if(p.treadStyle==='reference')sampleOutline(p.shoulderPoints,p.treadSmooth);}
  if(['custom','reference'].includes(p.treadStyle)&&p.treadDepthMm>p.sectionWidthMm*p.aspectRatio/100*.45)throw Error('胎纹深度不能超过胎侧高度的 45%');
  if(p.spokeStyle==='custom')sampleOutline(p.spokePoints,p.spokeSmooth);
  return p;
}

const paint = (color, metalness, roughness) => new THREE.MeshStandardMaterial({color, metalness, roughness});
function radialPoint(radius, angle) { return [-radius * Math.sin(angle), radius * Math.cos(angle)]; }
function addPart(root, geometry, material, name, positionX = 0) {
  const mesh = new THREE.Mesh(geometry.index?geometry:compactGeometry(geometry), material);
  mesh.name = name;
  mesh.position.x = positionX;
  root.add(mesh);
  return mesh;
}
function revolved(profile, radialSegments) {
  const points = profile.map(([axial, radius]) => new THREE.Vector2(radius, axial));
  const geometry = new THREE.LatheGeometry(points, radialSegments);
  geometry.rotateZ(Math.PI / 2);
  return geometry;
}
function tireProfile(p, dimensions) {
  if(dimensions.surface)return dimensions.surface.profile;
  const {rimRadius, outerRadius, halfWidth, treadHalf, beadHalf} = dimensions;
  const wall = outerRadius - rimRadius;
  const crownDrop = Math.min(wall * .12, treadHalf ** 2 / (2 * p.crownRadiusMm * .001));
  const depth = p.treadStyle === 'road' ? p.treadDepthMm * .001 : 0;
  const profile = [];
  const side = t => [
    treadHalf * (1 - t) + beadHalf * t + p.sidewallBulgeMm * .001 * Math.sin(Math.PI * t),
    rimRadius + wall * (1 - t) - p.shoulderRadiusMm * .001 * .16 * Math.sin(Math.PI * t),
  ];
  for (let i = 20; i >= 0; i--) { const [x, r] = side(i / 20); profile.push([-x, r]); }
  for (let i = 0; i <= 48; i++) {
    const x = -treadHalf + 2 * treadHalf * i / 48;
    const grooves = [-.54, 0, .54].reduce((sum, center) => sum + Math.exp(-Math.pow((x / treadHalf - center) / .055, 4)), 0);
    profile.push([x, outerRadius - crownDrop * (x / treadHalf) ** 2 - depth * grooves - (['custom','reference'].includes(p.treadStyle)?p.treadDepthMm*.001:0)]);
  }
  for (let i = 0; i <= 20; i++) profile.push(side(i / 20));
  profile.push([beadHalf, rimRadius - .009], [-beadHalf, rimRadius - .009], [-beadHalf, rimRadius]);
  return profile;
}
function rimProfile({rimRadius, rimHalf}) {
  const wall = Math.min(.012, rimRadius * .09);
  return [
    [-rimHalf - .008, rimRadius + .011], [-rimHalf, rimRadius + .011],
    [-rimHalf, rimRadius], [rimHalf, rimRadius],
    [rimHalf + .008, rimRadius + .011], [rimHalf + .014, rimRadius + .011],
    [rimHalf + .014, rimRadius - wall], [-rimHalf - .014, rimRadius - wall],
    [-rimHalf - .008, rimRadius + .011],
  ];
}
function spokeGeometry(innerRadius, outerRadius, innerAngle, outerAngle, halfInner, halfOuter, thickness) {
  const shape = new THREE.Shape();
  const vertices = [
    radialPoint(innerRadius, innerAngle - halfInner), radialPoint(outerRadius, outerAngle - halfOuter),
    radialPoint(outerRadius, outerAngle + halfOuter), radialPoint(innerRadius, innerAngle + halfInner),
  ];
  shape.moveTo(...vertices[0]); vertices.slice(1).forEach(point => shape.lineTo(...point)); shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {depth: thickness, bevelEnabled: false, curveSegments: 4});
  geometry.rotateY(Math.PI / 2);
  return geometry;
}
function hubGeometry(hubRadius, boreRadius, boltRadius, boltCount, holeRadius, thickness) {
  const shape = new THREE.Shape(); shape.absarc(0, 0, hubRadius, 0, TAU, false);
  const bore = new THREE.Path(); bore.absarc(0, 0, boreRadius, 0, TAU, true); shape.holes.push(bore);
  for (let i = 0; i < boltCount; i++) {
    const [x, y] = radialPoint(boltRadius, TAU * i / boltCount);
    const hole = new THREE.Path(); hole.absarc(x, y, holeRadius, 0, TAU, true); shape.holes.push(hole);
  }
  const geometry = new THREE.ExtrudeGeometry(shape, {depth: thickness, bevelEnabled: false, curveSegments: 24});
  geometry.rotateY(Math.PI / 2);
  return geometry;
}
function addTread(root, p, d, material) {
  if (p.treadStyle === 'road') return;
  if(['reference','custom'].includes(p.treadStyle)){
    const rows=p.treadStyle==='reference'?4:p.treadRows,count=p.treadPitchCount,depth=p.treadDepthMm*.001;
    const surface=d.surface,radius=surface.radius,wall=d.outerRadius-d.rimRadius;
    const crownDrop=Math.min(wall*.12,d.treadHalf**2/(2*p.crownRadiusMm*.001));
    for(let row=0;row<rows;row++){
      const reference=p.treadStyle==='reference',outer=row===0||row===rows-1,sign=row<rows/2?-1:1;
      const patternHalf=Math.min(d.treadHalf+surface.span*.28,surface.maxAxial/1.14);
      const center=reference?sign*patternHalf*(outer?.80:.22):(row-(rows-1)/2)*(2*patternHalf/rows);
      let halfWidth=reference?patternHalf*(outer?.30:.17)*p.treadWidthPercent/100:(patternHalf/rows)*p.treadWidthPercent/100;
      const points=reference&&outer?p.shoulderPoints:p.treadPoints,extent=Math.max(...sampleOutline(points,p.treadSmooth).map(a=>Math.abs(a[0])));
      halfWidth=Math.min(halfWidth,(surface.maxAxial-.001-Math.abs(center))/(extent*1.12));
      const geometry=crownBlock(points,{center,halfWidth,halfLength:Math.PI*radius/count*p.treadLengthPercent/100,radius,treadHalf:d.treadHalf,crownDrop,depth,smooth:p.treadSmooth,mirror:row<rows/2,sipeWidth:p.treadSipes?.00065:0,surface,embedding:surface.embedding});
      const phase=(row%2)*p.treadStagger+(reference&&!outer?.18:0);
      addRepeated(root,geometry,material,count,reference&&outer?'样条胎肩 '+row:'样条胎块 '+row,phase);
    }
    if(p.treadStyle==='reference')addButtresses(root,p,d,material);
    return;
  }
  const rows = p.treadStyle === 'robot' ? 2 : 3;
  const around = p.treadStyle === 'robot' ? 32 : 36;
  const depth = p.treadDepthMm * .001;
  const box = new THREE.BoxGeometry(d.treadHalf * (rows === 2 ? .8 : .49), depth, d.outerRadius * (rows === 2 ? .21 : .16));
  const instanced = new THREE.InstancedMesh(box, material, rows * around);
  instanced.name = '实体胎纹';
  const dummy = new THREE.Object3D();
  let index = 0;
  for (let row = 0; row < rows; row++) for (let i = 0; i < around; i++) {
    const angle = TAU * (i + row * .5) / around;
    dummy.position.set((row - (rows - 1) / 2) * d.treadHalf * .82, Math.cos(angle) * (d.outerRadius + depth * .33), Math.sin(angle) * (d.outerRadius + depth * .33));
    dummy.rotation.set(angle, p.treadStyle === 'robot' ? (row ? -.36 : .36) : 0, 0);
    dummy.updateMatrix(); instanced.setMatrixAt(index++, dummy.matrix);
  }
  instanced.instanceMatrix.needsUpdate = true;
  root.add(instanced);
}

function addButtresses(root,p,d,material){
  const count=p.treadPitchCount,surface=d.surface,height=Math.min(.040,(surface.edgeRadius-d.rimRadius)*.70),scale=height/.040;
  const outline=[[-.010,-.040],[-.017,-.006],[-.013,0],[.013,0],[.017,-.006],[.010,-.040]];
  for(const sign of [-1,1]){
    const parts=[];
    const shapes=[outline];
    for(let j=0;j<4;j++){const r=-.042+j*.007;shapes.push([[-.010,r],[.010,r],[.010,r+.0007],[-.010,r+.0007]]);}
    for(let part=0;part<shapes.length;part++){
      const embed=part?0:surface.embedding,g=new THREE.ExtrudeGeometry(shapeFromPoints(shapes[part]),{depth:(part?.0007:.0035)+embed,bevelEnabled:false}),a=g.attributes.position;
      for(let i=0;i<a.count;i++){
        const angle=a.getX(i)/surface.radius,r=surface.edgeRadius+a.getY(i)*scale;
        const x=surface.axialAtRadius(r)+(part?.0035:0)+a.getZ(i)-embed;
        a.setXYZ(i,sign*x,r*Math.cos(angle),r*Math.sin(angle));
      }
      if(sign>0)reverseWinding(g);
      g.computeVertexNormals();parts.push(g);
    }
    const combined=mergeGeometries(parts,false);parts.forEach(g=>g.dispose());addRepeated(root,combined,material,count,'胎侧接续齿与横纹 '+sign,sign<0?0:.5);
  }
}

// AssetIR v0.1 has transform nodes but no instancing primitive. Bake one batch per
// row instead of turning hundreds of prototype copies into individual draw calls.
function addRepeated(root,prototype,material,count,name,phase){
  const roots=prototype.userData.rootSamples?.map(p=>new THREE.Vector3(...p).applyAxisAngle(new THREE.Vector3(1,0,0),TAU*phase/count).toArray());
  const copies=[],matrix=new THREE.Matrix4();for(let i=0;i<count;i++){matrix.makeRotationX(TAU*(i+phase)/count);copies.push(prototype.clone().applyMatrix4(matrix));}
  const geometry=mergeGeometries(copies,false);prototype.dispose();copies.forEach(g=>g.dispose());const mesh=addPart(root,geometry,material,name);if(roots)mesh.userData.rootSamples=roots;
}

function sculptSpoke(p,d,angle,thickness,branch=0){
  const inner=d.hubRadius*.88,outer=d.rimRadius-.018,width=(outer-inner)*.20*p.spokeWidthPercent/100;
  let polygon;
  if(p.spokeStyle==='custom')polygon=sampleOutline(p.spokePoints,p.spokeSmooth).map(([x,y])=>[x*width,inner+(y+1)/2*(outer-inner)]);
  else {
    const curve=new THREE.CubicBezierCurve3(new THREE.Vector3(0,inner,0),new THREE.Vector3(-width*.7,inner+(outer-inner)*.3,0),new THREE.Vector3(width*1.8,inner+(outer-inner)*.7,0),new THREE.Vector3(width*1.3,outer,0));
    const left=[],right=[];
    for(let i=0;i<=16;i++){const t=i/16,c=curve.getPoint(t),v=curve.getTangent(t),w=width*(.40-.16*t);left.push([c.x-v.y*w,c.y+v.x*w]);right.push([c.x+v.y*w,c.y-v.x*w]);}
    polygon=left.concat(right.reverse());
  }
  const geometry=new THREE.ExtrudeGeometry(shapeFromPoints(polygon),{depth:thickness,bevelEnabled:false,steps:3});
  geometry.rotateY(Math.PI/2);geometry.rotateX(angle+branch);
  dishGeometry(geometry,p,d);return geometry;
}
function dishGeometry(geometry,p,d){
  if(!p.rimDishMm)return;
  const a=geometry.attributes.position;
  for(let i=0;i<a.count;i++){
    const r=Math.hypot(a.getY(i),a.getZ(i)),t=THREE.MathUtils.clamp((r-d.hubRadius*.88)/(d.rimRadius-.018-d.hubRadius*.88),0,1);
    a.setX(i,a.getX(i)+p.rimDishMm*.001*t*t);
  }
  geometry.computeVertexNormals();
}

export function disposeWheel(root){
  const geometries=new Set(),materials=new Set();root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of (Array.isArray(o.material)?o.material:o.material?[o.material]:[]))materials.add(m);});
  geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
}

/** Pure Node/Worker Three scene; callers own and must dispose its resources. */
export function buildWheelGroup(raw = {}) {
  const p = normalizeWheelParams(raw);
  const rimRadius = p.rimDiameterIn * .0254 / 2;
  const outerRadius = rimRadius + p.sectionWidthMm * .001 * p.aspectRatio / 100;
  const halfWidth = p.sectionWidthMm * .0005;
  const rimHalf = p.rimWidthMm * .0005;
  const treadHalf = Math.min(halfWidth * .78, rimHalf * .93);
  const beadHalf = Math.min(rimHalf * .87, halfWidth * .72);
  const hubRadius = Math.min(rimRadius * .57, p.boltPcdMm * .0005 + .045);
  const d = {rimRadius, outerRadius, halfWidth, rimHalf, treadHalf, beadHalf, hubRadius};
  if(['custom','reference'].includes(p.treadStyle))d.surface=createTireSurface(p,d);
  const root = new THREE.Group(); root.name = '轮胎轮毂总成';
  const tireRoot=new THREE.Group();tireRoot.name='轮胎组件';const rimRoot=new THREE.Group();rimRoot.name='轮毂组件';
  if(p.component!=='rim')root.add(tireRoot);if(p.component!=='tire')root.add(rimRoot);
  const rubber = paint(d.surface?'#24282a':'#20282b', .02, .93), tread = d.surface?rubber:paint('#2d3332', .02, .88), rim = paint(p.rimColor, p.machinedFace?.45:.82, .27), hub = paint('#39464e', .7, .35);
  const materials=[rubber,tread,rim,hub];
  if(p.component!=='rim'){addPart(tireRoot, revolved(tireProfile(p, d), p.detail), rubber, '胎体与胎面');addTread(tireRoot,p,d,tread);}
  const hubThickness = p.spokeThicknessMm*.001||Math.max(.014, rimRadius * .055), offset = p.offsetEtMm * .001;
  if(p.component!=='tire'){
  addPart(rimRoot, revolved(rimProfile(d), p.detail), rim, '轮辋与胎唇');
  addPart(rimRoot, hubGeometry(hubRadius, p.hubBoreMm * .0005, p.boltPcdMm * .0005, p.boltCount, Math.min(.007, hubRadius * .05), hubThickness), hub, '真实开孔轮毂', offset - hubThickness / 2);
  const outerSpokeRadius = rimRadius - .018, innerSpokeRadius = hubRadius * .88;
  for (let i = 0; i < p.spokeCount; i++) {
    const angle = TAU * i / p.spokeCount;
    const branches = ['split','y'].includes(p.spokeStyle) ? [-1, 1] : [0];
    for (const branch of branches) {
      const twist = p.spokeStyle === 'turbine' ? .19 : branch * .105;
      const factor=p.spokeWidthPercent/100;
      let geometry;
      if(['custom','curved'].includes(p.spokeStyle))geometry=sculptSpoke(p,d,angle,hubThickness*.8);
      else {geometry=spokeGeometry(innerSpokeRadius,outerSpokeRadius,angle+branch*.026,angle+(p.spokeStyle==='y'?branch*.19:twist),(['split','y'].includes(p.spokeStyle)?.029:.055)*factor,(['split','y'].includes(p.spokeStyle)?.018:.04)*factor,hubThickness*.8);dishGeometry(geometry,p,d);}
      addPart(rimRoot,geometry,p.machinedFace?hub:rim,`轮辐 ${i + 1}${branch ? (branch < 0 ? ' A' : ' B') : ''}`,offset-hubThickness*.4);
      if(p.machinedFace){const face=geometry.clone(),a=face.attributes.position;for(let j=0;j<a.count;j++){a.setY(j,a.getY(j)*.96);a.setZ(j,a.getZ(j)*.96);}addPart(rimRoot,face,rim,`切削面 ${i+1}-${branch}`,offset+hubThickness*.10);}
    }
  }
  if(p.hubCap){const g=new THREE.CylinderGeometry(p.hubBoreMm*.0006,p.hubBoreMm*.0006,.010,48);g.rotateZ(Math.PI/2);addPart(rimRoot,g,rim,'中心盖',offset+hubThickness*.65);}
  }
  // Materials for omitted components never enter the tree and still need release.
  const used=new Set();root.traverse(o=>{if(o.material)used.add(o.material);});materials.filter(m=>!used.has(m)).forEach(m=>m.dispose());
  root.userData.wheel = {axis: [1, 0, 0], component:p.component, outerDiameterM: outerRadius * 2, rimDiameterM: rimRadius * 2, sectionWidthM: p.sectionWidthMm * .001, offsetEtM: offset, hubBoreM: p.hubBoreMm * .001, boltPcdM: p.boltPcdMm * .001,treadUnits:p.component!=='rim'&&['custom','reference'].includes(p.treadStyle)?p.treadPitchCount*(p.treadStyle==='reference'?4:p.treadRows):0};
  return root;
}

export async function generate({seed = '0', params = {}} = {}, {budget} = {}) {
  if (typeof seed !== 'string' || !seed.length || seed.length > 128) throw Error('随机种子无效');
  const p = normalizeWheelParams(params), root = buildWheelGroup(p);
  try {
    const asset = await threeToIR(root);
    asset.id = 'wheel-assembly'; asset.generator = {id: 'wheel-assembly', version: '1.1.2'}; asset.seed = seed;
    asset.sockets = [{id: 'axle', nodeId: asset.rootNodeIds[0], transform: {position: [p.offsetEtMm * .001, 0, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1]}, tags: ['wheel', 'hub', 'axle-x']}];
    asset.colliders = [{kind: 'box', nodeId: asset.rootNodeIds[0], size: asset.bounds.max.map((v,i)=>v-asset.bounds.min[i]), offset: asset.bounds.max.map((v,i)=>(v+asset.bounds.min[i])/2)}];
    const components=asset.nodes.filter(n=>['轮胎组件','轮毂组件'].includes(n.name)).map(n=>({id:n.name==='轮胎组件'?'tire':'rim',nodeId:n.id}));
    components.forEach(c=>{asset.nodes.find(n=>n.id===c.nodeId).tags.push('wheel-component',c.id);});
    asset.metadata = {coordinateConvention: 'gltf-rh-y-up-meters', wheel: {...root.userData.wheel,components}, recipe: {seed, params: p}};
    enforceBudget(asset, budget);
    return {asset, recipe: asset.metadata.recipe};
  } finally {
    disposeWheel(root);
  }
}

export default {parameterSchema, defaults, presets, enumLabels, quality: ['standard'], generate};
