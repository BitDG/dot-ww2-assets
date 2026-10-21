import bpy
import math
import json
from mathutils import Vector
BASE='/workspace/scratch/6a4c729be230/PGF/modules/diesel-locomotive'
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=BASE+'/evidence/D2-diesel-medium.glb')
scene=bpy.context.scene
meshes=[o for o in scene.objects if o.type=='MESH']
points=[o.matrix_world@Vector(c) for o in meshes for c in o.bound_box]
lo=Vector([min(p[k] for p in points) for k in range(3)]);hi=Vector([max(p[k] for p in points) for k in range(3)]);target=(lo+hi)/2
print('RUNTIME_REIMPORT '+json.dumps({'meshes':len(meshes),'bounds':[list(lo),list(hi)],'triangles':sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in meshes),'nonFinite':sum(not all(math.isfinite(c) for c in ve.co) for o in meshes for ve in o.data.vertices)}))
def aim(o,t):o.rotation_euler=(t-o.location).to_track_quat('-Z','Y').to_euler()
mat=bpy.data.materials.new('STUDIO');mat.use_nodes=True;bs=mat.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(.77,.79,.8,1);bs.inputs['Roughness'].default_value=.9
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.018));bpy.context.object.data.materials.append(mat)
for location,power,size in [((-9,-12,18),5500,12),((9,5,14),4200,10),((-10,10,8),3200,8)]:
 bpy.ops.object.light_add(type='AREA',location=location);o=bpy.context.object;o.data.energy=power;o.data.shape='DISK';o.data.size=size;aim(o,target)
scene.world.color=(.5,.5,.5);scene.render.engine='CYCLES';scene.cycles.samples=20;scene.render.threads_mode='FIXED';scene.render.threads=4;scene.cycles.use_denoising=False;scene.view_settings.view_transform='AgX';scene.render.image_settings.file_format='PNG'
bpy.ops.object.camera_add();cam=bpy.context.object;cam.data.type='ORTHO';scene.camera=cam
for name,offset,res in [('hero',(-22,-29,17),(1500,850))]:
 cam.location=target+Vector(offset);aim(cam,target);bpy.context.view_layer.update();inv=cam.matrix_world.inverted();local=[inv@p for p in points];width=max(p.x for p in local)-min(p.x for p in local);height=max(p.y for p in local)-min(p.y for p in local);cam.data.ortho_scale=max(width,height*res[0]/res[1])*1.12
 scene.render.resolution_x=res[0];scene.render.resolution_y=res[1];scene.render.resolution_percentage=100;scene.render.filepath=BASE+'/evidence/D2-'+name+'.png';print('CAMERA_RECEIPT '+json.dumps({'modelSha256':'42dbeaca80bff66cfdf009c9eb8210c43042151a49d5d6f12693c07d0b702852','view':name,'type':cam.data.type,'location':list(cam.location),'rotationEuler':list(cam.rotation_euler),'orthoScale':cam.data.ortho_scale,'target':list(target),'resolution':res}));bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=BASE+'/assets/blender/diesel-pgf-D2-reviewed-scene.blend',compress=True)
print('DIESEL_G2_RENDER PASS')
