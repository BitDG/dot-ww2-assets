import Ajv from 'ajv';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import {getParameterUI} from './parameter-ui.mjs';
import {BUDGET} from './index.mjs';

const empty={type:'object',additionalProperties:false,properties:{}};
export const isObject=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
export function portableJSON(value,label){
  const encoded=JSON.stringify(value,(_key,v)=>{if(typeof v==='function'||typeof v==='symbol'||typeof v==='bigint'||(typeof v==='number'&&!Number.isFinite(v)))throw Error(label+' must be JSON-portable');return v;});
  if(encoded===undefined||encoded.length>2000000)throw Error(label+' exceeds 2MB or is not JSON');return JSON.parse(encoded);
}
function compile(schema,label){
  if(!isObject(schema)||schema.type!=='object')throw Error(label+' must be an object-root JSON Schema');
  const dialect=schema.$schema||'http://json-schema.org/draft-07/schema#';
  if(!/^(https?:\/\/json-schema.org\/(draft-07\/schema#?|draft\/2020-12\/schema#?))$/.test(dialect))throw Error('Unsupported JSON Schema dialect: '+dialect);
  const Constructor=dialect.includes('2020-12')?Ajv2020:Ajv;
  const ajv=new Constructor({allErrors:true,strictSchema:true,strictTypes:false,strictTuples:false,strictRequired:false,ownProperties:true,multipleOfPrecision:8});addFormats(ajv);
  const canonical=dialect.includes('2020-12')?'https://json-schema.org/draft/2020-12/schema':'http://json-schema.org/draft-07/schema#';
  try{return ajv.compile({...schema,$schema:canonical});}catch(error){throw Error(label+' is invalid: '+error.message);}
}
function check(validate,value,label){if(!validate(value))throw Error(label+': '+validate.errors.slice(0,6).map(e=>(e.instancePath||'/')+' '+e.message).join('; '));}
/** One validator for Node MCP and browser Workers. Defaults remain algorithm-owned. */
export function prepareGenerator(adapter){
  if(!isObject(adapter)||typeof adapter.generate!=='function')throw Error('Generator entry must default-export an adapter with generate(request, context)');
  const schema=portableJSON(adapter.parameterSchema,'parameterSchema'),inputSchema=portableJSON(adapter.inputSchema??empty,'inputSchema');
  const paramsValidator=compile(schema,'parameterSchema'),inputValidator=compile(inputSchema,'inputSchema');
  if(adapter.quality!==undefined&&(!Array.isArray(adapter.quality)||!adapter.quality.length||adapter.quality.some(v=>typeof v!=='string'||!v)))throw Error('quality must be a nonempty string array');
  const defaults=portableJSON(adapter.defaults??{},'defaults'),inputExample=portableJSON(adapter.inputExample??{},'inputExample');
  if(!isObject(defaults)||!isObject(inputExample))throw Error('defaults and inputExample must be objects');
  const ui=getParameterUI(schema,adapter.ui);
  return {schema,inputSchema,defaults,inputExample,ui,async generate(args,{budget=BUDGET,signal}={}){
    if(!isObject(args)||typeof args.seed!=='string'||!args.seed.length||args.seed.length>128)throw Error('seed must be a nonempty string of at most 128 characters');
    const params=args.params===undefined?{}:args.params,input=args.input===undefined?{}:args.input;
    check(paramsValidator,params,'params');check(inputValidator,input,'input');
    if(args.quality!==undefined&&!adapter.quality?.includes(args.quality))throw Error('Unsupported quality: '+args.quality);
    const result=await adapter.generate({seed:args.seed,params:structuredClone(params),input:structuredClone(input),...(args.quality!==undefined?{quality:args.quality}:{})},{budget,...(signal?{signal}:{})});
    if(!isObject(result)||!result.asset||result.recipe===undefined)throw Error('generate must return {asset: AssetIR, recipe: JSON}');
    if(result.diagnostics!==undefined&&!Array.isArray(result.diagnostics))throw Error('diagnostics must be an array');
    return {...result,recipe:portableJSON(result.recipe,'recipe'),diagnostics:portableJSON(result.diagnostics??[],'diagnostics')};
  }};
}
