from pathlib import Path
import hashlib,json,zipfile
here=Path(__file__).resolve().parent
root=here.parents[2]
freeze=json.loads((here/'QF17-FROZEN-CORE.json').read_text())
shared=['catalog.mjs','backends.js','definition.mjs','workbench.js','dot-model-generator.generator.json','README.zh-CN.md','tests/catalog.test.mjs','tests/towed-static-contract.test.mjs']
source=[root/'modules/qf17-visual-prop'/p for p in freeze['publishWhitelist']]
source += [root/'modules/dot-model-generator'/p for p in shared]
for p in here.rglob('*'):
 if not p.is_file():continue
 rel=p.relative_to(here)
 if any(x in ('dot-build-output','__pycache__') for x in rel.parts):continue
 if p.name in ['QF17-GIT-WHITELIST.json','QF17-PACKAGE-MANIFEST.json','qf17-package-receipt.json','qf17-library-receipt.json','stop-qa','vite-browser.log','firefox-browser.log'] or p.suffix=='.zip':continue
 if 'land-mattress-visual-prop' in rel.parts:continue
 source.append(p)
files=sorted(set(source));sha=lambda b:hashlib.sha256(b).hexdigest()
rows=[{'path':str(p.relative_to(root)),'bytes':p.stat().st_size,'sha256':sha(p.read_bytes())} for p in files]
manifest={'stage':'QF17 Q6 unified dot integration','sharedVersion':'0.8.0','baselineCommit':'9cf6e9487d14abf2ed9ae1019c221131da44fecc','notStandalone':True,'checks':{'node':{'passed':103,'failed':0},'firefoxGUI':{'passed':48,'failed':0},'visibleDownload':'passed; independent GLTFLoader and three PNGs decoded','desktopResize':'passed; 1147 to 955 to 1168px; single canvas, no clipping or overflow','targetedBuild':{'exit':0},'fullBuild':{'exit':127,'reason':'Restored dependencies lack Vite CLI link'},'fullTest':{'exit':1,'reason':'Restored snapshot lacks modules/rock/tests/core.test.mjs'},'authorFinalPBRViews':'not-run; awaiting authors final fixed-GLB multi-view renders'},'files':rows}
raw=(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n').encode();(here/'QF17-PACKAGE-MANIFEST.json').write_bytes(raw)
# The five L0 references already exist on main and are preserved unchanged.
gitrows=[x for x in rows if not x['path'].startswith('modules/qf17-visual-prop/reference/L0/')]
whitelist={'base':manifest['baselineCommit'],'stage':manifest['stage'],'files':gitrows+[{'path':str((here/'QF17-PACKAGE-MANIFEST.json').relative_to(root)),'bytes':len(raw),'sha256':sha(raw)}]}
wraw=(json.dumps(whitelist,ensure_ascii=False,indent=2)+'\n').encode();(here/'QF17-GIT-WHITELIST.json').write_bytes(wraw)
output=root.parents[1]/'QF17-Q6-dot-integration-checkpoint.zip'
with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for p in files:z.write(p,str(p.relative_to(root)))
 z.writestr(str((here/'QF17-PACKAGE-MANIFEST.json').relative_to(root)),raw)
 z.writestr(str((here/'QF17-GIT-WHITELIST.json').relative_to(root)),wraw)
with zipfile.ZipFile(output) as z:
 assert z.testzip() is None
 for row in rows:assert sha(z.read(row['path']))==row['sha256']
receipt={'path':str(output),'bytes':output.stat().st_size,'sha256':sha(output.read_bytes()),'manifestSHA256':sha(raw),'gitWhitelistSHA256':sha(wraw),'manifestFiles':len(files),'zipMembers':len(files)+2,'gitFiles':len(whitelist['files']),'zipReadback':'all member hashes verified'}
(here/'qf17-package-receipt.json').write_text(json.dumps(receipt,indent=2));print(json.dumps(receipt))
