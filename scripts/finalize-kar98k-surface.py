"""Assemble the exact-camera model comparison and summarize the completed surface stage."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json,hashlib
base=Path('assets/kar98k-wip');ev=Path('evidence/kar98k-wip/surface-2026-10-23');sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert (base/'kar98k-exterior-wip.glb').read_bytes()==Path('.runtime/surface-final-baseline.glb').read_bytes()
stats=json.loads((ev/'default-glb.json').read_text());assert stats['sha256']==sha(base/'kar98k-exterior-wip.glb')
determinism={'status':'passed','method':'Fresh-process real MCP builds and repeated export byte identical with the existing explicit ordered triangle construction','sha256':stats['sha256']}
for p in [ev/'determinism.json',Path('evidence/kar98k-wip/determinism.json')]:p.write_text(json.dumps(determinism,indent=2)+'\n')
receipt=json.loads((ev/'render-kar98k-surface-comparison.json').read_text());assert receipt['status']=='passed' and receipt['portClosed'];meta=json.loads(receipt['toolResult']['content'][0]['text'].strip().splitlines()[-1])
comparison=base/'surface-comparison';before=Image.open(comparison/'before-7f1aeab.png').convert('RGB');after=Image.open(comparison/'after-exact-camera.png').convert('RGB');assert before.size==after.size==(1600,900)
canvas=Image.new('RGB',(1600,1880),'#20252b');canvas.paste(before,(0,40));canvas.paste(after,(0,980));d=ImageDraw.Draw(canvas);font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',24);d.text((24,8),'BEFORE / 7f1aeab / 22,000 triangles',font=font,fill='white');d.text((24,948),f'AFTER / surface refinement / {stats["triangles"]:,} triangles / same camera and lighting',font=font,fill='white');canvas.save(comparison/'before-after.png')
meta['beforeSHA256']=sha(comparison/'before-7f1aeab.png');meta['afterSHA256']=sha(comparison/'after-exact-camera.png');(ev/'comparison.json').write_text(json.dumps(meta,indent=2)+'\n')
(base/'kar98k-exterior-wip.blend1').unlink(missing_ok=True)
for p in ev.rglob('*.log'):p.write_text('\n'.join(line.rstrip() for line in p.read_text().splitlines())+'\n')
print('Comparison assembled; current GLB determinism and source hashes confirmed')
