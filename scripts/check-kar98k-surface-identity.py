"""Confirm that surface work did not change the established geometry or UV layout."""
from pathlib import Path
import json,struct,hashlib

def meshes(path):
 b=Path(path).read_bytes();n=struct.unpack_from('<I',b,12)[0];j=json.loads(b[20:20+n]);start=28+n;out={}
 def data(ai):
  a=j['accessors'][ai];v=j['bufferViews'][a['bufferView']];unit={5121:1,5123:2,5125:4,5126:4}[a['componentType']]*{'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[a['type']];offset=start+v.get('byteOffset',0)+a.get('byteOffset',0);stride=v.get('byteStride',unit);return b''.join(b[offset+i*stride:offset+i*stride+unit] for i in range(a['count']))
 for node in j['nodes']:
  if 'mesh' not in node:continue
  for i,p in enumerate(j['meshes'][node['mesh']]['primitives']):
   out[node['name']+str(i)]={k:hashlib.sha256(data(a)).hexdigest() for k,a in list(p['attributes'].items())+[('indices',p['indices'])] if k in ['POSITION','NORMAL','TEXCOORD_0','indices']}
 return out
before=meshes('.runtime/surface-before.glb');after=meshes('assets/kar98k-wip/kar98k-exterior-wip.glb');assert before==after
Path('evidence/kar98k-wip/surface-2026-10-23/geometry-identity.json').write_text(json.dumps({'status':'passed','baseline':'7f1aeab','meshPrimitives':len(after),'checks':['Positions byte-identical','Normals byte-identical','UV layout byte-identical','Triangle indices byte-identical'],'scope':'Surface textures changed; no new geometry or historical structure claimed'},indent=2)+'\n');print('PASS established geometry and UV arrays unchanged')
