/** Shared helpers for Node generator adapters. No MCP transport dependency. */
export function schemaFromDefaults(defaults) {
  return {type:'object',additionalProperties:false,properties:Object.fromEntries(
    Object.entries(defaults).map(([key,value])=>[key,{type:typeof value,default:value}])
  )};
}

export const API_VERSION='1';
export const BUDGET=Object.freeze({maxTriangles:2000000,maxDraws:20000,maxNodes:20000,maxOutputBytes:128000000});
