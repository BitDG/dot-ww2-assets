"""Validate the exact GLB/render pairs and assemble their real-render contact sheet."""
import json,hashlib,pathlib
from PIL import Image,ImageDraw,ImageFont,ImageStat
root=pathlib.Path(__file__).resolve().parent.parent
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
models=json.loads((root/'evidence/model-validation.json').read_text())['models'];out={}
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',19)
small=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',15)
atlas=Image.new('RGB',(2160,2100),'#151b24');d=ImageDraw.Draw(atlas)
d.text((24,20),'DOT / 11 EXISTING ASSETS / FIXED GLB RENDERS',font=font,fill='white')
d.text((24,52),'Blender 4.3.2 via MCP | Independent framing per asset | Static exports | No Kar98k model',font=small,fill='#bac4d0')
for i,m in enumerate(models):
 r=json.loads((root/f'evidence/fixed-gallery/{m["id"]}.json').read_text())
 assert r['status']=='passed' and r['portClosed'] and r['blenderExitCode']==0
 assert sha(root/r['sourceFile'])==r['sourceSHA256']==m['sha256']
 assert sha(root/r['render'])==r['renderSHA256']
 report=json.loads(r['toolResult']['content'][0]['text'].strip().splitlines()[-1])
 assert report['meshes']==m['independent']['meshes']
 im=Image.open(root/r['render']).convert('RGB');assert im.size==(1280,800) and max(ImageStat.Stat(im).stddev)>5
 x=(i%3)*720;y=100+(i//3)*500;atlas.paste(im.resize((720,450)),(x,y))
 d.text((x+12,y+453),m['id'],font=small,fill='white')
 d.text((x+12,y+475),f'{m["independent"]["triangles"]:,} triangles | SHA256 {m["sha256"][:16]}',font=small,fill='#bac4d0')
 out[m['id']]={'sha256':m['sha256'],'triangles':m['independent']['triangles'],'meshes':report['meshes'],'renderSHA256':r['renderSHA256'],'animationClips':m['independent']['animationClips']}
assert len(out)==11 and len({v['renderSHA256'] for v in out.values()})==11
atlas.save(root/'gallery/fixed-glb-atlas.png')
(root/'gallery/fixed-assets.json').write_text(json.dumps(out,indent=2)+'\n')
(root/'evidence/fixed-atlas-validation.json').write_text(json.dumps({'status':'passed','pairs':11,'atlasSHA256':sha(root/'gallery/fixed-glb-atlas.png'),'checks':['fixed GLB hashes unchanged','MCP render hashes match','independent mesh counts match','images nonblank and unique','MCP ports closed']},indent=2)+'\n')
print('PASS 11 fixed GLB / MCP render pairs')
