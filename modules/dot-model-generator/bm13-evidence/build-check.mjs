import {build} from 'vite';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../../',import.meta.url));
await build({root,configFile:false,publicDir:false,build:{outDir:fileURLToPath(new URL('./dot-build-output/',import.meta.url)),emptyOutDir:false,rollupOptions:{input:fileURLToPath(new URL('./build-entry.html',import.meta.url))}}});
