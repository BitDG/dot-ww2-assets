import {addFurniture} from '../road-network/src/furniture.mjs';
import {primitive,boundsFromPositions,srgbToLinear} from '../realmap/src/geometry.mjs';
const identity=()=>({position:[0,0,0],rotation:[0,0,0,1],scale:[1,1,1]});
/** Reuse the road generator's fixture geometry, now as independently editable modules. */
export function infrastructureCatalog(){return ['streetlight:right','streetlight:left','signal:vehicle'].map((tag,i)=>{
 const builders=new Map();addFurniture(builders,[{tags:[tag],transform:identity()}]);
 const colors={steel:'#657078',concrete:'#777a7d',marking:'#e9dcae','signal-housing':'#20262b','signal-red':'#ff493a','signal-amber':'#594420','signal-green':'#193f32'},meshes=[],materials=[];
 for(const [id,b]of builders){if(!b.positions.length)continue;const pr=primitive(b,id);meshes.push({id,primitives:[pr],bounds:boundsFromPositions([pr])});materials.push({id,model:'pbr-metallic-roughness',baseColor:[...srgbToLinear(colors[id]),1],metallic:0,roughness:.65,alphaMode:'OPAQUE',doubleSided:false});}
 const nodes=meshes.map(m=>({id:m.id,meshId:m.id,children:[],transform:identity(),tags:['furniture']})),asset={schemaVersion:'0.1',id:'world:infrastructure:'+i,generator:{id:'pgf.road-network.furniture',version:'0.1'},seed:'fixture',nodes,rootNodeIds:nodes.map(n=>n.id),meshes,materials,textures:[],bounds:boundsFromPositions(meshes.flatMap(m=>m.primitives)),colliders:[],sockets:[],lods:[],metadata:{kind:tag,inferred:true}};
 return {asset,contentHash:asset.id,category:'furniture',kind:tag,moduleId:['street.light-right','street.light-left','street.signal'][i],radiusM:.6};
});}
