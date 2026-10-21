"""Blender MCP exterior-only art kit. X cross, Y up, +Z front in PGF.
All dimensions are arbitrary game-art proportions, never manufacturing data.
"""
import bpy, math, json
from mathutils import Vector

BASE='/workspace/scratch/6a4c729be230/PGF/modules/tracked-mortar/blender/'
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene
scene.unit_settings.system='METRIC'
scene.unit_settings.scale_length=1

def cv(p): return (p[0],-p[2],p[1])
def material(name,color,rough=.7,metal=.35):
 m=bpy.data.materials.new(name);m.use_nodes=True;m.diffuse_color=(*color,1)
 bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*color,1);bs.inputs['Metallic'].default_value=metal;bs.inputs['Roughness'].default_value=rough
 return m
mats={
 'paint':material('graphite-painted-steel',(.27,.285,.29),.72,.34),
 'edge':material('cast-edge-steel',(.38,.39,.395),.55,.65),
 'recess':material('panel-shadow',(.11,.12,.125),.82,.32),
 'rubber':material('dark-running-bands',(.075,.082,.085),.88,.06),
 'tube':material('tube-exterior',(.225,.235,.24),.65,.50),
 'cavity':material('recessed-art-cavity',(.024,.028,.029),.9,.1),
 'lamp':material('lamps-frosted-glass',(.60,.65,.63),.23,.15),
}
root=bpy.data.objects.new('tracked-mortar',None);scene.collection.objects.link(root)
parts={}
for n in ['chassis','running-gear','engine','platform','carriage','cradle','barrel','mechanisms']:
 o=bpy.data.objects.new('mortar-'+n,None);scene.collection.objects.link(o);o.parent=root;parts[n]=o
cache={}
def obj(name,mesh,parent,mat='paint',pos=(0,0,0),fine=False,rail=False,stretch=False):
 o=bpy.data.objects.new(name,mesh);scene.collection.objects.link(o);o.parent=parts[parent] if isinstance(parent,str) else parent;o.location=cv(pos)
 if mesh and len(mesh.materials)==0: mesh.materials.append(mats[mat])
 if fine:o['fine_detail']=True
 if rail:o['railing']=True
 if stretch:o['length_stretch']=True
 o['art_exterior']=True
 return o

def geometry(key,verts,faces,mat='paint',bevel=0,smooth=False):
 key=key+'-'+mat
 if key in cache:return cache[key]
 mesh=bpy.data.meshes.new(key);mesh.from_pydata([cv(v) for v in verts],[],faces);mesh.update()
 if bevel:
  o=obj('prototype',mesh,root,mat)
  bpy.context.view_layer.objects.active=o;o.select_set(True)
  mod=o.modifiers.new('Machined soft edge','BEVEL');mod.width=bevel;mod.segments=2;mod.affect='EDGES'
  bpy.ops.object.modifier_apply(modifier=mod.name)
  for p in o.data.polygons:p.use_smooth=True
  norm=o.modifiers.new('Area weighted corner normals','WEIGHTED_NORMAL');norm.keep_sharp=True;norm.weight=50
  bpy.ops.object.modifier_apply(modifier=norm.name)
  mesh=o.data;bpy.data.objects.remove(o,do_unlink=True)
 elif smooth:
  for p in mesh.polygons:p.use_smooth=True
 mesh.materials.clear();mesh.materials.append(mats[mat]);cache[key]=mesh;return mesh

def box(name,size,pos,parent,mat='paint',bevel=.025,**kw):
 x,y,z=[v*.5 for v in size];vs=[(-x,-y,-z),(-x,-y,z),(-x,y,z),(-x,y,-z),(x,-y,-z),(x,-y,z),(x,y,z),(x,y,-z)]
 fs=[(0,1,2,3),(4,7,6,5),(0,4,5,1),(3,2,6,7),(1,5,6,2),(0,3,7,4)]
 key='box-'+str(tuple(size))+'-'+str(bevel)
 return obj(name,geometry(key,vs,fs,mat,bevel),parent,mat,pos,**kw)

def ringmesh(name,profile,axis='x',segments=32,mat='paint'):
 vs=[];fs=[]
 for a,r in profile:
  for i in range(segments):
   t=2*math.pi*i/segments
   vs.append((a,r*math.cos(t),r*math.sin(t)) if axis=='x' else (r*math.cos(t),r*math.sin(t),a))
 for j in range(len(profile)-1):
  for i in range(segments):
   k=j*segments+i;q=j*segments+(i+1)%segments
   # Axis cap rings emit one valid triangle per segment, never a collapsed quad.
   if profile[j][1]==0 and profile[j+1][1]==0:continue
   if profile[j][1]==0:fs.append((k,q+segments,k+segments))
   elif profile[j+1][1]==0:fs.append((k,q,k+segments))
   else:fs.append((k,q,q+segments,k+segments))
 return geometry(name,vs,fs,mat,0,True)

def rod(name,a,b,r,parent,mat='paint',fine=False,rail=False):
 a,b=Vector(cv(a)),Vector(cv(b));d=b-a
 mesh=ringmesh('rod-'+str(r)+'-'+str(round(d.length,5)),[(-d.length/2,0),(-d.length/2,r),(d.length/2,r),(d.length/2,0)],'z',10,mat)
 o=obj(name,mesh,parent,mat,fine=fine,rail=rail);o.location=(a+b)*.5;o.rotation_mode='QUATERNION';o.rotation_quaternion=Vector((0,-1,0)).rotation_difference(d.normalized());return o

def sidepanel(name,profile,x,thick,parent,mat='paint',bevel=.025):
 vs=[(u,y,z) for u in [-thick/2,thick/2] for z,y in profile];n=len(profile)
 fs=[tuple(range(n-1,-1,-1)),tuple(range(n,n*2))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
 return obj(name,geometry(name,vs,fs,mat,bevel),parent,mat,(x,0,0))

# Long chamfered lower hull, layered upper deck and the low front deck.
box('long-main-hull',(2.60,.60,10.20),(0,1.35,0),'chassis',bevel=.10,stretch=True)
box('upper-deck-step',(3.22,.22,10.36),(0,1.75,0),'chassis',bevel=.065,stretch=True)
box('deck-perimeter-trim',(3.30,.065,10.44),(0,1.90,0),'chassis','edge',.018,stretch=True)
for s in [-1,1]:
 box('side-sill-'+str(s),(.13,.31,9.95),(s*1.35,1.30,0),'chassis','recess',.035,stretch=True)
 box('upper-side-cladding-'+str(s),(.12,.40,7.70),(s*1.50,2.04,-.3),'chassis',bevel=.018,stretch=True)
 for i in range(7):
  z=-3.75+i*1.24
  box('cladding-bay-'+str(s)+'-'+str(i),(.06,.31,1.16),(s*1.574,2.055,z),'chassis',bevel=.013)
 box('walkway-'+str(s),(.43,.075,9.90),(s*1.51,1.945,0),'platform','paint',.012,stretch=True)
 for z in [-5.09,5.09]:
  box('end-cap-'+str(s)+str(z),(.39,.53,.18),(s*1.32,1.56,z),'chassis',bevel=.045)
box('low-front-deck',(2.78,.37,2.05),(0,2.095,4.03),'engine',bevel=.07)
box('front-deck-top',(2.82,.07,2.12),(0,2.31,4.03),'engine',bevel=.025)
box('rear-platform',(3.26,.13,2.10),(0,1.99,-4.04),'platform',bevel=.027)
box('sculpted-carriage-bed',(2.49,.24,4.80),(0,2.11,.0),'carriage',bevel=.065)
# Exterior cradle is a layered cast silhouette, independently owned from the tube.
for s in [-1,1]:
 sidepanel('triangular-cast-support-'+str(s),[(-1.50,2.20),(1.8,2.20),(1.13,2.74),(.38,3.15),(-.55,3.12)],s*1.06,.26,'carriage',bevel=.055)
 sidepanel('outer-cast-cheek-'+str(s),[(-.84,-.44),(.92,-.44),(1.12,.04),(.97,1.10),(.62,1.34),(-.85,1.34),(-1.02,.84)],s*.87,.21,'cradle',bevel=.045)
 box('cradle-top-lid-'+str(s),(.87,.13,1.84),(s*.44,1.33,.0),'cradle',bevel=.045)
 box('cradle-side-raised-cover-'+str(s),(.075,.70,1.38),(s*1.0,.83,.0),'cradle',bevel=.028)
# Tube is exterior profile plus a shallow dark art recess, with no internal design.
tubeprofile=[(-.85,0),(-.85,.58),(-.77,.76),(.77,.76),(.86,.69),(1.38,.66),(1.44,.59),(2.00,.52),(2.56,.45),(2.61,.45),(2.61,.355),(2.39,.355),(2.37,0)]
obj('mortar-tube',ringmesh('stepped-exterior-tube',tubeprofile,'z',48,'tube'),'barrel','tube',(0,0,.33))
for z,r in [(.75,.775),(1.39,.677),(2.02,.53),(2.58,.465)]:
 obj('tube-seam-collar-'+str(z),ringmesh('collar-'+str(r),[(z-.025,r),(z+.025,r),(z+.025,r-.027),(z-.025,r-.027),(z-.025,r)],'z',48,'edge'),'barrel','edge',(0,0,.33))
for part in ['barrel','cradle']:parts[part].location=cv((0,3.06,.30))
# Eleven small road wheels, high end wheels and finely segmented continuous tracks.
wheel=ringmesh('roadwheel',[(-.10,0),(-.10,.25),(-.095,.31),(.095,.31),(.10,.265),(.13,.22),(.14,.08),(.16,.08),(.16,0)],'x',28,'paint')
band=ringmesh('wheelband',[(-.098,.305),(-.098,.332),(.098,.332),(.098,.305)],'x',28,'rubber')
hub=ringmesh('wheelhub',[(-.04,0),(-.04,.073),(.04,.073),(.04,0)],'x',20,'edge')
end=ringmesh('endwheel',[(-.13,0),(-.13,.48),(-.1,.54),(.1,.54),(.13,.48),(.16,.28),(.18,.13),(.18,0)],'x',40,'paint')
roller=ringmesh('returnroller',[(-.08,0),(-.08,.125),(.08,.125),(.08,0)],'x',20,'recess')
# Rounded track-course tangent distances are visual only.
trackR=.635;trackEnd=4.53;trackCY=.755
steps=84
for s in [-1,1]:
 x=s*1.50
 for i in range(11):
  z=-3.74+i*.748
  obj('road-wheel-'+str(s)+'-'+str(i),wheel,'running-gear','paint',(x,.444,z))
  obj('road-band-'+str(s)+'-'+str(i),band,'running-gear','rubber',(x,.444,z))
  obj('road-hub-'+str(s)+'-'+str(i),hub,'running-gear','edge',(x+s*.174,.444,z))
 for z in [-trackEnd,trackEnd]:obj('high-end-wheel-'+str(s)+'-'+str(z),end,'running-gear','paint',(x,.755,z))
 for i in range(10):obj('return-roller-'+str(s)+'-'+str(i),roller,'running-gear','recess',(x,1.155,-3.58+i*.79))
 for i in range(steps):
  # Capsule perimeter, with each shoe itself reusable and never stretched.
  perimeter=4*trackEnd+2*math.pi*trackR;d=i*perimeter/steps
  if d<2*trackEnd:z=-trackEnd+d;y=trackCY+trackR;t=0
  elif d<2*trackEnd+math.pi*trackR:
   a=(d-2*trackEnd)/trackR;z=trackEnd+trackR*math.sin(a);y=trackCY+trackR*math.cos(a);t=a
  elif d<4*trackEnd+math.pi*trackR:z=trackEnd-(d-2*trackEnd-math.pi*trackR);y=trackCY-trackR;t=math.pi
  else:
   a=(d-4*trackEnd-math.pi*trackR)/trackR;z=-trackEnd-trackR*math.sin(a);y=trackCY-trackR*math.cos(a);t=math.pi+a
  o=box('track-shoe-'+str(s)+'-'+str(i),(.635,.085,.265),(x,y,z),'running-gear','recess',.012)
  o.rotation_euler.x=t;o['track_phase']=i/steps;o['track_side']=s
  b=box('track-cleat-'+str(s)+'-'+str(i),(.65,.052,.055),(x,y+.062*math.cos(t),z+.062*math.sin(t)),'running-gear','edge',.008)
  b.rotation_euler.x=t;b['track_phase']=i/steps;b['track_side']=s;b['track_offset']=.062
# Prominent rear display frame, low railings and access ladders.
for s in [-1,1]:
 for y in [2.28,2.59]:rod('side-railing-'+str(s)+'-'+str(y),(s*1.66,y,-4.95),(s*1.66,y,4.99),.019,'platform',rail=True)
 for i in range(9):
  z=-4.90+i*1.23
  rod('rail-post-'+str(s)+'-'+str(i),(s*1.66,1.96,z),(s*1.66,2.62,z),.022,'platform',rail=True)
 for x in [s*1.22,s*1.65]:rod('rear-ladder-stile-'+str(x),(x,.53,-5.23),(x,2.16,-5.23),.025,'platform')
 for i in range(6):rod('rear-ladder-rung-'+str(s)+'-'+str(i),(s*1.22,.55+i*.28,-5.23),(s*1.65,.55+i*.28,-5.23),.023,'platform','edge')
 rod('rear-frame-upper-'+str(s),(s*.77,3.10,-4.95),(s*.77,3.10,-1.45),.045,'mechanisms')
 rod('rear-frame-lower-'+str(s),(s*.77,2.71,-4.25),(s*.77,2.94,-1.5),.065,'mechanisms')
 for z in [-4.8,-1.63]:rod('rear-frame-stand-'+str(s)+str(z),(s*.77,2.0,z),(s*.77,3.24,z),.052,'mechanisms')
 box('rear-stowage-box-'+str(s),(.62,.31,1.05),(s*.88,2.16,-3.65),'platform',bevel=.045)
 box('rear-display-cylinder-cover-'+str(s),(.33,.33,1.47),(s*.78,2.45,-2.95),'mechanisms','paint',.045)
 for z in [3.07,4.65]:rod('front-deck-handle-'+str(s)+str(z),(s*.9,2.34,z),(s*.9,2.49,z),.024,'engine','edge')
 # Outside decoration only; no functional controls or gearing.
 ring=ringmesh('decorative-rim',[(s*1.39,.37),(s*1.42,.37),(s*1.42,.405),(s*1.39,.405),(s*1.39,.37)],'x',36,'edge')
 obj('exterior-display-ring-'+str(s),ring,'mechanisms','edge',(0,2.92,.43))
 for i in range(6):
  a=i*math.pi/3
  rod('display-ring-spoke-'+str(s)+str(i),(s*1.405,2.92,.43),(s*1.405,2.92+math.sin(a)*.37,.43+math.cos(a)*.37),.019,'mechanisms','edge')
rod('rear-frame-crossbar',(-.82,3.11,-4.96),(.82,3.11,-4.96),.041,'mechanisms')
# Configuration embedded in .blend and exported extras.
root['model_version']='2.0.0';root['authoring']='Blender 4.3.2 via actual stdio MCP';root['reference_scale']='visual approximation; hidden surfaces inferred';root['nonfunctional_game_art']=True
config={'units':'meters','axis':'+Y up, +Z front','baseline_length':10.8,'reference_pose':0,'road_wheels_per_side':11,'owners':list(parts),'prototype_count':len(cache),'stage':'major-forms'}
root['art_configuration']=json.dumps(config)
# Export just this assembly; the studio is added only afterward.
bpy.ops.object.select_all(action='DESELECT')
for o in scene.objects:o.select_set(True)
bpy.context.view_layer.objects.active=root
bpy.ops.export_scene.gltf(filepath=BASE+'major-forms.glb',export_format='GLB',use_selection=True,use_active_scene=True,export_animations=False,export_extras=True,export_yup=True)
# Neutral clay render for silhouette review.
clay=material('neutral-clay',(.46,.48,.49),.76,.1)
for o in scene.objects:
 if o.type=='MESH':
  o.data.materials.clear();o.data.materials.append(clay)
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,.03));floor=bpy.context.object;floor.name='STUDIO-floor';floor.data.materials.append(material('studio-floor',(.29,.31,.34),.9,0))
bpy.ops.object.camera_add(location=(13,-16,9));camera=bpy.context.object;camera.name='STUDIO-camera';camera.rotation_euler=(Vector((0,0,2.0))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=13.4;scene.camera=camera
for loc,energy,size in [((3,-5,12),2000,8),((-8,-1,7),1400,7),((1,8,9),1800,6)]:
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.name='STUDIO-light';o.data.energy=energy;o.data.shape='DISK';o.data.size=size;o.rotation_euler=(Vector((0,0,1))-o.location).to_track_quat('-Z','Y').to_euler()
scene.world.color=(.3,.3,.3);scene.render.engine='CYCLES';scene.cycles.samples=20;scene.cycles.use_denoising=False
scene.render.resolution_x=1100;scene.render.resolution_y=700;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG'
scene.view_settings.view_transform='AgX';scene.render.filepath=BASE+'evidence/major-forms-neutral.png'
bpy.ops.wm.save_as_mainfile(filepath=BASE+'major-forms.blend')
bpy.ops.render.render(write_still=True)
print('PGF_TRACKED_MORTAR_MAJOR_FORMS='+json.dumps(config))
