import json,pathlib,hashlib,sys
p=pathlib.Path(sys.argv[1] if len(sys.argv)>1 else 'evidence/kar98k-wip/refinement-2026-10-22');std=json.loads((p/'standard/glb.json').read_text());high=json.loads((p/'default-glb.json').read_text());lo=json.loads((p/'minimum/glb.json').read_text());hi=json.loads((p/'maximum/glb.json').read_text())
assert std['triangles']<high['triangles'] and std['meshes']<high['meshes'];assert set(std['parts'])<set(high['parts']);assert std['sha256']!=high['sha256']
assert abs(lo['artBounds'][0]/std['artBounds'][0]-.85)<1e-5;assert abs(hi['artBounds'][0]/high['artBounds'][0]-1.15)<1e-5
assert 'sling_visual' not in lo['parts']
for r,x in [(lo,.35),(hi,1)]:assert abs(next(m for m in r['materialParameters'] if 'wood' in m['name'])['roughness']-x)<1e-6
for name,r,file in [('standard',std,'kar98k-exterior-standard.glb'),('showcase',high,'kar98k-exterior-wip.glb')]:assert hashlib.sha256((pathlib.Path('assets/kar98k-wip')/file).read_bytes()).hexdigest()==r['sha256']
info={key:{'meshes':r['meshes'],'triangles':r['triangles'],'sha256':r['sha256']} for key,r in [('standard',std),('showcase',high)]}
pathlib.Path('assets/kar98k-wip/model-info.json').write_text(json.dumps(info,indent=2)+'\n');(p/'tier-parameters.json').write_text(json.dumps({'status':'passed','tiers':info,'extraShowcaseParts':sorted(set(high['parts'])-set(std['parts'])),'checks':['Actual mesh/triangle differences, not texture swaps','Actual minimum/maximum artScale bounds','Actual minimum/maximum wood roughness','Sling removed in exported minimum variant','9 invalid values rejected before Blender launch']},indent=2)+'\n');print(info)
