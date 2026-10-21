"""Explicit portable PBR tile images, no lighting baked into base color."""
import bpy, math, json, random
BASE='/workspace/scratch/6a4c729be230/PGF/modules/tracked-mortar/blender/'
bpy.ops.wm.open_mainfile(filepath=BASE+'detailed-kit.blend')
scene=bpy.context.scene
root=bpy.data.objects.get('tracked-mortar')
assembly=[root]+list(root.children_recursive)
meshes=set(o.data for o in assembly if o.type=='MESH')
# Stable planar UVs per face. No generated-coordinate shader dependency.
for mesh in meshes:
 uv=mesh.uv_layers.active
 if uv is None:uv=mesh.uv_layers.new(name='PortableUV')
 for poly in mesh.polygons:
  n=poly.normal;axis=0
  if abs(n.y)>abs(n.x):axis=1
  if abs(n.z)>abs(n[axis]):axis=2
  for li in poly.loop_indices:
   co=mesh.vertices[mesh.loops[li].vertex_index].co
   uv.data[li].uv=((co.y if axis==0 else co.x)*.42,(co.y if axis==2 else co.z)*.42)
 mesh.update()
# Values are neutral sRGB appearance references; the reference does not support camo.
roles={
 'graphite-painted-steel':((.46,.475,.48),.77,.29,.017),
 'cast-edge-steel':((.56,.57,.565),.55,.67,.014),
 'panel-shadow':((.255,.265,.27),.87,.20,.012),
 'dark-running-bands':((.17,.182,.19),.93,.025,.025),
 'tube-exterior':((.385,.405,.42),.66,.50,.012),
 'lamps-frosted-glass':((.66,.70,.705),.26,.06,.006),
}
report=[]
for name,role in roles.items():
 mat=bpy.data.materials.get(name)
 if mat is None:continue
 color,rough,metal,strength=role
 nodes=mat.node_tree.nodes;links=mat.node_tree.links;nodes.clear()
 bs=nodes.new('ShaderNodeBsdfPrincipled');out=nodes.new('ShaderNodeOutputMaterial');links.new(bs.outputs['BSDF'],out.inputs['Surface'])
 arrays=[[],[],[]];size=128;rng=random.Random(1100+len(name))
 for y in range(size):
  for x in range(size):
   a=rng.random();b=rng.random()
   dust=max(0,(math.sin(x*.063+math.sin(y*.093)*1.8)*math.sin(y*.055)+.45))*.07
   grain=(a-.5)*.038
   for k in range(3):arrays[0].append(max(0,min(1,color[k]*(1+grain)+dust*(.7 if name=='dark-running-bands' else 1))))
   arrays[0].append(1)
   arrays[1].extend((1,max(0,min(1,rough+(b-.5)*.035+dust*.7)),max(0,min(1,metal-dust*.6)),1))
   arrays[2].extend((.5+(a-.5)*strength,.5+(b-.5)*strength,1,1))
 images=[]
 for index,suffix in enumerate(['basecolor','metallic-roughness','normal']):
  im=bpy.data.images.new(name+'-'+suffix,width=size,height=size,alpha=True,float_buffer=False)
  im.colorspace_settings.name='sRGB' if index==0 else 'Non-Color'
  im.pixels.foreach_set(arrays[index]);im.update();im.pack();images.append(im)
 tex=nodes.new('ShaderNodeTexImage');tex.image=images[0];tex.interpolation='Linear';links.new(tex.outputs['Color'],bs.inputs['Base Color'])
 mr=nodes.new('ShaderNodeTexImage');mr.image=images[1];sep=nodes.new('ShaderNodeSeparateColor');sep.mode='RGB';links.new(mr.outputs['Color'],sep.inputs['Color']);links.new(sep.outputs['Green'],bs.inputs['Roughness']);links.new(sep.outputs['Blue'],bs.inputs['Metallic'])
 nt=nodes.new('ShaderNodeTexImage');nt.image=images[2];nm=nodes.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=1;links.new(nt.outputs['Color'],nm.inputs['Color']);links.new(nm.outputs['Normal'],bs.inputs['Normal'])
 report.append({'material':name,'images':3,'size':[size,size],'channels':['baseColor','metallicRoughness','normal']})
root['portable_materials']='Explicit packed PNG baseColor / metallicRoughness / normal, UV0, gray palette; AO intentionally absent'
bpy.ops.object.select_all(action='DESELECT')
for o in assembly:o.select_set(True)
bpy.context.view_layer.objects.active=root
bpy.ops.export_scene.gltf(filepath=BASE+'portable-kit.glb',export_format='GLB',use_selection=True,use_active_scene=True,export_animations=False,export_extras=True,export_yup=True,export_image_format='AUTO')
scene.cycles.samples=32;scene.cycles.use_denoising=False;scene.render.filepath=BASE+'evidence/portable-pbr-hero.png'
bpy.ops.wm.save_as_mainfile(filepath=BASE+'portable-kit.blend')
bpy.ops.render.render(write_still=True)
print('PORTABLE_PBR_MATERIALS='+json.dumps(report))
