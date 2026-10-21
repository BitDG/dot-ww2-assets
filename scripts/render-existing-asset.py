"""Render a pre-existing exported GLB; this does not model anything or use Blender MCP."""
import bpy, math, sys, pathlib, json
from mathutils import Vector
args=sys.argv[sys.argv.index('--')+1:];src=pathlib.Path(args[0]).resolve();out=pathlib.Path(args[1]).resolve()
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(src))
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
points=[o.matrix_world@Vector(c) for o in meshes for c in o.bound_box]
low=Vector([min(p[i] for p in points) for i in range(3)]);high=Vector([max(p[i] for p in points) for i in range(3)]);center=(low+high)/2;size=max(high-low)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=64;scene.cycles.use_denoising=False
scene.render.resolution_x=1200;scene.render.resolution_y=800;scene.render.resolution_percentage=100
scene.world.color=(.08,.08,.08)
bpy.ops.object.camera_add(location=center+Vector((1.5,-2,1.25))*size);camera=bpy.context.object;camera.rotation_euler=(center-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=size*1.6;scene.camera=camera
for offset,power,scale in [((1,-1,3),350,2),((-2,-1,1),200,2),((0,2,2),300,2)]:
 bpy.ops.object.light_add(type='AREA',location=center+Vector(offset)*size);light=bpy.context.object;light.data.energy=power*size*size;light.data.shape='DISK';light.data.size=scale*size;light.rotation_euler=(center-light.location).to_track_quat('-Z','Y').to_euler()
scene.render.film_transparent=False;scene.view_settings.view_transform='AgX';scene.render.image_settings.file_format='PNG';out.parent.mkdir(parents=True,exist_ok=True);scene.render.filepath=str(out);bpy.ops.render.render(write_still=True)
print(json.dumps({'source':src.name,'render':out.name,'meshes':len(meshes),'renderer':'Blender Cycles CPU','samples':64,'operation':'Existing GLB import and render only; not MCP or new modeling'}))
