import {getParameterUI, PARAMETER_TABS} from '../../generator-sdk/parameter-ui.mjs';
/** Render the original schema in the one shared inspector; no second editor or renderer. */
export function mountSchemaControls(container,adapter,recipe) {
  container.replaceChildren();const fields=new Map(),schema=adapter.parameterSchema.properties;
  const ui=getParameterUI(adapter.parameterSchema,adapter.ui);
  const document=container.ownerDocument;
  function field(label,input,key){const row=document.createElement('label'),caption=document.createElement('span');
    row.className='plugin-field';caption.textContent=label;row.append(caption,input);container.append(row);
    row.dataset.dotGroup=key==='seed'?'basic':ui.fields[key]?.tab??'advanced';fields.set(key,{input,row});}
  const seed=document.createElement('input');seed.type='text';seed.maxLength=128;seed.dataset.seed='';seed.name='seed';field('随机种子',seed,'seed');
  for(const [key,spec]of Object.entries(schema)){
    let input;
    if(spec.enum){input=document.createElement('select');spec.enum.forEach((value,index)=>{
      const option=document.createElement('option');option.value=String(index);option.textContent=adapter.enumLabels?.[key]?.[index]??spec.enumNames?.[index]??String(value);input.append(option);});}
    else if(['object','array'].includes(spec.type)){input=document.createElement('textarea');input.rows=4;}
    else{input=document.createElement('input');input.type=spec.type==='boolean'?'checkbox':spec.type==='string'?'text':'number';
      input.step=spec.multipleOf??(spec.type==='integer'?'1':'any');if(spec.minimum!==undefined)input.min=spec.minimum;if(spec.maximum!==undefined)input.max=spec.maximum;if(spec.pattern)input.pattern=spec.pattern;}
    input.dataset.param=key;input.title=spec.description??spec.title??key;field(spec.title??key,input,key);
  }
  function paint(value){seed.value=value.seed;for(const [key,spec]of Object.entries(schema)){
    const {input}=fields.get(key),v=value.params[key];if(spec.enum)input.value=String(spec.enum.indexOf(v));else if(spec.type==='boolean')input.checked=!!v;
    else input.value=['object','array'].includes(spec.type)?JSON.stringify(v,null,2):v??'';
  }}
  function read(base){const params={};for(const [key,spec]of Object.entries(schema)){
    const {input}=fields.get(key);if(['number','integer','array','object'].includes(spec.type)&&input.value===''&&!(key in adapter.defaults))continue;
    params[key]=spec.enum?spec.enum[Number(input.value)]:spec.type==='boolean'?input.checked:['object','array'].includes(spec.type)?JSON.parse(input.value):spec.type==='string'?input.value:input.value===''?NaN:Number(input.value);
  }return {...base,seed:seed.value,params};}
  function tab(id){for(const {row}of fields.values())row.hidden=id!=='advanced'&&row.dataset.dotGroup!==id;}
  paint(recipe);return {paint,read,tab,ui,tabs:PARAMETER_TABS.filter(t=>['basic','advanced'].includes(t.id)||[...fields.values()].some(f=>f.row.dataset.dotGroup===t.id))};
}
