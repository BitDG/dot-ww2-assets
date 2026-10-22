# Original nonfunctional visual blockout. Unitless artistic coordinates, not manufacturing dimensions.
# Run through the approved task-local MCP, not as a replacement image-generation request.
import bpy, math, json
from mathutils import Vector
ROOT='/workspace/dot-ww2-assets'
OUT=ROOT+'/assets/kar98k-wip/'
PARAMS=DOT_ART_PARAMS  # validated literal supplied by the MCP runner; no namespace introspection
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene;scene.unit_settings.system='NONE'
def material(name,color,metallic,roughness):
 m=bpy.data.materials.new(name);m.use_nodes=True;p=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Metallic'].default_value=metallic;p.inputs['Roughness'].default_value=roughness;return m,p
wood,p=material('Original longitudinal wood / exterior shell',(.22,.09,.035),0,PARAMS['woodRoughness'])
t=wood.node_tree.nodes.new('ShaderNodeTexImage');t.image=bpy.data.images.load(OUT+'textures/wood-basecolor.png');wood.node_tree.links.new(t.outputs['Color'],p.inputs['Base Color'])
t=wood.node_tree.nodes.new('ShaderNodeTexImage');t.image=bpy.data.images.load(OUT+'textures/wood-normal.png');t.image.colorspace_settings.name='Non-Color';normal=wood.node_tree.nodes.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=.35;wood.node_tree.links.new(t.outputs['Color'],normal.inputs['Color']);wood.node_tree.links.new(normal.outputs['Normal'],p.inputs['Normal'])
metal,p=material('PGF deterministic dark metal',(.08,.1,.12),.8,.4)
nodes=metal.node_tree.nodes;links=metal.node_tree.links
for key in ['base','orm','normal']:
 t=nodes.new('ShaderNodeTexImage');t.image=bpy.data.images.load(OUT+'textures/metal-'+key+'.png')
 if key=='base':links.new(t.outputs['Color'],p.inputs['Base Color'])
 elif key=='orm':
  t.image.colorspace_settings.name='Non-Color';sep=nodes.new('ShaderNodeSeparateColor');links.new(t.outputs['Color'],sep.inputs['Color']);links.new(sep.outputs['Green'],p.inputs['Roughness']);links.new(sep.outputs['Blue'],p.inputs['Metallic'])
 else:
  t.image.colorspace_settings.name='Non-Color';normal=nodes.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=.3;links.new(t.outputs['Color'],normal.inputs['Color']);links.new(normal.outputs['Normal'],p.inputs['Normal'])
leather,_=material('Brown leather / original constant PBR',(.12,.047,.019),0,.8)
def finish(o,mat,bevel=0):
 o.data.materials.append(mat);bpy.context.view_layer.objects.active=o;o.select_set(True)
 if bevel:
  mod=o.modifiers.new('Soft game-art edges','BEVEL');mod.width=bevel;mod.segments=3;bpy.ops.object.modifier_apply(modifier=mod.name)
 bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.normals_make_consistent(inside=False);bpy.ops.uv.smart_project(island_margin=.025);bpy.ops.object.mode_set(mode='OBJECT')
 if mat==wood:
  # Longitudinal projection keeps grain aligned across separate wood shells.
  uv=o.data.uv_layers.active.data
  for loop in o.data.loops:
   co=o.matrix_world@o.data.vertices[loop.vertex_index].co
   uv[loop.index].uv=((co.x+2.5)/4.0,co.z*1.1+co.y*.4+.5)
 for p in o.data.polygons:p.use_smooth=True
 o['nonfunctional_exterior']=True;o['design_status']='artistic WIP; subtype unverified';o.select_set(False);return o
def box(name,loc,scale,mat,bev=.025):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.scale=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);return finish(o,mat,bev)
def cylinder(name,a,b,r,mat):
 a,b=Vector(a),Vector(b);bpy.ops.mesh.primitive_cylinder_add(vertices=24,radius=r,depth=(b-a).length,end_fill_type='NGON',location=(a+b)/2);o=bpy.context.object;o.name=name;o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler();bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);return finish(o,mat,.008)
# Hand-authored silhouette, intentionally stylized and without fitted internals.
profile=[(-2.4,-.48),(-2.42,.12),(-1.48,.16),(-1.11,.08),(-.76,.17),(1.28,.17),(1.37,.08),(1.3,-.08),(-.72,-.11),(-1.12,-.18),(-1.35,-.39)]
verts=[(x,y,z) for y in [-.12,.12] for x,z in profile];n=len(profile);faces=[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
mesh=bpy.data.meshes.new('original exterior stock silhouette');mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new('stock_shell',mesh);scene.collection.objects.link(o);finish(o,wood,.045)
box('upper_wood_cover',(.42,0,.2),(1.58,.20,.13),wood,.05)
cylinder('solid_front_visual_no_bore',(1.1,0,.19),(2.36,0,.19),.054,metal)
box('closed_upper_metal_shell',(-.6,0,.21),(.75,.20,.14),metal,.04)
box('butt_cap',(-2.42,0,-.18),(.065,.27,.61),metal,.022)
for x in [.62,1.24]:box('decorative_band', (x,0,.09),(.09,.275,.29),metal,.027)
# Non-operational low-relief embellishments only; no trigger, bolt, chamber or bore.
box('rear_top_visual_tab',(-.1,0,.30),(.18,.13,.055),metal,.018)
box('front_top_visual_tab',(2.17,0,.26),(.10,.055,.07),metal,.014)
box('underside_solid_detail',(-.70,0,-.14),(.37,.14,.08),metal,.025)
# Closed ribbon, purely cosmetic. Attachment placement is artistic conjecture.
points=[(-2.08,-.15,-.30),(-1.5,-.17,-.58),(-.65,-.17,-.68),(.18,-.16,-.56),(.82,-.12,-.08)]
v=[]
for x,y,z in points:v.extend([(x,y-.018,z-.045),(x,y+.018,z-.045),(x,y+.018,z+.045),(x,y-.018,z+.045)])
f=[(3,2,1,0),(16,17,18,19)]
for i in range(len(points)-1):
 for j in range(4):f.append((4*i+j,4*i+(j+1)%4,4*(i+1)+(j+1)%4,4*(i+1)+j))
me=bpy.data.meshes.new('cosmetic closed strap');me.from_pydata(v,[],f);me.update();ob=bpy.data.objects.new('sling_visual',me);scene.collection.objects.link(ob);finish(ob,leather,.012)
if not PARAMS['showSling']:bpy.data.objects.remove(ob,do_unlink=True)
for o in scene.objects:
 if o.type=='MESH':o.location*=PARAMS['artScale'];o.scale*=PARAMS['artScale']
scene['art_params']=json.dumps(PARAMS,sort_keys=True)
scene['asset_status']='Kar98k-inspired exterior WIP; not a museum-accurate replica; no concept multiview approval'
scene['art_units']='unitless; no manufacturing measurements';scene['seed']='dot-kar98k-exterior-wip-01'
bpy.ops.object.select_all(action='SELECT')
bpy.ops.wm.save_as_mainfile(filepath=OUT+'kar98k-exterior-wip.blend')
bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=OUT+'kar98k-exterior-wip.blend')
for name in ['kar98k-exterior-wip.glb','kar98k-exterior-wip-repeat.glb']:
 bpy.ops.export_scene.gltf(filepath=OUT+name,export_format='GLB',export_yup=True,export_texcoords=True,export_normals=True,export_animations=False,export_extras=True)
print(json.dumps({'asset':'kar98k-exterior-wip','meshes':sum(o.type=='MESH' for o in scene.objects),'materials':[m.name for m in bpy.data.materials if m.users],'scope':'original nonfunctional exterior WIP mesh; no concept image request'}))
