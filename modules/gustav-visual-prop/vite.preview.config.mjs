/** Isolated acceptance build of the real two module workbenches and shared PGF shell. */
import path from 'node:path';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
const deps=process.env.PGF_VEHICLE_TEST_DEPS??(existsSync(path.join(root,'node_modules/three/package.json'))?root:path.resolve(root,'../pgf-vehicle-test-deps'));
const registry=path.join(root,'modules/gustav-visual-prop/preview-registry.mjs');
export default {
 plugins:[{name:"vehicle-preview-registry",enforce:"pre",resolveId(source,importer){if(source==="./generator-registry.js" && importer?.endsWith("/src/workspace-shell.js"))return registry;}}],
 root,publicDir:false,cacheDir:path.resolve(root,'../pgf-gustav-vite-cache'),
 resolve:{alias:[
  {find:path.join(root,'src/generator-registry.js'),replacement:registry},
  {find:/^three\/addons\//,replacement:path.join(deps,'node_modules/three/examples/jsm/')},
  {find:/^three$/,replacement:path.join(deps,'node_modules/three/build/three.module.js')},
  {find:/^three\//,replacement:path.join(deps,'node_modules/three/')},
  ...['ajv-formats','ajv','fflate'].map(name=>({find:name,replacement:path.join(deps,'node_modules',name)})),
 ]},
 build:{outDir:path.resolve(root,'../pgf-gustav-preview-v2'),emptyOutDir:true,rolldownOptions:{input:{workbench:path.join(root,'modules/gustav-visual-prop/preview.html'),review:path.join(root,'modules/gustav-visual-prop/review.html')}}},
};
