"""Model-specific Blender-native industrial sheet paint and brushed metal. No PGF/tank/truck pixel source."""
import bpy
import json
BASE='/workspace/scratch/6a4c729be230/PGF/modules/diesel-locomotive/assets/native-surfaces'
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=8;scene.cycles.use_denoising=False;scene.render.threads_mode='FIXED';scene.render.threads=4
scene.render.bake.margin=2;scene.render.bake.use_selected_to_active=False;scene.render.bake.normal_space='TANGENT'
scene.view_settings.view_transform='Standard'
def node(nodes,kind,name):
 n=nodes.new(kind);n.label=name;n.name=name;return n
def noise(nodes,links,uv,scale,detail,name,stretch=None):
 n=node(nodes,'ShaderNodeTexNoise',name);n.inputs['Scale'].default_value=scale;n.inputs['Detail'].default_value=detail;n.inputs['Roughness'].default_value=.67
 if stretch:
  mult=node(nodes,'ShaderNodeVectorMath',name+' direction');mult.operation='MULTIPLY';mult.inputs[1].default_value=stretch;links.new(uv,mult.inputs[0]);links.new(mult.outputs['Vector'],n.inputs['Vector'])
 else:links.new(uv,n.inputs['Vector'])
 return n.outputs['Fac']
def mathnode(nodes,links,op,a,b,name):
 n=node(nodes,'ShaderNodeMath',name);n.operation=op
 if isinstance(a,(int,float)):n.inputs[0].default_value=a
 else:links.new(a,n.inputs[0])
 if isinstance(b,(int,float)):n.inputs[1].default_value=b
 else:links.new(b,n.inputs[1])
 return n.outputs[0]
def ramp(nodes,links,value,a,b,name):
 n=node(nodes,'ShaderNodeValToRGB',name);n.color_ramp.elements[0].position=a;n.color_ramp.elements[0].color=(0,0,0,1);n.color_ramp.elements[1].position=b;n.color_ramp.elements[1].color=(1,1,1,1);links.new(value,n.inputs[0]);return n.outputs['Color']
def mix(nodes,links,fac,a,b,name):
 n=node(nodes,'ShaderNodeMixRGB',name);n.blend_type='MIX';links.new(fac,n.inputs[0]);n.inputs[1].default_value=(*a,1);n.inputs[2].default_value=(*b,1);return n.outputs[0]
report=[]
for index,role in enumerate(['paint-clean','paint-worn','steel']):
 bpy.ops.mesh.primitive_plane_add(size=2,location=(index*2.6,0,0));o=bpy.context.object;o.name='Diesel '+role+' material calibration sheet'
 material=bpy.data.materials.new('Diesel native '+role);material.use_nodes=True;o.data.materials.append(material);ns=material.node_tree.nodes;ns.clear();ls=material.node_tree.links
 output=node(ns,'ShaderNodeOutputMaterial','Native PBR output');bs=node(ns,'ShaderNodeBsdfPrincipled','Diesel industrial surface');ls.new(bs.outputs['BSDF'],output.inputs['Surface'])
 coords=node(ns,'ShaderNodeTexCoord','Authored sheet UV');uv=coords.outputs['UV']
 fine=noise(ns,ls,uv,135,2,'Fine non-grid paint grain')
 if role=='steel':
  grain=noise(ns,ls,uv,1,2,'Brushed steel irregular grain',(12,180,1));color=mix(ns,ls,grain,(.64,.67,.70),(.76,.79,.82),'Steel reflectance variation');rough=mathnode(ns,ls,'ADD',.34,mathnode(ns,ls,'MULTIPLY',grain,.12,'Steel micro roughness'),'Steel roughness');metal=mathnode(ns,ls,'ADD',.95,0,'Bare metal identity')
  bump=node(ns,'ShaderNodeBump','Steel micro relief');bump.inputs['Strength'].default_value=.12;bump.inputs['Distance'].default_value=.00045;ls.new(grain,bump.inputs['Height']);normal=bump.outputs['Normal']
 else:
  broad=noise(ns,ls,uv,7,4,'Irregular paint erosion');chip=ramp(ns,ls,broad,.64,.76,'Sparse non-grid paint wear')
  scratchNoise=noise(ns,ls,uv,1,2,'Sparse directional abrasion',(3,140,1));scratch=ramp(ns,ls,scratchNoise,.72,.86,'Thin abrasion mask');scr=mathnode(ns,ls,'MULTIPLY',scratch,.4,'Restrained scratch mask')
  raw=mathnode(ns,ls,'MAXIMUM',chip,scr,'Combined irregular erosion');wear=mathnode(ns,ls,'MULTIPLY',raw,1 if role=='paint-worn' else 0,'Authored clean or worn endpoint')
  color=mix(ns,ls,wear,(.82,.84,.85),(.38,.40,.42),'Neutral tintable industrial paint and exposed scuff')
  rough=mathnode(ns,ls,'ADD',.51,mathnode(ns,ls,'ADD',mathnode(ns,ls,'MULTIPLY',fine,.08,'Fine paint roughness'),mathnode(ns,ls,'MULTIPLY',wear,.27,'Wear roughness'),'Surface roughness variation'),'Paint roughness')
  metal=mathnode(ns,ls,'ADD',.12,mathnode(ns,ls,'MULTIPLY',wear,.46,'Exposed steel contribution'),'Paint or exposed metal')
  micro=node(ns,'ShaderNodeBump','Fine orange peel, no grid');micro.inputs['Strength'].default_value=.16;micro.inputs['Distance'].default_value=.0005;ls.new(fine,micro.inputs['Height'])
  bump=node(ns,'ShaderNodeBump','Irregular shallow paint damage');bump.inputs['Strength'].default_value=.18;bump.inputs['Distance'].default_value=.003;ls.new(wear,bump.inputs['Height']);ls.new(micro.outputs['Normal'],bump.inputs['Normal']);normal=bump.outputs['Normal']
 ls.new(color,bs.inputs['Base Color']);ls.new(rough,bs.inputs['Roughness']);ls.new(metal,bs.inputs['Metallic']);ls.new(normal,bs.inputs['Normal'])
 emission=node(ns,'ShaderNodeEmission','Material channel bake only');emission.inputs['Strength'].default_value=1
 orm=node(ns,'ShaderNodeCombineXYZ','ORM encoded channels: flat AO, roughness, metallic');orm.inputs['X'].default_value=1;ls.new(rough,orm.inputs['Y']);ls.new(metal,orm.inputs['Z'])
 for channel in ['baseColor','normal','orm']:
  im=bpy.data.images.new('diesel-'+role+'-'+channel,width=512,height=512,alpha=True);im.colorspace_settings.name='sRGB' if channel=='baseColor' else 'Non-Color'
  target=node(ns,'ShaderNodeTexImage','Actual baked '+channel);target.image=im;ns.active=target
  bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
  if channel=='normal':
   ls.new(bs.outputs['BSDF'],output.inputs['Surface']);bpy.ops.object.bake(type='NORMAL')
  else:
   ls.new(color if channel=='baseColor' else orm.outputs['Vector'],emission.inputs['Color']);ls.new(emission.outputs['Emission'],output.inputs['Surface']);bpy.ops.object.bake(type='EMIT')
  im.filepath_raw=BASE+'/'+role+'-'+channel+'.png';im.file_format='PNG';im.save();im.pack()
  report.append({'role':role,'channel':channel,'size':list(im.size),'method':'Cycles tangent-space NORMAL bake' if channel=='normal' else 'Cycles EMIT bake of authored material channels','path':im.filepath_raw})
 ls.new(bs.outputs['BSDF'],output.inputs['Surface']);material['source']='Blender native nodes authored specifically for diesel locomotive';material['grid_pattern']=False
bpy.ops.wm.save_as_mainfile(filepath=BASE+'/diesel-native-materials.blend',compress=True)
print('NATIVE_SURFACE_BAKE_REPORT '+json.dumps({'status':'baked','threads':4,'samples':8,'normalSpace':'TANGENT','ao':'constant 1 on flat material calibration sheet; no whole-vehicle baked AO claim','banks':report}))
