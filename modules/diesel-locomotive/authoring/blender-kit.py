"""Actual MCP authoring: closed exterior game-art prototypes, arbitrary art units."""
import bpy
import bmesh
import math
import json
from mathutils import Vector
BASE='/workspace/scratch/6a4c729be230/PGF/modules/diesel-locomotive/assets/blender'
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
def v(p): return (p[0],-p[2],p[1])
def mat(name,c,metal):
 m=bpy.data.materials.new(name);m.use_nodes=True;m.diffuse_color=(*c,1)
 bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*c,1);bs.inputs['Metallic'].default_value=metal;bs.inputs['Roughness'].default_value=.64
 return m
paint=mat('paint',(.24,.265,.28),.25)
steel=mat('steel',(.19,.21,.23),.8)
def finish(o,name,material,bevel,segments):
 o.name=name;o.data.materials.append(material);bpy.context.view_layer.objects.active=o
 if bevel:
  mod=o.modifiers.new('Exterior edge bevel','BEVEL');mod.width=bevel;mod.segments=segments;bpy.ops.object.modifier_apply(modifier=mod.name)
 bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free()
 uv=o.data.uv_layers.new(name='UVMap')
 for poly in o.data.polygons:
  axis=0
  if abs(poly.normal[1])>abs(poly.normal[axis]):axis=1
  if abs(poly.normal[2])>abs(poly.normal[axis]):axis=2
  a,b=[k for k in range(3) if k!=axis]
  for li in poly.loop_indices:
   co=o.data.vertices[o.data.loops[li].vertex_index].co;uv.data[li].uv=(co[a]*.5+.5,co[b]*.5+.5)
 o['source']='Actual Blender MCP exterior art prototype';o['nonfunctional']=True
 return o
def mesh(name,vertices,faces,material,bevel=0,segments=1):
 data=bpy.data.meshes.new(name+'-geometry');data.from_pydata([v(p) for p in vertices],[],faces);data.update();o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o)
 return finish(o,name,material,bevel,segments)
def profile(name,points,depth,bevel,segments):
 n=len(points);vertices=[(x,y,z) for z in [-depth/2,depth/2] for x,y in points]
 faces=[tuple(range(n-1,-1,-1)),tuple(range(n,n*2))]
 for i in range(n):
  j=(i+1)%n;faces.append((i,j,j+n,i+n))
 return mesh(name,vertices,faces,paint,bevel,segments)

def cab(name,segments):
 # Angular full-width cabin with raised brow and tapered shoulder roof.
 sections=[(-1.2,[(-1.26,-1.45),(1.26,-1.45),(1.26,.65),(.95,1.15),(-.95,1.15),(-1.26,.65)]),(1.2,[(-1.26,-1.45),(1.26,-1.45),(1.26,.85),(.96,1.15),(-.96,1.15),(-1.26,.85)])]
 vertices=[(x,y,z) for x,cross in sections for z,y in cross];n=6
 faces=[tuple(range(n-1,-1,-1)),tuple(range(n,n*2))]
 for i in range(n):j=(i+1)%n;faces.append((i,j,j+n,i+n))
 return mesh(name,vertices,faces,paint,.035,segments)
def nose(name,segments):
 # Sloping shoulder short nose; front-to-back profile deliberately distinct from cab.
 sections=[(-.95,1.0),(.95,1.0)]
 cross=[(-.98,-.75),(.98,-.75),(.98,.46),(.68,.78),(-.68,.78),(-.98,.46)]
 vertices=[(x,y-(.10 if x<0 and y>.4 else 0),z) for x,s in sections for z,y in cross];n=len(cross)
 faces=[tuple(range(n-1,-1,-1)),tuple(range(n,n*2))]
 for i in range(n):j=(i+1)%n;faces.append((i,j,j+n,i+n))
 return mesh(name,vertices,faces,paint,.065,segments)
report=[]
for tier,n,bevelSeg in [('low',20,1),('medium',32,2),('high',48,3)]:
 bpy.ops.object.select_all(action='DESELECT');objects=[]
 objects.append(cab('angular-cab-shell',bevelSeg))
 objects.append(nose('sloped-short-nose',bevelSeg))
 objects.append(profile('three-axle-bogie-sideframe',[(-2.05,-.05),(-2.05,.3),(-1.68,.43),(-1.38,.35),(-1.02,.16),(-.55,.16),(-.26,.39),(.26,.39),(.55,.16),(1.02,.16),(1.38,.35),(1.68,.43),(2.05,.3),(2.05,-.05),(1.68,-.18),(1.34,-.37),(1.02,-.35),(.7,-.14),(.35,-.14),(.2,-.26),(-.2,-.26),(-.35,-.14),(-.7,-.14),(-1.02,-.35),(-1.34,-.37),(-1.68,-.18)],.21,.035,bevelSeg))
 objects.append(profile('curved-front-pilot',[(-.28,-.58),(-.18,-.54),(.04,-.17),(.15,.3),(.15,.61),(.04,.62),(.03,.3),(-.08,-.1),(-.33,-.49)],3.12,.028,bevelSeg))
 objects.append(profile('knuckle-coupler-exterior',[(-.47,-.18),(-.47,.18),(.14,.18),(.14,.3),(.42,.3),(.47,.12),(.3,.05),(.34,-.13),(.45,-.19),(.34,-.3),(.05,-.3),(.03,-.18)],.32,.035,bevelSeg))
 for o in objects:o.select_set(True)
 path=BASE+'/diesel-exterior-kit-'+tier+'.glb'
 bpy.ops.export_scene.gltf(filepath=path,export_format='GLB',use_selection=True,use_active_scene=True,export_extras=True)
 report.append({'tier':tier,'path':path,'objects':[o.name for o in objects],'vertices':sum(len(o.data.vertices) for o in objects)})
 if tier!='high':
  for o in objects:bpy.data.objects.remove(o,do_unlink=True)
bpy.ops.wm.save_as_mainfile(filepath=BASE+'/diesel-exterior-prototypes.blend',compress=True)
print('DIESEL_KIT_REPORT '+json.dumps(report))
