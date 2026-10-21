import {readdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
// Collections wiring belongs to the full PGF application, not this independent gallery.
const tests=readdirSync('modules/dot-model-generator/tests').filter(x=>x.endsWith('.test.mjs')&&!['collections.test.mjs'].includes(x)).map(x=>'modules/dot-model-generator/tests/'+x);
const r=spawnSync(process.execPath,['--test',...tests],{stdio:'inherit'});process.exitCode=r.status??1;
