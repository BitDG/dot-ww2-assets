/** Serializable candidate modifiers. Final terrain/spacing/exclusion checks remain mandatory. */
export const RULE_DEFAULTS={slope:{min:0,max:35},height:{min:-10000,max:10000},density:{probability:.75},scale:{factor:1.2},rotate:{degrees:20},clearance:{kind:'road',marginM:2}};
const fields={slope:['min','max'],height:['min','max'],density:['probability'],scale:['factor'],rotate:['degrees'],clearance:['kind','marginM']};
export function validateRules(rules=[]){
  if(!Array.isArray(rules)||rules.length>32)throw Error('规则链最多 32 步');const ids=new Set();
  return rules.map(rule=>{
    if(!rule||!Object.hasOwn(fields,rule.type)||typeof rule.id!=='string'||!/^[a-zA-Z0-9-]{1,64}$/.test(rule.id)||ids.has(rule.id)||Object.keys(rule).some(key=>!['id','type','enabled',...fields[rule.type]].includes(key)))throw Error('规则 ID、类型或字段无效');ids.add(rule.id);
    if(rule.enabled!==undefined&&typeof rule.enabled!=='boolean')throw Error('规则启用状态无效');const r={...RULE_DEFAULTS[rule.type],...rule};
    for(const key of fields[r.type])if(key!=='kind'&&(!Number.isFinite(r[key])||Math.abs(r[key])>1000000))throw Error('规则数值无效');
    if((['slope','height'].includes(r.type)&&r.min>r.max)||(r.type==='slope'&&(r.min<0||r.max>90))||(r.type==='density'&&(r.probability<0||r.probability>1))||(r.type==='scale'&&(r.factor<=0||r.factor>100))||(r.type==='clearance'&&(!['road','building','water','brush'].includes(r.kind)||r.marginM<0||r.marginM>1000)))throw Error('规则参数超出范围');return r;
  });
}
function unit(seed){let h=2166136261;for(const c of seed){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return (h>>>0)/4294967296;}
export function applyRules(rules,candidate,{seed,id,surface}){
  const result={...candidate,clearance:[]};
  for(const rule of rules){if(rule.enabled===false)continue;
    if(rule.type==='slope'&&(surface.slope<rule.min||surface.slope>rule.max))return null;
    if(rule.type==='height'&&(surface.height<rule.min||surface.height>rule.max))return null;
    if(rule.type==='density'&&unit(seed+'::'+id+'::'+rule.id)>=rule.probability)return null;
    if(rule.type==='scale')result.scale*=rule.factor;
    if(rule.type==='rotate')result.yaw+=rule.degrees*Math.PI/180;
    if(rule.type==='clearance')result.clearance.push({kind:rule.kind,marginM:rule.marginM});
    if(!Number.isFinite(result.scale)||result.scale<=0||result.scale>100||!Number.isFinite(result.yaw))throw Error('规则链产生超出预算的变换');
  }
  return result;
}
