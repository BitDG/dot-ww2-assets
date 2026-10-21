import bpy, math, json
from mathutils import Vector
BASE='/workspace/scratch/6a4c729be230/PGF/modules/tracked-mortar/blender/'
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=BASE+'evidence/pgf-reference.glb')
models=[o for o in bpy.context.scene.objects if o.type=='MESH']
assert len(models)==21
assert all(math.isfinite(v) for o in models for vertex in o.data.vertices for v in vertex.co)
for name in ['chassis','running-gear','engine','platform','carriage','cradle','barrel','mechanisms']:assert bpy.data.objects.get('mortar-'+name) is not None
texcounts={}
for o in models:
 for m in o.data.materials:
  if m:texcounts[m.name]=len([n for n in m.node_tree.nodes if n.type=='TEX_IMAGE' and n.image])
assert len(texcounts)==6 and all(n==3 for n in texcounts.values())
degenerate=0;triangles=0
for o in models:
 o.data.calc_loop_triangles()
 for tri in o.data.loop_triangles:
  a,b,c=[o.data.vertices[i].co for i in tri.vertices];triangles+=1
  if (b-a).cross(c-a).length_squared<1e-20:degenerate+=1
assert degenerate==0
scene=bpy.context.scene
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,.02));floor=bpy.context.object;floor.name='STUDIO-floor';mat=bpy.data.materials.new('STUDIO-neutral-floor');mat.use_nodes=True;bs=mat.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(.29,.31,.34,1);bs.inputs['Roughness'].default_value=.9;floor.data.materials.append(mat)
bpy.ops.object.camera_add(location=(13,-16,9));camera=bpy.context.object;camera.name='STUDIO-camera';camera.rotation_euler=(Vector((0,0,2.3))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=13.4;scene.camera=camera
for loc,energy,size in [((3,-5,12),2000,8),((-8,-1,7),1400,7),((1,8,9),1800,6)]:
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.name='STUDIO-light';o.data.energy=energy;o.data.shape='DISK';o.data.size=size;o.rotation_euler=(Vector((0,0,1))-o.location).to_track_quat('-Z','Y').to_euler()
scene.world.color=(.3,.3,.3);scene.render.engine='CYCLES';scene.cycles.samples=48;scene.cycles.use_denoising=False;scene.view_settings.view_transform='AgX';scene.render.resolution_x=1000;scene.render.resolution_y=680;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.render.filepath=BASE+'evidence/pgf-tank-glb-reimport-hero.png'
bpy.ops.wm.save_as_mainfile(filepath=BASE+'pgf-tank-reimport-verified.blend')
bpy.ops.render.render(write_still=True)
print('PGF_FINAL_GLB_REIMPORT='+json.dumps({'status':'passed','file':'pgf-reference.glb','actualPGFRuntimeExport':True,'materialRevision':'PGF tank PBR','triangles':triangles,'degenerateTriangles':degenerate,'meshes':len(models),'materialTextureNodeCounts':texcounts,'renderer':'Cycles','samples':48,'denoised':False,'artworkOnly':True}))
