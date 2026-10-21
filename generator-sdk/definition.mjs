import {getParameterUI} from './parameter-ui.mjs';
/** New adapters share this declaration in Node and browser; specialized algorithms stay local. */
export function defineGenerator(definition){
  if(!definition||typeof definition.generate!=='function'||definition.parameterSchema?.type!=='object')throw Error('A generator needs parameterSchema and generate');
  getParameterUI(definition.parameterSchema,definition.ui);
  return definition;
}
