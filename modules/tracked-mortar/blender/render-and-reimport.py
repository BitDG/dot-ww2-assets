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

import bpy, math, json
from mathutils import Vector
BASE='/workspace/scratch/6a4c729be230/PGF/modules/tracked-mortar/blender/'
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
for m in list(bpy.data.meshes):
 if m.users==0:bpy.data.meshes.remove(m)
for m in list(bpy.data.materials):
 if m.users==0:bpy.data.materials.remove(m)
for im in list(bpy.data.images):
 if im.users==0 and im.name not in ['Render Result','Viewer Node']:bpy.data.images.remove(im)
bpy.ops.import_scene.gltf(filepath=BASE+'portable-kit.glb')
objects=list(bpy.context.scene.objects);meshes=[o for o in objects if o.type=='MESH']
assert len(meshes)>500
assert not any(o.name.startswith('STUDIO-') for o in objects)
assert all(math.isfinite(v) for o in meshes for vertex in o.data.vertices for v in vertex.co)
for name in ['chassis','running-gear','engine','platform','carriage','cradle','barrel','mechanisms']:
 assert any(o.name=='mortar-'+name for o in objects)
assert sum(o.name.startswith('road-wheel-') for o in meshes)==22
material_counts={}
for o in meshes:
 assert len(o.data.uv_layers)>0
 for m in o.data.materials:
  if m:material_counts[m.name]=len([n for n in m.node_tree.nodes if n.type=='TEX_IMAGE' and n.image])
assert len(material_counts)==6 and all(n>=3 for n in material_counts.values())
corners=[o.matrix_world@Vector(c) for o in meshes for c in o.bound_box]
bounds=[[min(v[i] for v in corners),max(v[i] for v in corners)] for i in range(3)]
report={'status':'passed','objects':len(objects),'meshes':len(meshes),'sharedMeshDatablocks':len(set(o.data for o in meshes)),'roadWheels':22,'finiteCoordinates':True,'studioExcluded':True,'blenderBoundsXYZ':bounds,'coordinateMapping':'Blender (X,Y,Z) -> PGF (X,Z,-Y)','materialTextureNodeCounts':material_counts,'materials':len(set(m.name for o in meshes for m in o.data.materials if m)),'packedTextureImages':len([im for im in bpy.data.images if im.packed_file]),'note':'This checks the Blender exterior kit. Portable PBR textures are in this Blender GLB. Final PGF collider and sockets require separate runtime roundtrip tests.'}
bpy.ops.wm.save_as_mainfile(filepath=BASE+'reimport-verified.blend')
print('TRACKED_MORTAR_REIMPORT_REPORT='+json.dumps(report))
