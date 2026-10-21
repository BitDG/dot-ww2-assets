/** Parameter presentation is separate from JSON Schema and never changes values. */
export const PARAMETER_TABS=Object.freeze([
  {id:'basic',label:'常用'}, {id:'shape',label:'形状'},
  {id:'material',label:'材质'}, {id:'scene',label:'场景'}, {id:'damage',label:'战损'}, {id:'advanced',label:'完整'},
]);
const appearance=/color|colour|material|rough|metal|texture|paint|rust|wear|dirt|albedo|normal|emiss|颜色|材质|涂装|纹理|锈|磨损/i;
const environment=/wind|weather|light|sun|fog|camera|exposure|ocean|环境|风力|天气|光照|太阳|相机|曝光/i;
const advanced=/budget|detail|resolution|segments|bake|iterations|backend|path|spline|quality|input|质量|精度|烘焙|分段|迭代|后端|路径|控制点/i;
export function parameterTab(key,title=''){
  const text=key+' '+title;
  return advanced.test(text)?'advanced':appearance.test(text)?'material':environment.test(text)?'scene':'shape';
}
export function getParameterUI(schema,custom={}){
  const properties=schema?.properties??{},keys=Object.keys(properties),known=new Set(keys);
  if(!custom||typeof custom!=='object'||Array.isArray(custom))throw Error('ui must be an object');
  const groups=custom.groups??[];
  if(!Array.isArray(groups))throw Error('ui.groups must be an array');
  const assigned=new Map();
  for(const group of groups){
    if(!group||!PARAMETER_TABS.some(t=>t.id===group.id)||!Array.isArray(group.fields))throw Error('Invalid ui parameter group');
    for(const key of group.fields){if(!known.has(key)||assigned.has(key))throw Error('Unknown or repeated ui parameter: '+key);assigned.set(key,group.id);}
  }
  const inferred=keys.filter(key=>!['array','object'].includes(properties[key].type)&&!advanced.test(key+' '+(properties[key].title??''))&&!appearance.test(key));
  const preferred=inferred.filter(key=>/^(variant|type|family|species|preset|profileId|component|size|width|height|length|scale|density|radius|seed)$/i.test(key));
  const basic=custom.basic??[...preferred,...inferred.filter(k=>!preferred.includes(k))].slice(0,6);
  if(!Array.isArray(basic)||basic.length>8||new Set(basic).size!==basic.length||basic.some(k=>!known.has(k)))throw Error('ui.basic must contain at most 8 unique schema fields');
  const fields=Object.fromEntries(keys.map(key=>[key,{label:properties[key].title??key,tab:basic.includes(key)?'basic':assigned.get(key)??(['array','object'].includes(properties[key].type)?'advanced':parameterTab(key,properties[key].title)),type:properties[key].type}]));
  return {version:1,basic:[...basic],tabs:PARAMETER_TABS.map(t=>({...t,fields:t.id==='advanced'?[...keys]:keys.filter(k=>fields[k].tab===t.id)})),fields};
}
