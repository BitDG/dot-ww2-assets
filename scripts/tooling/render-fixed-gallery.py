"""Render existing downloadable GLBs via real MCP; no new modeling and no concept images."""
import asyncio,os,sys,pathlib,subprocess,time,json,hashlib,socket
from datetime import timedelta
from mcp import ClientSession,StdioServerParameters
from mcp.client.stdio import stdio_client
root=pathlib.Path(__file__).resolve().parents[2];runtime=root/'.runtime/blender-mcp-2.1.9';out=root/'evidence/fixed-gallery';out.mkdir(parents=True,exist_ok=True);renders=root/'gallery/renders';renders.mkdir(exist_ok=True)
env=os.environ.copy();env.update(PYTHONPATH=str(runtime/'package'),BLENDER_HOST='127.0.0.1',BLENDER_PORT='19876',BLENDER_MCP_SAFE_MODE='1',BLENDER_MCP_DISABLE_TELEMETRY='1',DISABLE_TELEMETRY='1',MCP_DISABLE_TELEMETRY='1')
rows=json.loads((root/'evidence/model-validation.json').read_text())['models'];chosen=sys.argv[1:];rows=[r for r in rows if not chosen or r['id'] in chosen]
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
for row in rows:
 ident=row['id'];src=root/'public/models'/f'{ident}.glb';target=renders/f'{ident}.png';assert sha(src)==row['sha256']
 code='''import bpy, json
from mathutils import Vector
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=SOURCE)
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
points=[o.matrix_world@Vector(c) for o in meshes for c in o.bound_box]
low=Vector([min(p[i] for p in points) for i in range(3)])
high=Vector([max(p[i] for p in points) for i in range(3)])
center=(low+high)/2
size=max(high-low)
scene=bpy.context.scene
scene.render.engine='CYCLES'
scene.cycles.samples=48
scene.cycles.use_denoising=False
scene.render.resolution_x=1280
scene.render.resolution_y=800
scene.render.resolution_percentage=100
scene.world.color=(.08,.08,.08)
bpy.ops.object.camera_add(location=center+Vector((1.5,-2,1.25))*size)
camera=bpy.context.object
camera.rotation_euler=(center-camera.location).to_track_quat('-Z','Y').to_euler()
camera.data.type='ORTHO'
scene.camera=camera
bpy.context.view_layer.update()
local=[camera.matrix_world.inverted()@p for p in points]
width=max(p.x for p in local)-min(p.x for p in local)
height=max(p.y for p in local)-min(p.y for p in local)
camera.data.ortho_scale=max(2*max(abs(p.x) for p in local),2*max(abs(p.y) for p in local)*1.6)*1.18
camera.data.clip_end=max(1000,size*20)
for offset,power,scale in [((1,-1,3),350,2),((-2,-1,1),200,2),((0,2,2),300,2)]:
 bpy.ops.object.light_add(type='AREA',location=center+Vector(offset)*size)
 light=bpy.context.object
 light.data.energy=power*size*size
 light.data.shape='DISK'
 light.data.size=scale*size
 light.rotation_euler=(center-light.location).to_track_quat('-Z','Y').to_euler()
scene.render.film_transparent=False
scene.view_settings.view_transform='AgX'
scene.render.image_settings.file_format='PNG'
scene.render.filepath=TARGET
bpy.ops.render.render(write_still=True)
print(json.dumps({'assetId':IDENT,'meshes':len(meshes),'camera':'orthographic fitted projected bounds','samples':48,'source':'existing fixed downloadable GLB','resolution':[1280,800]}))
'''.replace('SOURCE',repr(str(src))).replace('TARGET',repr(str(target))).replace('IDENT',repr(ident))
 (out/f'{ident}.render.py').write_text(code)
 for n in ['ready.json','stop']:(runtime/n).unlink(missing_ok=True)
 report={'assetId':ident,'sourceSHA256':sha(src),'sourceFile':str(src.relative_to(root)),'scope':'Fixed existing GLB render via upstream MCP execute_blender_code; no source/model changes'}
 async def run():
  with (out/f'{ident}.mcp.log').open('w') as log:
   async with stdio_client(StdioServerParameters(command=sys.executable,args=['-m','blender_mcp.server'],env=env),errlog=log) as (read,write):
    async with ClientSession(read,write,read_timeout_seconds=timedelta(seconds=170)) as session:
     report['initialize']=(await session.initialize()).model_dump(mode='json')
     status=await session.call_tool('get_addon_status',{});report['addonStatus']=status.model_dump(mode='json');assert not status.isError
     result=await session.call_tool('execute_blender_code',{'code':code});report['toolResult']=result.model_dump(mode='json');text='\n'.join(c.text for c in result.content if c.type=='text');assert not result.isError and text.startswith('Code executed successfully:'),text
 with (out/f'{ident}.blender.log').open('w') as log:
  proc=subprocess.Popen(['/usr/bin/blender','-t','4','--background','--factory-startup','--python',str(root/'scripts/tooling/blender-local-bootstrap.py')],env=env,stdout=log,stderr=subprocess.STDOUT)
  try:
   for _ in range(200):
    if (runtime/'ready.json').exists():break
    if proc.poll() is not None:raise RuntimeError('Blender startup failed')
    time.sleep(.1)
   else:raise TimeoutError('Startup')
   report['runtime']=json.loads((runtime/'ready.json').read_text());assert report['runtime']['listen']==['127.0.0.1',19876] and not any(report['runtime']['integrations'].values())
   asyncio.run(asyncio.wait_for(run(),175));assert target.exists();assert sha(src)==row['sha256'];report.update(status='passed',renderSHA256=sha(target),render=str(target.relative_to(root)))
  except Exception as e:report.update(status='failed',error=repr(e));raise
  finally:
   (runtime/'stop').write_text('stop')
   try:proc.wait(timeout=15)
   except subprocess.TimeoutExpired:proc.terminate();proc.wait(timeout=10)
   report['blenderExitCode']=proc.returncode;s=socket.socket();s.settimeout(1);report['portClosed']=s.connect_ex(('127.0.0.1',19876))!=0;s.close();(out/f'{ident}.json').write_text(json.dumps(report,indent=2))
 print(ident,report['status'],flush=True)
