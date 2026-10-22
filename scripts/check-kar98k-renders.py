"""Check current MCP render receipts against the fixed GLB and generate a local review sheet."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageStat
import json,hashlib,sys
base=Path('assets/kar98k-wip');evidence=Path(sys.argv[1]);sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert sha(base/'kar98k-exterior-wip.glb')==json.loads((evidence/'default-glb.json').read_text())['sha256']
for name in ['kar98k-exterior-wip','render-kar98k-wip','render-kar98k-views','render-kar98k-details']:
 r=json.loads((evidence/(name+'.json')).read_text());assert r['status']=='passed' and r['portClosed'] and r['blenderExitCode']==0
r=json.loads((evidence/'render-kar98k-views.json').read_text());lines=r['toolResult']['content'][0]['text'].splitlines();top=next(json.loads(l) for l in lines if l.startswith('{') and '"view": "top"' in l);assert top['direction']==[0,0,1] and top['orthographic']
names=['hero','side','front','top','detail-stock','detail-handguard','detail-metal','detail-band','detail-butt','detail-sling'];rows=[];sheet=Image.new('RGB',(1200,1275),'#20252b');d=ImageDraw.Draw(sheet)
for i,n in enumerate(names):
 p=base/(n+'.png');im=Image.open(p).convert('RGB');assert max(ImageStat.Stat(im).stddev)>5;rows.append({'view':n,'file':str(p),'sha256':sha(p),'size':im.size});im.thumbnail((600,225));x=i%2*600;y=i//2*255;sheet.paste(im,(x+(600-im.width)//2,y));d.text((x+8,y+233),n,fill='white')
report={'status':'passed','sourceGLBSHA256':sha(base/'kar98k-exterior-wip.glb'),'topView':top,'renders':rows,'scope':'Actual fixed model renders; not original photographs'}
(evidence/'render-manifest.json').write_text(json.dumps(report,indent=2)+'\n');Path('evidence/kar98k-wip/render-manifest.json').write_text(json.dumps(report,indent=2)+'\n');sheet.save('.runtime/kar98k-current-review.png');print('PASS ten actual renders and strict orthographic top view')
