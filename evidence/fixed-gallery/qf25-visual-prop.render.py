import bpy, json
from mathutils import Vector
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath='/workspace/dot-ww2-assets/public/models/qf25-visual-prop.glb')
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
camera.data.ortho_scale=max(width,height*1.6)*1.18
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
scene.render.filepath='/workspace/dot-ww2-assets/gallery/renders/qf25-visual-prop.png'
bpy.ops.render.render(write_still=True)
print(json.dumps({'assetId':'qf25-visual-prop','meshes':len(meshes),'camera':'orthographic fitted projected bounds','samples':48,'source':'existing fixed downloadable GLB','resolution':[1280,800]}))
