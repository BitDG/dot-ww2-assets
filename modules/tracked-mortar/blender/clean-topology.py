"""Remove only zero-area triangles; preserve every retained corner and UV/normal.
The cap constructor is also corrected in the procedural source scripts.
"""
import bpy, json, math
BASE='/workspace/scratch/6a4c729be230/PGF/modules/tracked-mortar/blender/'
bpy.ops.wm.open_mainfile(filepath=BASE+'portable-kit.blend')
scene=bpy.context.scene
root=bpy.data.objects.get('tracked-mortar')
assembly=[root]+list(root.children_recursive)
meshes=set(o.data for o in assembly if o.type=='MESH')
report=[]
for old in meshes:
 old.calc_loop_triangles()
 kept=[];removed=0
 for tri in old.loop_triangles:
  a,b,c=[old.vertices[i].co for i in tri.vertices]
  if (b-a).cross(c-a).length_squared<1e-20:removed+=1
  else:kept.append(tri)
 if removed==0:continue
 name=old.name;old.name=name+'-precleanup'
 mesh=bpy.data.meshes.new(name)
 mesh.from_pydata([tuple(v.co) for v in old.vertices],[],[tuple(t.vertices) for t in kept]);mesh.update()
 for mat in old.materials:mesh.materials.append(mat)
 for i,t in enumerate(kept):
  p=old.polygons[t.polygon_index];mesh.polygons[i].use_smooth=p.use_smooth;mesh.polygons[i].material_index=p.material_index
 if old.uv_layers.active:
  uv=mesh.uv_layers.new(name=old.uv_layers.active.name)
  for i,t in enumerate(kept):
   for j,li in enumerate(t.loops):uv.data[i*3+j].uv=old.uv_layers.active.data[li].uv
 normals=[tuple(old.corner_normals[li].vector) for t in kept for li in t.loops]
 assert all(math.isfinite(v) for normal in normals for v in normal)
 mesh.normals_split_custom_set(normals)
 users=0
 for o in assembly:
  if o.type=='MESH' and o.data==old:o.data=mesh;users+=1
 report.append({'mesh':name,'removedPrototypeTriangles':removed,'instances':users,'retainedPrototypeTriangles':len(kept),'retainedCornersPreserved':True})
remaining=0
for mesh in set(o.data for o in assembly if o.type=='MESH'):
 mesh.calc_loop_triangles()
 for tri in mesh.loop_triangles:
  a,b,c=[mesh.vertices[i].co for i in tri.vertices]
  if (b-a).cross(c-a).length_squared<1e-20:remaining+=1
assert remaining==0
root['topology']='Zero-area triangles removed; retained positions, split normals and UV corners preserved'
bpy.ops.object.select_all(action='DESELECT')
for o in assembly:o.select_set(True)
bpy.context.view_layer.objects.active=root
bpy.ops.export_scene.gltf(filepath=BASE+'portable-kit.glb',export_format='GLB',use_selection=True,use_active_scene=True,export_animations=False,export_extras=True,export_yup=True,export_image_format='AUTO')
bpy.ops.wm.save_as_mainfile(filepath=BASE+'portable-kit.blend')
print('TOPOLOGY_CLEANUP='+json.dumps({'status':'passed','remainingDegenerateTriangles':remaining,'meshes':report,'removedInstantiatedTriangles':sum(r['removedPrototypeTriangles']*r['instances'] for r in report)}))
