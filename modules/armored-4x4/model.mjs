import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {unzlibSync} from 'fflate';
import {buildWheelGroup,disposeWheel} from '../wheel-assembly/wheel.generator.mjs';
import {side,patch,wheelFace} from './reference-textures.mjs';

const PI=Math.PI;
function imageTexture(source){
 const bytes=Uint8Array.from(atob(source.data),c=>c.charCodeAt(0));
 const t=new THREE.DataTexture(unzlibSync(bytes),source.width,source.height,THREE.RGBAFormat);
 t.colorSpace=THREE.SRGBColorSpace;t.flipY=true;t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.needsUpdate=true;return t;
}
const paint=(color,roughness=.8,metalness=.05)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
function prism(points,depth,bevel=.012){
 const shape=new THREE.Shape(points.map(p=>new THREE.Vector2(...p)));
 const g=new THREE.ExtrudeGeometry(shape,{depth,steps:1,bevelEnabled:bevel>0,bevelSegments:1,bevelSize:bevel,bevelThickness:bevel,curveSegments:1});
 g.translate(0,0,-depth/2);return g;
}
function batchGroup(group){
 const buckets=new Map();group.updateMatrixWorld(true);
 for(const o of [...group.children]){
  if(!o.isMesh)continue;const geo=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();geo.applyMatrix4(o.matrix);
  const groups=Array.isArray(o.material)?geo.groups:[{start:0,count:geo.attributes.position.count,materialIndex:0}];
  for(const part of groups){if(!part.count)continue;const material=Array.isArray(o.material)?o.material[part.materialIndex]:o.material,split=new THREE.BufferGeometry();for(const [name,a]of Object.entries(geo.attributes)){split.setAttribute(name,new THREE.BufferAttribute(a.array.slice(part.start*a.itemSize,(part.start+part.count)*a.itemSize),a.itemSize,a.normalized));}const list=buckets.get(material)??[];list.push(split);buckets.set(material,list);}
  geo.dispose();group.remove(o);o.geometry.dispose();
 }
 for(const [material,geometries]of buckets){const merged=mergeGeometries(geometries,false);geometries.forEach(g=>g.dispose());const mesh=new THREE.Mesh(merged,material);mesh.name=group.name+' surface';mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);}
 return group;
}
export function disposeVehicle(root){
 const gs=new Set(),ms=new Set(),ts=new Set();root.traverse(o=>{if(o.geometry)gs.add(o.geometry);for(const m of [o.material].flat().filter(Boolean)){ms.add(m);for(const t of Object.values(m))if(t?.isTexture)ts.add(t);}});gs.forEach(g=>g.dispose());ts.forEach(t=>t.dispose());ms.forEach(m=>m.dispose());root.clear();
}
export function buildVehicle(params={},stage='complete'){
 const p={length:6.1,wheelbase:4,tireScale:1,roofEquipment:true,spareWheel:true,finish:'reference',wear:.45,steering:0,explode:0,...params};
 const root=new THREE.Group();root.name='Armored 4x4';
 const materials={sand:paint('#939078',.85),olive:paint('#626d56',.84),steel:paint('#59634f',.5,.62),dark:paint('#292f29',.8,.12),rubber:paint('#30332f',.93),glass:paint('#273c42',.08,.35),lens:paint('#b4c5c7',.21,.35),amber:paint('#b87520',.32),red:paint('#9d3a2b',.4),dust:paint('#857d66',.94)};
 materials.steel.roughness=.35+p.wear*.35;materials.sand.color.lerp(new THREE.Color('#928870'),p.wear*.18);materials.olive.color.lerp(new THREE.Color('#8a8067'),p.wear*.22);
 if(p.finish==='reference'&&!['blockout','structural-pass','form-refinement'].includes(stage)){
  const t=imageTexture(side),pt=imageTexture(patch);pt.wrapS=pt.wrapT=THREE.RepeatWrapping;materials.side=paint('#c9cbc1',.87);materials.side.map=t;materials.patch=paint('#e0ddc3',.83);materials.patch.map=pt;materials.wheelFace=paint('#ffffff',.86,.12);materials.wheelFace.map=imageTexture(wheelFace);
 }else {materials.side=materials[p.finish==='olive'?'olive':'sand'];materials.patch=materials.side;}
 const groups=[];
 const group=(name,offset=[0,0,0])=>{const g=new THREE.Group();g.name=name;g.userData.component=name;g.userData.explode=offset;root.add(g);groups.push(g);return g;};
 function add(g,geometry,material,name,position=[0,0,0],rotation=[0,0,0]){const m=new THREE.Mesh(geometry,material);m.name=name;m.position.fromArray(position);m.rotation.set(...rotation);g.add(m);
 if(material===materials.patch&&material.map){m.updateMatrix();const a=geometry.attributes.position,n=geometry.attributes.normal,u=geometry.attributes.uv;const v=new THREE.Vector3(),nn=new THREE.Vector3();for(let i=0;i<a.count;i++){v.fromBufferAttribute(a,i).applyMatrix4(m.matrix);nn.fromBufferAttribute(n,i).transformDirection(m.matrix);if(Math.abs(nn.y)>.65)u.setXY(i,v.x*.48,v.z*1.5);else if(Math.abs(nn.x)>.65)u.setXY(i,v.z*.48,v.y*1.5);else u.setXY(i,v.x*.48,v.y*1.5);}}
 return m;}
 function box(g,name,size,pos,mat=materials.sand,rot=[0,0,0]){const bevel=/armor|enclosure|housing|bumper|locker|utility box/i.test(name)&&Math.min(...size)>.04;return add(g,bevel?new RoundedBoxGeometry(...size,2,Math.min(...size)*.12):new THREE.BoxGeometry(...size),mat,name,pos,rot);}
 function bentPipe(g,name,points,r=.028,closed=false,mat=materials.steel){return add(g,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)),closed,'centripetal'),Math.max(32,points.length*8),r,8,closed),mat,name);}
 function roundedWindow(g,name,points,z,mat,depth){const shape=new THREE.Shape(),n=points.length;for(let i=0;i<n;i++){const a=new THREE.Vector2(...points[(i+n-1)%n]),b=new THREE.Vector2(...points[i]),c=new THREE.Vector2(...points[(i+1)%n]),u=a.clone().sub(b).normalize().multiplyScalar(.028).add(b),v=c.clone().sub(b).normalize().multiplyScalar(.028).add(b);if(i===0)shape.moveTo(u.x,u.y);else shape.lineTo(u.x,u.y);shape.quadraticCurveTo(b.x,b.y,v.x,v.y);}shape.closePath();const geo=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSize:.006,bevelThickness:.006,bevelSegments:2,curveSegments:5});geo.translate(0,0,-depth/2);return add(g,geo,mat,name,[0,0,z]);}

 function pipe(g,name,a,b,r=.022,mat=materials.steel){const va=new THREE.Vector3(...a),vb=new THREE.Vector3(...b),delta=vb.clone().sub(va),m=add(g,new THREE.CylinderGeometry(r,r,delta.length(),8),mat,name,va.add(vb).multiplyScalar(.5).toArray());m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return m;}
 function poly(g,name,points,depth,z,mat=materials.side,bevel=.01){const geo=prism(points,depth,bevel);if(mat===materials.side&&mat.map){const a=geo.attributes.position,u=geo.attributes.uv;for(let i=0;i<a.count;i++)u.setXY(i,(a.getX(i)+3.05)/6.1,(15+a.getY(i)*175)/590);}return add(g,geo,mat,name,[0,0,z]);}
 function bolt(g,pos,axis='z',radius=.019){const rot=axis==='z'?[PI/2,0,0]:axis==='x'?[0,0,PI/2]:[0,0,0];add(g,new THREE.CylinderGeometry(radius,radius,.017,6),materials.steel,'Hex fastener',pos,rot);}
 const chassis=group('Chassis',[0,-.4,0]);
 for(const z of [-.69,.69])box(chassis,'Frame rail',[5.3,.2,.12],[0,.76,z],materials.dark);
 for(const x of [-2,-.5,.65,2])box(chassis,'Cross member',[.15,.14,1.6],[x,.76,0],materials.dark);
 for(const x of [-2,2]){pipe(chassis,'Solid axle',[x,.64,-1.13],[x,.64,1.13],.065,materials.dark);add(chassis,new THREE.SphereGeometry(.17,12,8),materials.dark,'Differential',[x,.64,0]);for(const z of [-.78,.78]){pipe(chassis,'Suspension damper',[x-.1,.69,z],[x+.1,1.42,z],.048,materials.dark);for(let i=0;i<9;i++)add(chassis,new THREE.TorusGeometry(.072,.012,4,10),materials.steel,'Coil spring',[x+.06,.89+i*.044,z],[PI/2,0,0]);}}
 pipe(chassis,'Driveshaft',[-2,.68,0],[2,.68,0],.04,materials.steel);
 const hull=group('Armored hull',[0,.3,0]);
 const hullProfile=[[-2.95,1.63],[-2.95,2.35],[-2.75,2.52],[-1.8,2.52],[-1.6,2.58],[.55,2.58],[1.22,1.96],[1.12,1.15],[-1.25,1.15],[-1.45,1.63]];
 poly(hull,'Welded cabin',hullProfile,2.03,0,materials.patch);
 for(const s of [-1,1])poly(hull,'Photo camouflage side',hullProfile,.025,s*1.04,materials.side);
 box(hull,'Roof armor',[2.75,.065,2.04],[-.49,2.56,0],materials.patch);
 const hood=group('Sloped engine hood',[.4,.1,0]);
 poly(hood,'Engine shell',[[1.16,1.58],[1.24,1.94],[2.69,1.74],[2.76,1.5]],2.05,0,materials.patch);
 for(const s of [-1,1])poly(hood,'Hood side',[[1.16,1.58],[1.24,1.94],[2.69,1.74],[2.76,1.5]],.03,s*1.055,materials.side);
 const front=group('Grille and brush guard',[.8,0,0]);
 box(front,'Front grille recess',[.085,.41,1.35],[2.8,1.51,0],materials.dark);
 const wheelProto=buildWheelGroup({component:'tire',sectionWidthMm:420,aspectRatio:70.3,sidewallBulgeMm:16,shoulderRadiusMm:45,crownRadiusMm:600,rimDiameterIn:26,rimWidthMm:335,spokeCount:8,spokeStyle:'straight',spokeWidthPercent:200,rimDishMm:40,treadStyle:'reference',treadDepthMm:16,treadPitchCount:36,boltCount:8,boltPcdMm:180,hubBoreMm:90,offsetEtMm:0,hubCap:true,machinedFace:false,treadSipes:false,detail:64,rimColor:'#646e53'});
 // One shared prototype becomes four merged tire/rim assemblies; steel disk hides alloy spokes.
 const wheelCopies=[];wheelProto.updateMatrixWorld(true);
 const wheelParts=[];const prototypes=new Map();
 wheelProto.traverse(o=>{if(!o.isMesh)return;const count=o.isInstancedMesh?o.count:1;for(let i=0;i<count;i++){const geo=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();const matrix=o.matrixWorld.clone();if(o.isInstancedMesh){const instance=new THREE.Matrix4();o.getMatrixAt(i,instance);matrix.multiply(instance);}geo.applyMatrix4(matrix);const list=prototypes.get(o.material)??[];list.push(geo);prototypes.set(o.material,list);}});
 for(const [mat,geometries]of prototypes){wheelParts.push({geo:mergeGeometries(geometries,false),mat});geometries.forEach(g=>g.dispose());}
 function wheelUV(geo){const a=geo.attributes.position,u=geo.attributes.uv;for(let i=0;i<a.count;i++)u.setXY(i,(-a.getZ(i)+.65)/1.3,(a.getY(i)+.65)/1.3);return geo;}
 function wheel(name,x,y,z,s,scale=1){const w=group(name,[0,-.08,s*.85]);w.position.set(x,y+.025,z);w.rotation.y=-s*PI/2+(x>0?p.steering*PI/180:0);w.scale.setScalar(scale);const cloned=new Map();for(const part of wheelParts){if(!cloned.has(part.mat)){const m=part.mat.clone();m.color.set('#363933');m.color.lerp(new THREE.Color('#887e64'),p.wear*.17);cloned.set(part.mat,m);}const geo=part.geo.clone(),base=cloned.get(part.mat);
   if(materials.wheelFace){wheelUV(geo);const a=geo.attributes.position,n=geo.attributes.normal,face=[],body=[];for(let i=0;i<a.count;i+=3){const normal=(n.getX(i)+n.getX(i+1)+n.getX(i+2))/3,x=(a.getX(i)+a.getX(i+1)+a.getX(i+2))/3;(normal>.35&&x>.02?face:body).push(i,i+1,i+2);}geo.setIndex([...face,...body]);geo.clearGroups();geo.addGroup(0,face.length,0);geo.addGroup(face.length,body.length,1);add(w,geo,[materials.wheelFace,base],'Photo-colored curved tire sidewall');}
   else add(w,geo,base,'Reused wheel assembly');}
  for(const r of [.46,.49]){const geo=new THREE.TorusGeometry(r,.006,4,48);geo.rotateY(PI/2);add(w,geo,materials.rubber,'Embossed tire sidewall ring',[.21,0,0]);}
  // Continuous dished military steel wheel; a tire-only shared prototype leaves no hidden alloy spokes.
  const profile=[[.30,.19],[.315,.205],[.326,.226],[.318,.246],[.291,.253],[.277,.238],[.248,.208],[.145,.209],[.127,.238],[.10,.245],[.10,.20]];
  const dish=new THREE.LatheGeometry(profile.map(([r,x])=>new THREE.Vector2(r,x)),64);dish.rotateZ(-PI/2);add(w,wheelUV(dish),materials.wheelFace??materials.olive,'Dished steel rim');
  const disk=new THREE.CylinderGeometry(.146,.146,.035,48);disk.rotateZ(PI/2);add(w,wheelUV(disk),materials.wheelFace??materials.olive,'Wheel bolt plate',[.224,0,0]);
  for(const rr of [.322,.296,.13]){const g=new THREE.TorusGeometry(rr,.007,6,64);g.rotateY(PI/2);add(w,g,rr===.322?materials.steel:materials.dark,'Rolled rim seam',[.25,0,0]);}
  const hub=new THREE.CylinderGeometry(.096,.103,.045,32);hub.rotateZ(PI/2);add(w,hub,materials.dark,'Axle cap',[.26,0,0]);
  for(let i=0;i<8;i++){const a=i*PI/4;const yy=Math.sin(a)*.211,zz=Math.cos(a)*.211;const washer=new THREE.TorusGeometry(.023,.005,6,12);washer.rotateY(PI/2);add(w,washer,materials.dark,'Lug washer',[.234,yy,zz]);bolt(w,[.244,yy,zz],'x',.018);}
  for(let i=0;i<32;i++){const a=i*PI/16;const yy=Math.sin(a)*.448,zz=Math.cos(a)*.448;box(w,'Raised sidewall lettering',[.004,.027,.006],[.211,yy,zz],materials.rubber,[a,0,0]);}
  wheelCopies.push(w);return w;}
 for(const x of [-p.wheelbase/2,p.wheelbase/2])for(const s of [-1,1])wheel((x>0?'Front':'Rear')+(s>0?' right wheel':' left wheel'),x,.625*p.tireScale,s*1.13,s,p.tireScale);
 if(stage!=='blockout'){
  // Fenders use polygonal annuli, leaving an actual tire opening.
  for(const s of [-1,1])for(const x of [-p.wheelbase/2,p.wheelbase/2]){
   const f=group((x>0?'Front':'Rear')+(s>0?' right fender':' left fender'),[0,.1,s*.25]);const outer=[[x-.88,.82],[x-.72,1.51],[x-.52,1.65],[x+.53,1.65],[x+.73,1.48],[x+.88,.82]],inner=[[x-.75,.82],[x-.61,1.42],[x-.44,1.51],[x+.46,1.51],[x+.62,1.36],[x+.75,.82]];
   const ring=[...outer,...inner.reverse()];poly(f,'Open wheel-arch armor',ring,.25,s*1.1,materials.patch,.012);pipe(f,'Worn fender lip',[x-.52,1.65,s*1.255],[x+.54,1.65,s*1.255],.025,materials.sand);
  }
  for(const s of [-1,1]){
   for(const [name,cx,pts]of [['Rear',-.07,[[-.41,1.22],[-.41,2.49],[.30,2.49],[.30,1.22]]],['Front',.76,[[.31,1.22],[.31,2.49],[.84,2.49],[1.25,1.92],[1.17,1.22]]]]){
    const d=group(name+(s>0?' right door':' left door'),[0,.05,s*.7]);poly(d,'Door gasket',pts,.035,s*1.08,materials.dark);poly(d,'Armored door',pts.map(([x,y])=>[cx+(x-cx)*.97,1.92+(y-1.92)*.975]),.04,s*1.11,materials.side);
    const win=name==='Rear'?[[cx-.27,1.99],[cx-.27,2.42],[cx+.27,2.42],[cx+.27,1.99]]:[[.38,1.99],[.38,2.42],[.81,2.42],[1.06,2.06],[1.00,1.99]];
    roundedWindow(d,'Window armor frame',win,s*1.16,materials.dark,.06);roundedWindow(d,'Armored dark glazing',win.map(([x,y])=>[cx+(x-cx)*.86,2.21+(y-2.21)*.84]),s*1.197,materials.glass,.015);
    for(const yy of [1.39,1.9,2.46]){box(d,'Door hinge',[.19,.07,.09],[pts[0][0]+.1,yy,s*1.16],materials.steel);bolt(d,[pts[0][0]+.065,yy,s*1.215]);}
    const hx=cx+(name==='Front'?-.36:.18);pipe(d,'Door handle',[hx,1.83,s*1.18],[hx+.2,1.83,s*1.18],.021,materials.dark);bolt(d,[hx,1.83,s*1.21]);
    for(const [x,y]of pts)bolt(d,[x+(cx-x)*.08,y+(1.92-y)*.06,s*1.15]);
   }
   const steps=group(s>0?'Right steps and lockers':'Left steps and lockers',[0,-.15,s*.35]);
   for(const x of [-.66,.25,.85]){const length=x<0?.76:x<.5?.53:.47;box(steps,'Underbody equipment step',[length,.19,.29],[x,1.07,s*1.13],materials.patch,[0,0,-.1]);box(steps,'Equipment locker lid',[length+.02,.025,.30],[x,1.18,s*1.13],materials.sand,[0,0,-.1]);pipe(steps,'Locker handle',[x-.065,1.05,s*1.29],[x+.065,1.05,s*1.29],.017,materials.dark);pipe(steps,'Step brace',[x,.9,s*1.04],[x,.9,s*1.35],.026,materials.steel);bolt(steps,[x-.23,1.05,s*1.28]);bolt(steps,[x+.23,1.05,s*1.28]);}
   const accessories=group(s>0?'Right service equipment':'Left service equipment',[0,.05,s*.35]);
   box(accessories,'Side cooling vent',[.55,.55,.1],[-.85,2.21,s*1.12],materials.dark);
   for(let i=0;i<10;i++)box(accessories,'Vent slat',[.51,.024,.035],[-.85,1.98+i*.047,s*1.18],materials.steel);
   for(const x of [-1.08,-.62])pipe(accessories,'Vent frame',[x,2.0,s*1.2],[x,2.51,s*1.2],.018,materials.sand);
   for(const x of [-1.48,-1.23])pipe(accessories,'Utility ladder rail',[x,1.76,s*1.16],[x,2.24,s*1.16],.024,materials.steel);
   for(let i=0;i<3;i++)pipe(accessories,'Ladder rung',[-1.48,1.78+i*.19,s*1.16],[-1.23,1.78+i*.19,s*1.16],.022,materials.sand);
   bentPipe(accessories,'Rear stowage frame',[[-2.73,2.0,s*1.17],[-2.73,2.44,s*1.17],[-2.66,2.52,s*1.17],[-1.99,2.52,s*1.17],[-1.91,2.44,s*1.17],[-1.91,2.0,s*1.17]],.022);
   bentPipe(accessories,'Rear basket front frame',[[-2.68,2.00,s*1.31],[-2.68,2.32,s*1.31],[-2.64,2.36,s*1.31],[-2.02,2.36,s*1.31],[-1.98,2.32,s*1.31],[-1.98,2.00,s*1.31]],.018);
   box(accessories,'Basket floor',[.73,.03,.24],[-2.33,2.00,s*1.22],materials.steel);
   for(let i=-8;i<=8;i++){const x=-2.33+i*.065,a=Math.max(-2.65,x-.12),b=Math.min(-2.01,x+.12);if(b>a){pipe(accessories,'Basket diamond mesh',[a,2.04,s*1.31],[b,2.30,s*1.31],.004);pipe(accessories,'Basket diamond mesh',[a,2.30,s*1.315],[b,2.04,s*1.315],.004);}}
   for(const x of [-1.03,-.85,-.67])box(accessories,'Vent vertical divider',[.007,.49,.015],[x,2.23,s*1.2],materials.steel);

   box(accessories,'Marker housing',[.12,.15,.07],[1.05,1.84,s*1.16],materials.dark);box(accessories,'Amber side marker',[.075,.073,.013],[1.05,1.84,s*1.21],materials.red);
   pipe(front,'Mirror stalk',[1.16,2.1,s*1.04],[1.34,2.35,s*1.43],.027,materials.steel);box(front,'Rear view mirror',[.09,.48,.2],[1.33,2.52,s*1.45],materials.dark);box(front,'Mirror glass',[.014,.415,.15],[1.28,2.52,s*1.45],materials.glass);
  }
  const windshield=group('Split armored windshield',[.3,.15,0]);
  for(const s of [-1,1]){const frame=box(windshield,'Windshield armor frame',[.09,.70,.94],[.91,2.24,s*.5],materials.dark,[0,0,.74]);box(windshield,'Windshield glass',[.017,.60,.82],[.95,2.27,s*.5],materials.glass,[0,0,.74]);pipe(windshield,'Wiper',[1.1,2.15,s*.7],[.87,2.40,s*.26],.009,materials.dark);}
  for(const s of [-1,1]){
   box(front,'Light armor housing',[.17,.36,.42],[2.8,1.52,s*.92],materials.olive);
   for(const [z,r,m]of [[s*.82,.1,materials.lens],[s*1.04,.073,materials.amber]]){add(front,new THREE.CylinderGeometry(r+.026,r+.026,.035,24),materials.dark,'Lamp bezel',[2.904,1.54,z],[0,0,PI/2]);add(front,new THREE.CylinderGeometry(r,r,.018,24),m,'Lamp glass',[2.926,1.54,z],[0,0,PI/2]);}
  }
  bentPipe(front,'Bent central brush guard',[[3.10,1.02,-.73],[3.10,1.76,-.73],[3.04,1.92,-.69],[3.04,1.92,.69],[3.10,1.76,.73],[3.10,1.02,.73]],.032);
  pipe(front,'Guard lower crossbar',[3.1,1.10,-.73],[3.1,1.10,.73],.032);
  for(const sign of [-1,1]){bentPipe(front,'Curved lamp protection wing',[[2.98,1.80,sign*.73],[2.92,1.84,sign*1.18],[2.91,1.77,sign*1.28],[2.98,1.43,sign*1.28],[3.03,1.39,sign*1.19],[3.04,1.40,sign*.77]],.028,true);pipe(front,'Guard mount',[2.86,1.4,sign*.77],[3.04,1.4,sign*.77],.026);}
  box(front,'Winch bumper',[.25,.25,1.45],[2.95,1.05,0],materials.dark);
  add(front,new THREE.CylinderGeometry(.085,.085,.66,16),materials.steel,'Winch drum',[3.09,1.1,0],[PI/2,0,0]);
  for(const s of [-1,1]){add(front,new THREE.TorusGeometry(.07,.016,6,16),materials.steel,'Tow shackle',[3.11,.98,s*.51],[0,PI/2,0]);box(front,'Winch plate',[.04,.13,.24],[3.1,1.31,s*.48],materials.sand);}
  for(const sign of [-1,1]){for(const radius of [.04,.062,.084]){const ring=new THREE.TorusGeometry(radius,.003,4,28);ring.rotateY(PI/2);add(front,ring,materials.steel,'Headlamp reflector ring',[2.936,1.54,sign*.82]);}box(front,'Headlight upper armor lip',[.25,.055,.45],[2.81,1.71,sign*.92],materials.olive);}
  const skid=box(front,'Sloped underbody skid',[.09,.56,1.53],[2.76,.78,0],materials.patch,[0,0,.5]);
  const rear=group('Rear access and spare mount',[-.6,0,0]);
  box(rear,'Rear access gasket',[.04,1.31,.83],[-2.73,2.02,-.42],materials.dark);box(rear,'Rear access door',[.07,1.25,.76],[-2.77,2.02,-.42],materials.patch);box(rear,'Rear door glass',[.02,.28,.37],[-2.82,2.28,-.42],materials.glass);
  for(const yy of [1.54,2.49])box(rear,'Rear hinge',[.12,.07,.17],[-2.83,yy,-.87],materials.steel);
  box(rear,'Rear bumper',[.19,.2,2.14],[-2.81,1.09,0],materials.patch);
  for(const s of [-1,1]){box(rear,'Rear light frame',[.08,.33,.19],[-2.83,1.51,s*.96],materials.dark);for(let i=0;i<3;i++)box(rear,'Rear light segment',[.012,.075,.135],[-2.88,1.41+i*.09,s*.96],i===1?materials.amber:materials.red);add(rear,new THREE.TorusGeometry(.07,.016,6,16),materials.steel,'Rear tow loop',[-2.93,.98,s*.68],[0,PI/2,0]);}
  for(const sign of [-1,1]){box(rear,'Rear vertical armor strip',[.17,.73,.19],[-2.96,1.53,sign*1.05],materials.sand);for(const yy of [1.29,1.51,1.72]){add(rear,new THREE.CylinderGeometry(.036,.036,.018,16),materials.dark,'Rear strip fastener',[-3.055,yy,sign*1.05],[0,0,PI/2]);}}
  if(p.spareWheel){const spare=wheel('Rear spare wheel',-2.98,2.09,.43,-1,.91);spare.rotation.y=PI;spare.userData.explode=[-.8,0,.2];}
  if(p.roofEquipment){const roof=group('Roof equipment rack',[0,.65,0]);
   for(const z of [-.86,.86]){bentPipe(roof,'Bent roof perimeter',[[-1.76,2.56,z],[-1.78,2.70,z],[-1.66,2.75,z],[.57,2.75,z],[.70,2.70,z],[.70,2.58,z]],.023);for(const x of [-1.58,-.6,.56])pipe(roof,'Rack mounting leg',[x,2.55,z],[x,2.74,z],.021);}
   for(const x of [-1.62,-.6,.56])pipe(roof,'Roof rack crossmember',[x,2.72,-.86],[x,2.72,.86],.022);
   box(roof,'Long roof utility box',[1.21,.25,.46],[-.14,2.88,-.23],materials.sand);
   box(roof,'Cooling enclosure',[.44,.32,.45],[-1.42,2.89,.30],materials.sand);
   box(roof,'Cooling vent recess',[.34,.24,.025],[-1.42,2.89,.536],materials.dark);
   for(let i=0;i<7;i++){pipe(roof,'Cooling mesh horizontal',[-1.59,2.78+i*.033,.554],[-1.25,2.78+i*.033,.554],.005);pipe(roof,'Cooling mesh diagonal',[-1.59+i*.045,2.77,.558],[-1.55+i*.045,3.01,.558],.005);}
   add(roof,new THREE.CylinderGeometry(.145,.145,.34,32),materials.sand,'Round radio enclosure',[-.99,2.91,.33]);
   for(const yy of [2.745,3.075])add(roof,new THREE.CylinderGeometry(.148,.148,.023,32),materials.steel,'Radio enclosure lid',[-.99,yy,.33]);
   for(const x of [-.61,.02]){box(roof,'Electronics enclosure',[.37,.30,.38],[x,2.92,.30],materials.sand);pipe(roof,'Equipment mounting foot',[x,2.69,.12],[x,2.80,.12],.035,materials.dark);}
   add(roof,new THREE.CylinderGeometry(.094,.094,.05,24),materials.steel,'Round equipment port',[-.62,2.96,.52],[PI/2,0,0]);
   const device=box(roof,'Sloping optical housing',[.31,.25,.30],[.51,2.93,.32],materials.dark,[0,0,.2]);
   box(roof,'Optical equipment window',[.19,.16,.012],[.50,2.98,.48],materials.glass,[0,0,.2]);
   for(const [x,z,h]of [[-1.50,.78,.71],[.62,-.7,.46]]){add(roof,new THREE.CylinderGeometry(.038,.068,.16,16),materials.sand,'Antenna base',[x,2.82,z]);pipe(roof,'Whip antenna',[x,2.89,z],[x,2.89+h,z],.005,materials.sand);}
   pipe(roof,'Sensor mast',[-.96,3.07,-.13],[-.96,3.34,-.13],.022,materials.dark);add(roof,new THREE.SphereGeometry(.056,16,10),materials.steel,'Sensor head',[-.96,3.38,-.13]);
   for(const x of [-1.42,-.61,.02])for(const z of [.14,.46])bolt(roof,[x,3.09,z],'y',.014);
  }
  if(!['structural-pass'].includes(stage)){
   // Real grille diamonds, not an opaque decorative panel.
   for(let i=-12;i<=12;i++){const z=i*.07,y0=1.33,y1=1.68;const za=Math.max(-.66,z-.18),zb=Math.min(.66,z+.18);if(zb>za){pipe(front,'Diamond grille',[2.86,y0,za],[2.86,y1,zb],.006,materials.steel);pipe(front,'Diamond grille',[2.866,y1,za],[2.866,y0,zb],.006,materials.steel);}}
   for(const g of [hull,hood])for(const x of [-2.2,-1.6,-.9,0,.5,1.45,2.1])for(const s of [-1,1])if(g===hull&&x<1||g===hood&&x>1){bolt(g,[x,g===hull?1.28:1.73,s*1.092]);}
   for(const s of [-1,1]){pipe(hood,'Hood upper rail',[1.4,2.02,s*.82],[2.55,1.86,s*.82],.019,materials.steel);for(const x of [1.5,2.4])box(hood,'Hood latch',[.075,.09,.05],[x,1.85,s*1.09],materials.dark);}
  }
 }
 wheelParts.forEach(p=>p.geo.dispose());disposeWheel(wheelProto);
 // Original side wheelbase calibrates 193 px/m. The cabin sat 24 cm too high above its axles.
 for(const g of groups){let dy=0;if(g.name==='Armored hull'||g.name.includes('door')||g.name.includes('steps')||g.name.includes('service equipment')||g.name==='Split armored windshield'||g.name==='Rear access and spare mount')dy=-.24;else if(g.name.includes('fender'))dy=-.18;else if(g.name==='Roof equipment rack')dy=-.18;else if(g.name==='Sloped engine hood'||g.name==='Grille and brush guard')dy=-.08;else if(g.name==='Rear spare wheel')dy=-.37;
  if(g.name==='Grille and brush guard')for(const o of g.children)if(/Mirror|Rear view mirror/i.test(o.name))o.position.y-=.16;
  g.position.y+=dy;
  for(const o of g.children){if(o.material!==materials.side||!o.material.map)continue;o.updateMatrix();const a=o.geometry.attributes.position,u=o.geometry.attributes.uv,v=new THREE.Vector3();for(let i=0;i<a.count;i++){v.fromBufferAttribute(a,i).applyMatrix4(o.matrix);u.setXY(i,(631+193*(v.x+g.position.x))/1205,(15+193*(v.y+g.position.y))/590);}}
 }
 for(const g of groups){batchGroup(g);const d=g.userData.explode;g.position.add(new THREE.Vector3(...d).multiplyScalar(p.explode));}
 root.scale.x=p.length/6.1;
 root.userData.reconstruction={reference:'user supplied armored 4x4',workflow:'img2threejs staged sculpt',surface:'de-lit original photo projection',hiddenGeometry:'inferred from generated three views',reuse:['wheel-assembly/buildWheelGroup','shared Worker/workbench/AssetIR/GLB'],stage};
 const used=new Set();root.traverse(o=>{if(o.material)used.add(o.material);});Object.values(materials).filter(m=>!used.has(m)).forEach(m=>{if(m.map&&!Array.from(used).some(u=>u.map===m.map))m.map.dispose();m.dispose();});
 return root;
}
