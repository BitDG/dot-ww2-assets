import bpy
import math
import json
from mathutils import Vector
BASE='/workspace/scratch/6a4c729be230/PGF/modules/diesel-locomotive'
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=BASE+'/evidence/diesel-medium.glb')
scene=bpy.context.scene
meshes=[o for o in scene.objects if o.type=='MESH']
points=[o.matrix_world@Vector(c) for o in meshes for c in o.bound_box]
lo=Vector([min(p[k] for p in points) for k in range(3)]);hi=Vector([max(p[k] for p in points) for k in range(3)]);target=(lo+hi)/2
print('RUNTIME_REIMPORT '+json.dumps({'modelSha256':'15242297c0b85bff185a02b58873914fa00f2ef4c7bec07a25f6a05a9a69165c','meshes':len(meshes),'bounds':[list(lo),list(hi)],'triangles':sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in meshes),'nonFinite':sum(not all(math.isfinite(c) for c in ve.co) for o in meshes for ve in o.data.vertices)}))
def aim(o,t):o.rotation_euler=(t-o.location).to_track_quat('-Z','Y').to_euler()
mat=bpy.data.materials.new('STUDIO');mat.use_nodes=True;bs=mat.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(.77,.79,.8,1);bs.inputs['Roughness'].default_value=.9
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.018));bpy.context.object.data.materials.append(mat)
for location,power,size in [((-9,-12,18),5500,12),((9,5,14),4200,10),((-10,10,8),3200,8),((-15,-8,5),950,7)]:
 bpy.ops.object.light_add(type='AREA',location=location);o=bpy.context.object;o.data.energy=power;o.data.shape='DISK';o.data.size=size;aim(o,target)
scene.world.color=(.5,.5,.5);scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=False;scene.cycles.max_bounces=4;scene.cycles.diffuse_bounces=2;scene.cycles.glossy_bounces=2;scene.render.threads_mode='FIXED';scene.render.threads=4;scene.view_settings.view_transform='AgX';scene.render.image_settings.file_format='PNG'
bpy.ops.object.camera_add();cam=bpy.context.object;cam.data.type='ORTHO';scene.camera=cam
target=Vector([-5.7,0,2.55])
name='cab-detail'
cam.location=target+Vector([-8,-13,7]);aim(cam,target);bpy.context.view_layer.update()
res=[1200,900]
cam.data.ortho_scale=11.6
scene.render.resolution_x=res[0];scene.render.resolution_y=res[1];scene.render.resolution_percentage=100;scene.render.filepath=BASE+'/evidence/D5-cab-detail.png'
print('CAMERA_RECEIPT '+json.dumps({'modelSha256':'15242297c0b85bff185a02b58873914fa00f2ef4c7bec07a25f6a05a9a69165c','view':name,'type':cam.data.type,'location':list(cam.location),'rotationEuler':list(cam.rotation_euler),'direction':list(cam.matrix_world.to_quaternion()@Vector((0,0,-1))),'orthoScale':cam.data.ortho_scale,'target':list(target),'resolution':res,'samples':scene.cycles.samples,'threads':scene.render.threads,'denoise':scene.cycles.use_denoising}))
bpy.ops.render.render(write_still=True)
print('DIESEL_D5_CAB-DETAIL PASS')
