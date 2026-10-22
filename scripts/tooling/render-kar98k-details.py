import bpy, json
from mathutils import Vector
bpy.ops.wm.open_mainfile(filepath='/workspace/dot-ww2-assets/assets/kar98k-wip/kar98k-exterior-wip.blend')
assert all(i.packed_file for i in bpy.data.images if i.source=='FILE' and i.users)
assert sum(o.type=='MESH' for o in bpy.context.scene.objects)>11
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath='/workspace/dot-ww2-assets/assets/kar98k-wip/kar98k-exterior-wip.glb')
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
points=[o.matrix_world@Vector(c) for o in meshes for c in o.bound_box]
low=Vector([min(p[i] for p in points) for i in range(3)])
high=Vector([max(p[i] for p in points) for i in range(3)])
center=(low+high)/2
size=max(high-low)
scene=bpy.context.scene
scene.render.engine='CYCLES'
scene.cycles.samples=24
scene.cycles.use_denoising=False
scene.render.resolution_x=960
scene.render.resolution_y=540
scene.render.resolution_percentage=100
scene.world.color=(.08,.08,.08)
bpy.ops.object.camera_add(location=center+Vector((.6,-3,1.5))*size)
camera=bpy.context.object
camera.rotation_euler=(center-camera.location).to_track_quat('-Z','Y').to_euler()
camera.data.type='ORTHO'
scene.camera=camera
bpy.context.view_layer.update()
local=[camera.matrix_world.inverted()@p for p in points]
width=max(p.x for p in local)-min(p.x for p in local)
height=max(p.y for p in local)-min(p.y for p in local)
camera.data.ortho_scale=max(2*max(abs(p.x) for p in local),2*max(abs(p.y) for p in local)*(1600/900))*1.18
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

for label, direction, part in [('detail-stock', (0.25, -1, 0.3), 'stock_shell'), ('detail-handguard', (0.25, -1, 0.7), 'upper_wood_cover'), ('detail-metal', (0.25, -1, 0.7), 'closed_upper_metal_shell'), ('detail-band', (0.5, -1, 0.4), 'decorative_band'), ('detail-butt', (-1, -0.5, 0.2), 'butt_cap'), ('detail-sling', (0.15, -1, 0.3), 'sling_visual')]:
 focus=meshes if part is None else [o for o in meshes if o.name==part]
 assert focus,part
 pts=[o.matrix_world@Vector(c) for o in focus for c in o.bound_box]
 lo=Vector([min(p[i] for p in pts) for i in range(3)]);hi=Vector([max(p[i] for p in pts) for i in range(3)]);target=(lo+hi)/2
 direction=Vector(direction).normalized();camera.location=target+direction*size*4
 camera.rotation_euler=(-direction).to_track_quat('-Z','Y').to_euler();bpy.context.view_layer.update()
 local=[camera.matrix_world.inverted()@p for p in pts]
 camera.data.ortho_scale=max(2*max(abs(p.x) for p in local),2*max(abs(p.y) for p in local)*(960/540))*1.2
 if label=='top':assert abs(direction.dot(Vector((0,0,1)))-1)<1e-12
 scene.render.filepath='/workspace/dot-ww2-assets/assets/kar98k-wip/'+label+'.png'
 bpy.ops.render.render(write_still=True)
 print(json.dumps({'view':label,'direction':list(direction),'orthographic':True,'focus':part,'source':'same fixed GLB; actual model render','resolution':[960,540]}))
