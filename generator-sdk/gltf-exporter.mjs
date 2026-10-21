import {GLTFExporter as ThreeGLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {optimizeGLBResult} from '../src/geometry/glb-lossless.mjs';
/** The standard exporter contract with an exact, decoder-free binary packing pass. */
export class GLTFExporter extends ThreeGLTFExporter {
  parse(input,onDone,onError,options){return super.parse(input,result=>onDone(result instanceof ArrayBuffer?optimizeGLBResult(result):result),onError,options);}
}
