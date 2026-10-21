import pathlib,struct,json,hashlib,math,zlib,sys
ROOT=pathlib.Path('/workspace/scratch/6a4c729be230/PGF')
OUT=pathlib.Path('/workspace/scratch/6a4c729be230/pgf-model-final-review')
paths=sys.argv[1:] or ['modules/gustav-visual-prop/evidence/gustav-G6-cf838215.glb','modules/diesel-locomotive/evidence/diesel-medium.glb']
reports=[]
for rel in paths:
 b=(ROOT/rel).read_bytes(); errors=[]; warnings=[]
 magic,ver,length=struct.unpack_from('<III',b);assert magic==0x46546c67 and ver==2 and length==len(b)
 chunks=[];off=12
 while off<len(b):
  size,typ=struct.unpack_from('<II',b,off);off+=8;assert size%4==0 and off+size<=len(b);chunks.append((typ,b[off:off+size]));off+=size
 assert len(chunks)==2 and chunks[0][0]==0x4e4f534a and chunks[1][0]==0x004e4942
 j=json.loads(chunks[0][1]);binary=chunks[1][1];assert len(j['buffers'])==1 and 'uri' not in j['buffers'][0];assert 0<=len(binary)-j['buffers'][0]['byteLength']<=3
 for v in j['bufferViews']:assert v['buffer']==0 and v.get('byteOffset',0)+v['byteLength']<=j['buffers'][0]['byteLength']
 fmt={5120:'b',5121:'B',5122:'h',5123:'H',5125:'I',5126:'f'};dims={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16};values=[];nonfinite=0
 for a in j['accessors']:
  assert 'sparse' not in a;v=j['bufferViews'][a['bufferView']];f='<'+fmt[a['componentType']]*dims[a['type']];sz=struct.calcsize(f);stride=v.get('byteStride',sz);start=v.get('byteOffset',0)+a.get('byteOffset',0)
  assert a.get('byteOffset',0)+(a['count']-1)*stride+sz<=v['byteLength'];vs=[struct.unpack_from(f,binary,start+i*stride) for i in range(a['count'])];nonfinite+=sum(not math.isfinite(x) for row in vs for x in row);values.append(vs)
 tris=[];degenerate=0;small=0;badindex=0;normal_bad=0;duplicates=[]
 for mi,m in enumerate(j['meshes']):
  mt=0
  for p in m['primitives']:
   assert p.get('mode',4)==4;pos=values[p['attributes']['POSITION']];idx=[r[0] for r in values[p['indices']]] if 'indices'in p else list(range(len(pos)));assert len(idx)%3==0;mt+=len(idx)//3
   assert 0<=p['material']<len(j['materials']);badindex+=sum(i<0 or i>=len(pos) for i in idx)
   for name,ai in p['attributes'].items():assert len(values[ai])==len(pos)
   if 'NORMAL' in p['attributes']:
    normal_bad+=sum(abs(math.sqrt(sum(x*x for x in v))-1)>1e-3 for v in values[p['attributes']['NORMAL']])
   seen_position=set();seen_index=set();dp=0;di=0
   for i in range(0,len(idx),3):
    key=tuple(sorted(pos[x] for x in idx[i:i+3]));dp+=key in seen_position;seen_position.add(key)
    ik=tuple(idx[i:i+3]);di+=ik in seen_index;seen_index.add(ik)
    a,c,d=[pos[x] for x in idx[i:i+3]];u=[c[k]-a[k] for k in range(3)];v=[d[k]-a[k] for k in range(3)];cross=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];area2=sum(x*x for x in cross)
    degenerate+=area2==0;small+=area2<1e-20
   if dp or di:duplicates.append({'mesh':mi,'positionDuplicateFaces':dp,'sameIndexSameOrderDuplicateFaces':di,'instances':sum(n.get('mesh')==mi for n in j['nodes'])})
  tris.append(mt)
 texrefs=[]
 def walk(v,path=''):
  if isinstance(v,dict):
   for k,x in v.items():
    if k.endswith('Texture') and isinstance(x,dict):assert 0<=x['index']<len(j['textures']);texrefs.append([path+'.'+k,x['index']])
    walk(x,path+'.'+k)
  if isinstance(v,list):
   for i,x in enumerate(v):walk(x,path+'.'+str(i))
 walk(j['materials'],'materials');imgs=[]
 for t in j['textures']:
  assert 0<=t['source']<len(j['images']);assert 'sampler' not in t or 0<=t['sampler']<len(j['samplers'])
 for im in j['images']:
  assert 'uri' not in im and im['mimeType']=='image/png';v=j['bufferViews'][im['bufferView']];p=binary[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']];assert p[:8]==b'\x89PNG\r\n\x1a\n';po=8;data=b'';types=[]
  while po<len(p):
   n=struct.unpack_from('>I',p,po)[0];t=p[po+4:po+8];d=p[po+8:po+8+n];crc=struct.unpack_from('>I',p,po+8+n)[0];assert zlib.crc32(t+d)&0xffffffff==crc;po+=12+n;types.append(t.decode())
   if t==b'IHDR':w,h,depth,col,*_=struct.unpack('>IIBBBBB',d)
   if t==b'IDAT':data+=d
  assert types[-1]=='IEND';raw=zlib.decompress(data);channels={0:1,2:3,4:2,6:4}[col];assert depth==8 and len(raw)==h*(1+w*channels)
  imgs.append({'sha256':hashlib.sha256(p).hexdigest(),'dimensions':[w,h],'pngCRCAndInflate':'passed'})
 for n in j['nodes']:
  for k in ['translation','rotation','scale','matrix']:
   assert all(math.isfinite(x) for x in n.get(k,[]))
  assert all(0<=i<len(j['nodes']) for i in n.get('children',[]))
  if 'scale'in n:assert all(x!=0 for x in n['scale'])
 roots=j['scenes'][j.get('scene',0)]['nodes'];reachable=[]
 def visit(i,anc):
  assert i not in anc;reachable.append(i)
  for c in j['nodes'][i].get('children',[]):visit(c,anc+[i])
 for r in roots:visit(r,[])
 assert len(reachable)==len(set(reachable))
 mesh_nodes=[j['nodes'][i] for i in reachable if 'mesh'in j['nodes'][i]]
 r={'path':rel,'sha256':hashlib.sha256(b).hexdigest(),'bytes':len(b),'embeddedIntegrity':'passed','uniqueMeshes':len(j['meshes']),'renderMeshInstances':len(mesh_nodes),'draws':sum(len(j['meshes'][n['mesh']]['primitives']) for n in mesh_nodes),'uniqueTriangles':sum(tris),'renderedTriangles':sum(tris[n['mesh']] for n in mesh_nodes),'nonFiniteAccessorValues':nonfinite,'outOfRangeIndices':badindex,'exactDegenerateTriangles':degenerate,'crossSquaredBelow1e-20':small,'nonUnitNormalsOver1e-3':normal_bad,'duplicateFaces':duplicates,'renderedPositionDuplicateFaces':sum(d['positionDuplicateFaces']*d['instances'] for d in duplicates),'materials':len(j['materials']),'textures':len(j['textures']),'images':imgs,'textureReferences':texrefs,'nodeNames':[n.get('name') for n in j['nodes']],'glbContainsExtras':any('extras'in n for n in j['nodes']),'warnings':warnings}
 reports.append(r)
(OUT/'geometry-audit.json').write_text(json.dumps(reports,indent=2));print(json.dumps([{k:v for k,v in r.items() if k not in ['images','textureReferences','nodeNames']} for r in reports],indent=2))
