import * as THREE from 'three';
import * as png from './png.mjs';
import {compactPrimitive} from '../src/geometry/compact.mjs';
import {assetBounds,validateAsset} from '../src/plugins/scatter/io.js';

// Preserve static geometry, hierarchy, material groups and instances without a browser.
export async function threeToIR(root) {
  const asset={schemaVersion:'0.1',id:'model',rootNodeIds:[],nodes:[],meshes:[],materials:[],textures:[],bounds:{min:[0,0,0],max:[0,0,0]},metadata:{},colliders:[],sockets:[],lods:[]};
  const materials=new Map(),textures=new Map(),meshes=new Map(),geometries=new WeakMap();
  async function texture(t) {
    if(textures.has(t))return textures.get(t);
    const im=t.image;
    if(!im?.data||im.data.length!==im.width*im.height*4||!(im.data instanceof Uint8Array))throw Error('Unsupported texture pixels; browser adapter required');
    if(t.offset.x||t.offset.y||t.repeat.x!==1||t.repeat.y!==1||t.rotation)throw Error('Unsupported texture transform');
    const id='texture-'+textures.size; textures.set(t,id);
    // DataTexture uses bottom-up rows; PNG/glTF uses top-down image coordinates.
    const pixels=new Uint8Array(im.data);
    if(t.flipY)for(let y=0;y<im.height;y++)pixels.set(im.data.subarray((im.height-1-y)*im.width*4,(im.height-y)*im.width*4),y*im.width*4);
    asset.textures.push({id,mimeType:'image/png',width:im.width,height:im.height,bytes:await png.encodePNG(pixels,im.width,im.height),colorSpace:t.colorSpace===THREE.SRGBColorSpace?'srgb':'linear-data'});
    return id;
  }
  async function material(m,tint) {
    if(m.normalMap&&(m.normalScale.x!==1||m.normalScale.y!==1))throw Error('Non-unit normalScale requires a dedicated material adapter');
    if(m.emissiveMap||m.emissive?.toArray().some(v=>v*(m.emissiveIntensity??1)!==0))throw Error('Emissive materials require a dedicated material adapter');
    if(m.aoMap||m.alphaMap||m.bumpMap||m.displacementMap||m.lightMap)throw Error('Unsupported material texture channel');
    const key=m.uuid+':'+(tint?.toArray().join(',')||'');if(materials.has(key))return materials.get(key);
    const id='material-'+materials.size;materials.set(key,id);
    const color=m.color.clone();if(tint)color.multiply(tint);
    const out={id,model:'pbr-metallic-roughness',baseColor:[...color.toArray(),m.opacity],metallic:m.metalness??0,roughness:m.roughness??1,alphaMode:m.transparent?'BLEND':m.alphaTest?'MASK':'OPAQUE',alphaCutoff:m.alphaTest,doubleSided:m.side===THREE.DoubleSide};
    if(m.map)out.baseColorTextureId=await texture(m.map);
    if(m.normalMap)out.normalTextureId=await texture(m.normalMap);
    if(m.roughnessMap||m.metalnessMap){if(m.roughnessMap!==m.metalnessMap)throw Error('Separate metallic/roughness textures require packing');out.metallicRoughnessTextureId=await texture(m.roughnessMap);}
    asset.materials.push(out);return id;
  }
  async function mesh(o,tint) {
    const g=o.geometry,ms=Array.isArray(o.material)?o.material:[o.material];
    const key=g.uuid+':'+ms.map(m=>m.uuid).join(',')+':'+(tint?.toArray().join(',')||'');if(meshes.has(key))return meshes.get(key);
    const id='mesh-'+meshes.size;meshes.set(key,id);const primitives=[];
    const grouped=Array.isArray(o.material),cache=geometries.get(g)??new Map();geometries.set(g,cache);
    if(!cache.has(grouped)){
      const indices=g.index?Uint32Array.from(g.index.array):Uint32Array.from({length:g.attributes.position.count},(_,i)=>i),attributes={};
      // Geometry is immutable during conversion. Copy attributes once across groups and material variants.
      for(const [key,name]of [['position','positions'],['normal','normals'],['uv','uv0'],['uv1','uv1'],['color','colors'],['tangent','tangents']]){
        const a=g.attributes[key];if(!a)continue;const size=key==='color'?4:a.itemSize,out=new Float32Array(a.count*size);
        for(let i=0;i<a.count;i++)for(let k=0;k<size;k++)out[i*size+k]=k>=a.itemSize?1:a.getComponent(i,k);attributes[name]=out;
      }
      const groups=grouped?g.groups:[{start:0,count:indices.length,materialIndex:0}];
      cache.set(grouped,groups.map(group=>({materialIndex:group.materialIndex,geometry:compactPrimitive({...attributes,indices:indices.slice(group.start,group.start+group.count)})})));
    }
    for(const {materialIndex,geometry}of cache.get(grouped))primitives.push({...geometry,materialId:await material(ms[materialIndex],tint)});
    asset.meshes.push({id,primitives});return id;
  }
  const transform=o=>({position:o.position.toArray(),rotation:o.quaternion.toArray(),scale:o.scale.toArray()});
  async function visit(o) {
    if(!o.visible)return null;
    const id='node-'+asset.nodes.length,n={id,name:o.name||id,transform:transform(o),children:[],tags:[]};asset.nodes.push(n);
    if(o.isSkinnedMesh)throw Error('Skinned meshes require a dedicated adapter');
    if(o.isInstancedMesh){for(let i=0;i<o.count;i++){const matrix=new THREE.Matrix4(),dummy=new THREE.Object3D(),tint=o.instanceColor?new THREE.Color():null;o.getMatrixAt(i,matrix);if(Math.abs(matrix.determinant())<1e-12)continue;matrix.decompose(dummy.position,dummy.quaternion,dummy.scale);if(tint)o.getColorAt(i,tint);const child='node-'+asset.nodes.length;asset.nodes.push({id:child,name:o.name+'-'+i,meshId:await mesh(o,tint),transform:transform(dummy),children:[],tags:[]});n.children.push(child);}}
    else if(o.isMesh)n.meshId=await mesh(o);
    for(const c of o.children){const child=await visit(c);if(child)n.children.push(child);}return id;
  }
  root.updateMatrixWorld(true);asset.rootNodeIds=[await visit(root)];asset.bounds=assetBounds(asset);return validateAsset(asset);
}
