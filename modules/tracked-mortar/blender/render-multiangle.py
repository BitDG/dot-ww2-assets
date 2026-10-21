import bpy, json, math
from mathutils import Vector
BASE='/workspace/scratch/6a4c729be230/PGF/modules/tracked-mortar/blender/'
bpy.ops.wm.open_mainfile(filepath=BASE+'portable-kit.blend')
scene=bpy.context.scene;scene.cycles.use_denoising=False;scene.cycles.samples=20
scene.render.resolution_x=1100;scene.render.resolution_y=700
camera=scene.camera;camera.data.ortho_scale=12.4
for name,location,target in [('side',(18,0,2.3),(0,0,2.3)),('front',(0,-18,2.35),(0,0,2.35)),('top',(0,0,18),(0,0,0))]:
 camera.location=location;camera.rotation_euler=(Vector(target)-camera.location).to_track_quat('-Z','Y').to_euler()
 if name=='top':camera.rotation_euler.z=math.pi/2
 if name=='front':camera.data.ortho_scale=7.8
 else:camera.data.ortho_scale=12.4
 scene.render.filepath=BASE+'evidence/portable-pbr-'+name+'.png'
 bpy.ops.render.render(write_still=True)
print('MCP_MULTIANGLE_RENDERED')
