import pathlib,json,struct,sys,re
ROOT=pathlib.Path('/workspace/scratch/6a4c729be230/PGF');OUT=ROOT.parent/'pgf-model-final-review';reports=[]
for rel in sys.argv[1:]:
 b=(ROOT/rel).read_bytes();j=json.loads(b[20:20+struct.unpack_from('<I',b,12)[0]]);pgf=j['nodes'][0]['extras']['pgf'];meta=pgf['metadata'];ns={n.get('extras',{}).get('pgfNodeId'):n for n in j['nodes']};parts=0;bad=[];role_bad=[]
 for s in pgf['sockets']:assert s['nodeId'] in ns
 for c in meta['components']:
  n=ns[c['nodeId']];ps=j['meshes'][n['mesh']]['primitives'];tr=sum(j['accessors'][p['indices']]['count']//3 for p in ps);end=0
  for q in c.get('sourceParts',[]):
   parts+=1
   if q['start']!=end or q['start']+q['count']>tr:bad.append(q['name'])
   end=q['start']+q['count']
  if c.get('sourceParts') and end!=tr:bad.append(c['name'])
  if c['appearanceRole']!='armorPaint':
   for p in ps:
    if 'baseColorTexture'in j['materials'][p['material']]['pbrMetallicRoughness']:role_bad.append(c['name'])
 root=(ROOT/rel).parent.parent;visited=set();pending=[root/'definition.mjs',root/'core.mjs',root/'worker.js',root/'workbench.js'];badimports=[]
 while pending:
  p=pending.pop().resolve()
  if p in visited or not p.exists():continue
  visited.add(p);text=p.read_text()
  for r in re.findall(r'(?:from\s*|import\s*)[\'\"]([^\'\"]+)[\'\"]',text):
   if any(k in r for k in ['native-finish','blender-native-pbr','native-surfaces']):badimports.append([str(p),r])
   if r.startswith('.'):
    pp=(p.parent/r).resolve()
    if pp.suffix in ['.js','.mjs']:pending.append(pp)
 report={'path':rel,'generator':pgf['generator'],'recipe':meta['recipe'],'componentCount':len(meta['components']),'sourcePartCount':parts,'invalidSourceRanges':bad,'bareRoleTextureViolations':role_bad,'socketCount':len(pgf['sockets']),'socketReferences':'passed','finish':meta['finish'],'activeImportClosureFiles':len(visited),'unadoptedMaterialImports':badimports};reports.append(report)
(OUT/'semantic-audit.json').write_text(json.dumps(reports,ensure_ascii=False,indent=2));print(json.dumps(reports,ensure_ascii=False,indent=2))
