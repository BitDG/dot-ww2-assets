from pathlib import Path
import hashlib,json,zipfile
here=Path(__file__).resolve().parent
root=here.parents[2]
shared=root/'modules/dot-model-generator'
files=[]
for p in shared.rglob('*'):
 if not p.is_file():continue
 rel=p.relative_to(shared)
 if any(part in ['qf25-q2-evidence','flakzwilling-evidence','dot-build-output','build-output','__pycache__'] for part in rel.parts):continue
 if p.suffix in ['.zip','.b64'] or p.name in ['shared-change-manifest.json','PACKAGE-MANIFEST.json','library-receipt.json','package-receipt.json','stop-qa']:continue
 files.append(p)
for p in (root/'modules/bm13-us6-visual-prop').rglob('*'):
 if p.is_file() and not any(part in ['__pycache__'] for part in p.parts):files.append(p)
files=sorted(set(files))
sha=lambda b:hashlib.sha256(b).hexdigest()
manifest={'stage':'B6 dot integration checkpoint; Firefox visible UI and resize verified','baseline':'PGF main 416b1123 restored D4 + I2','sharedVersion':'0.7.0','notStandalone':True,'checks':{'combinedNode':{'passed':99,'failed':0},'unifiedGLB':'low/medium/high byte-identical to native module outputs with same request','firefoxProgrammatic':{'passed':47,'failed':0},'visibleUI':'passed: actual native Firefox screenshots, desktop resize roundtrip and visible export readback','targetedDotProductionBuild':'passed','fullRepositoryBuild':'failed: unrelated missing recovered module sources'},'files':[{'path':str(p.relative_to(root)),'bytes':p.stat().st_size,'sha256':sha(p.read_bytes())} for p in files]}
raw=(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n').encode();(here/'PACKAGE-MANIFEST.json').write_bytes(raw)
output=root.parents[1]/'BM13-B6-dot-integration-checkpoint.zip'
with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 z.writestr('PACKAGE-MANIFEST.json',raw)
 for p in files:z.write(p,str(p.relative_to(root)))
with zipfile.ZipFile(output) as z:
 assert z.testzip() is None
 for item in manifest['files']:assert sha(z.read(item['path']))==item['sha256']
receipt={'path':str(output),'bytes':output.stat().st_size,'sha256':sha(output.read_bytes()),'manifestSHA256':sha(raw),'manifestFiles':len(files),'zipMembers':len(files)+1,'zipReadback':'all member hashes verified'}
(here/'package-receipt.json').write_text(json.dumps(receipt,indent=2));print(json.dumps(receipt))
