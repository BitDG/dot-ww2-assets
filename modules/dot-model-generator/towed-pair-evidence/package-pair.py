from pathlib import Path
import hashlib,json,zipfile
here=Path(__file__).resolve().parent;root=here.parents[2]
sha=lambda b:hashlib.sha256(b).hexdigest()
base='00465811a4bbe5664b081fe338e465003c8018d8'
previous=json.loads((here/'QF17-GIT-WHITELIST.json').read_text());previous={x['path']:x['sha256'] for x in previous['files']}
land=json.loads((here/'LM-L3-FROZEN-CORE.json').read_text())
files=[]
for row in land['coreFiles']:
 p=root/row['repoPath'];assert sha(p.read_bytes())==row['sha256'];files.append(p)
landroot=root/'modules/land-mattress-visual-prop'
for p in (landroot/'references').iterdir():
 if p.is_file():files.append(p)
for name in ['L3-final-independent-readback.json','default-recipe.json','exports.json','node-report.json','node-tests.tap']:files.append(landroot/'evidence'/name)
lm=landroot/'evidence/final/minimal-publish-manifest.json';lmdata=json.loads(lm.read_text());files.append(lm)
for row in lmdata['files']:
 p=root/row['repoPath'];assert sha(p.read_bytes())==row['sha256'];files.append(p)
qm=root/'modules/qf17-visual-prop/evidence/Q6-final/manifest.json';qdata=json.loads(qm.read_text());files.append(qm)
for row in qdata['files']:
 p=root/row['suggestedRepoPath'];assert sha(p.read_bytes())==row['sha256'];files.append(p)
shared=['catalog.mjs','backends.js','definition.mjs','workbench.js','dot-model-generator.generator.json','README.zh-CN.md','tests/catalog.test.mjs','tests/towed-static-contract.test.mjs']
files += [root/'modules/dot-model-generator'/p for p in shared]
helpers=['node-unified.mjs','browser-check.mjs','browser-visual.mjs','serve-qa.mjs','run-gui-qa.py','read-visible-download.mjs','build-check.mjs','build-entry.html']
new=['LM-L3-FROZEN-CORE.json','land-baseline-catalog.json','land-host-baseline-sha256.txt','land-catalog-node.log','land-unified-node.log','pair-combined-node.log','pair-combined-node.exit','pair-final-catalog-node.log','pair-dot-build.log','pair-dot-build.exit','LM-L3-CHECKPOINT.zh-CN.md','package-pair.py']
files += [here/p for p in helpers+new]
files += [p for p in (here/'land-mattress-visual-prop').iterdir() if p.is_file()]
files=sorted(set(files));rows=[{'path':str(p.relative_to(root)),'bytes':p.stat().st_size,'sha256':sha(p.read_bytes())} for p in files]
report=json.loads((here/'land-mattress-visual-prop/browser-report.json').read_text());assert report['status']=='passed' and len(report['checks'])==51
assert (here/'pair-combined-node.exit').read_text().strip()=='0' and (here/'pair-dot-build.exit').read_text().strip()=='0'
manifest={'stage':'Land Mattress L3 dot0.9 plus QF17 final real-render evidence','sharedVersion':'0.9.0','baselineCommit':base,'notStandalone':True,'checks':{'sharedAndBothAuthorsNode':{'passed':120,'failed':0},'finalCatalogNode':{'passed':13,'failed':0},'landFirefoxGUI':{'passed':51,'failed':0},'qf17FirefoxGUI':'48 passed in preceding published stage; QF17 switch regression also passed in Land run','bothThreeTierGLB':'same-request unified/native byte equivalence and independent readback passed','visibleGLBDownload':'Land passed; 26 meshes / 48036 triangles / 3 decoded PNG / 0 animations','desktopResize':'Land passed; 1168->955->1168 twice; no overflow or crop, one canvas','targetedDotBuild':{'exit':0},'fullLocalAggregate':'not completed for 0.9; restored snapshot lacks unrelated CLI/test files','remoteCI':'not yet run for final 0.9 commit; parent publication owner verifies','authorFinalRealRenders':'both complete; same frozen medium GLB, hero / orthographic three-view / six details, original receipts and hashes retained'},'files':rows}
raw=(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n').encode();mp=here/'PAIR-PACKAGE-MANIFEST.json';mp.write_bytes(raw)
delta=[r for r in rows if previous.get(r['path'])!=r['sha256']]
whitelist={'base':base,'stage':manifest['stage'],'noDeletions':True,'files':delta+[{'path':str(mp.relative_to(root)),'bytes':len(raw),'sha256':sha(raw)}]}
wraw=(json.dumps(whitelist,ensure_ascii=False,indent=2)+'\n').encode();wp=here/'PAIR-GIT-WHITELIST.json';wp.write_bytes(wraw)
output=root.parents[1]/'Towed-Pair-dot-0.9-final-checkpoint.zip'
with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for p in files:z.write(p,str(p.relative_to(root)))
 z.writestr(str(mp.relative_to(root)),raw);z.writestr(str(wp.relative_to(root)),wraw)
with zipfile.ZipFile(output) as z:
 assert z.testzip() is None
 for r in rows:assert sha(z.read(r['path']))==r['sha256']
receipt={'path':str(output),'bytes':output.stat().st_size,'sha256':sha(output.read_bytes()),'manifestSHA256':sha(raw),'gitWhitelistSHA256':sha(wraw),'manifestFiles':len(files),'zipMembers':len(files)+2,'gitFiles':len(whitelist['files']),'zipReadback':'all member hashes verified'}
(here/'pair-package-receipt.json').write_text(json.dumps(receipt,indent=2));print(json.dumps(receipt))
