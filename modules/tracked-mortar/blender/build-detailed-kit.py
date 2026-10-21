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
sidepanel('stepped-front-cast-hood',[(3.00,1.98),(5.07,1.98),(5.07,2.21),(4.81,2.37),(3.22,2.43),(3.00,2.25)],0,2.77,'engine',bevel=.045)
box('front-hood-lower-lip',(2.87,.095,2.18),(0,2.02,4.025),'engine','edge',.018)
for s in [-1,1]:
 box('stepped-hood-service-lid-'+str(s),(1.18,.065,1.30),(s*.665,2.45,3.92),'engine',bevel=.027)
 box('front-raised-corner-'+str(s),(.36,.25,.54),(s*1.235,2.415,4.69),'engine',bevel=.035)
 box('front-upper-edge-'+str(s),(.065,.07,1.58),(s*1.385,2.425,3.94),'engine','edge',.012)
 for i in range(7):box('front-hood-vent-'+str(s)+'-'+str(i),(.82,.025,.054),(s*.665,2.49,3.46+i*.16),'engine','recess',.008)
 box('side-carrier-lower-fillet-'+str(s),(.16,.15,9.70),(s*1.30,1.075,0),'chassis','edge',.024,stretch=True)
 for i in range(8):
  z=-4.35+i*1.23
  box('formed-side-underplate-'+str(s)+'-'+str(i),(.12,.32,1.11),(s*1.34,1.38,z),'chassis',bevel=.029)
  box('side-underplate-cap-'+str(s)+'-'+str(i),(.17,.065,1.16),(s*1.365,1.565,z),'chassis','edge',.013)
box('front-grille-frame',(1.26,.27,.07),(0,2.19,5.086),'engine','recess',.016)
for i in range(8):box('front-grille-slat-'+str(i),(1.15,.013,.045),(0,2.08+i*.030,5.137),'engine','edge',.004)
box('rear-platform',(3.26,.13,2.10),(0,1.99,-4.04),'platform',bevel=.027)
box('sculpted-carriage-bed',(2.49,.24,4.80),(0,2.11,.0),'carriage',bevel=.065)
# Exterior cradle is a layered cast silhouette, independently owned from the tube.
for s in [-1,1]:
 sidepanel('triangular-cast-support-'+str(s),[(-1.50,2.20),(1.8,2.20),(1.13,2.74),(.38,3.15),(-.55,3.12)],s*1.06,.26,'carriage',bevel=.055)
 sidepanel('outer-cast-cheek-'+str(s),[(-1.01,-.44),(.82,-.44),(1.08,.02),(.96,.42),(.77,.54),(.73,1.17),(.52,1.36),(-.83,1.36),(-1.10,1.06)],s*.87,.21,'cradle',bevel=.045)
 box('cradle-top-lid-'+str(s),(.87,.13,1.84),(s*.44,1.33,.0),'cradle',bevel=.045)
 sidepanel('cradle-stepped-cast-cover-'+str(s),[(-.80,.39),(.69,.39),(.68,.87),(.44,1.11),(-.80,1.11)],s*1.00,.075,'cradle',bevel=.032)
 sidepanel('cradle-lower-sloped-cheek-'+str(s),[(-.75,-.41),(.8,-.41),(.99,-.02),(.60,.19),(-.21,.25)],s*1.018,.10,'cradle',bevel=.025)
 sidepanel('rear-upright-shell-'+str(s),[(-2.05,2.30),(-1.11,2.30),(-.91,2.82),(-1.02,3.54),(-1.79,3.61),(-2.05,3.16)],s*.71,.17,'mechanisms',bevel=.046)
 box('rear-shell-top-cap-'+str(s),(.72,.08,.67),(s*.36,3.63,-1.47),'mechanisms',bevel=.026)
box('cradle-central-upper-mass',(1.53,.70,1.57),(0,.87,-.03),'cradle',bevel=.06)
# Tube is exterior profile plus a shallow dark art recess, with no internal design.
tubeprofile=[(-.85,0),(-.85,.58),(-.77,.76),(.77,.76),(.86,.69),(1.38,.66),(1.44,.59),(2.00,.52),(2.56,.45),(2.61,.45),(2.61,.355),(2.39,.355),(2.37,0)]
obj('mortar-tube',ringmesh('stepped-exterior-tube',tubeprofile,'z',48,'tube'),'barrel','tube',(0,0,.33))
for z,r in [(.75,.775),(1.39,.677),(2.02,.53),(2.58,.465)]:
 obj('tube-seam-collar-'+str(z),ringmesh('collar-'+str(r),[(z-.025,r),(z+.025,r),(z+.025,r-.027),(z-.025,r-.027),(z-.025,r)],'z',48,'edge'),'barrel','edge',(0,0,.33))
for part in ['barrel','cradle']:parts[part].location=cv((0,3.06,.30))
# Eleven small road wheels, high end wheels and finely segmented continuous tracks.
wheel=ringmesh('roadwheel',[(-.18,0),(-.18,.08),(-.09,.11),(-.075,.20),(-.15,.255),(-.16,.28),(-.11,.31),(.11,.31),(.16,.28),(.15,.255),(.075,.20),(.09,.11),(.18,.08),(.18,0)],'x',28,'paint')
band=ringmesh('wheelband',[(-.098,.305),(-.098,.332),(.098,.332),(.098,.305)],'x',28,'rubber')
hub=ringmesh('wheelhub',[(-.04,0),(-.04,.073),(.04,.073),(.04,0)],'x',20,'edge')
end=ringmesh('endwheel',[(-.18,0),(-.18,.13),(-.10,.28),(-.07,.40),(-.16,.47),(-.14,.53),(.14,.53),(.16,.47),(.07,.40),(.10,.28),(.18,.13),(.18,0)],'x',40,'paint')
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
  pin=obj('track-pin-accent-'+str(s)+'-'+str(i),ringmesh('track-pin-accent',[(-.345,0),(-.345,.028),(.345,.028),(.345,0)],'x',10,'edge'),'running-gear','edge',(x,y,z),fine=True)
  pin.rotation_euler.x=t;pin['track_phase']=i/steps;pin['track_side']=s

# Prominent rear display frame, low railings and access ladders.
for s in [-1,1]:
 for y in [2.28,2.59]:rod('side-railing-'+str(s)+'-'+str(y),(s*1.66,y,-4.95),(s*1.66,y,4.99),.019,'platform',rail=True)
 for i in range(9):
  z=-4.90+i*1.23
  rod('rail-post-'+str(s)+'-'+str(i),(s*1.66,1.96,z),(s*1.66,2.62,z),.022,'platform',rail=True)
 for x in [s*1.22,s*1.65]:rod('rear-ladder-stile-'+str(x),(x,.53,-5.23),(x,2.16,-5.23),.025,'platform')
 for i in range(6):rod('rear-ladder-rung-'+str(s)+'-'+str(i),(s*1.22,.55+i*.28,-5.23),(s*1.65,.55+i*.28,-5.23),.023,'platform','edge')
 rod('rear-frame-upper-'+str(s),(s*.77,2.91,-4.95),(s*.77,2.91,-1.45),.045,'mechanisms')
 rod('rear-frame-lower-'+str(s),(s*.77,2.71,-4.25),(s*.77,2.85,-1.5),.065,'mechanisms')
 for z in [-4.8,-1.63]:rod('rear-frame-stand-'+str(s)+str(z),(s*.77,2.0,z),(s*.77,2.98,z),.052,'mechanisms')
 box('rear-stowage-box-'+str(s),(.62,.31,1.05),(s*.88,2.16,-3.65),'platform',bevel=.045)
 box('rear-display-cylinder-cover-'+str(s),(.33,.33,1.47),(s*.78,2.45,-2.95),'mechanisms','paint',.045)
 for z in [3.07,4.65]:rod('front-deck-handle-'+str(s)+str(z),(s*.9,2.34,z),(s*.9,2.49,z),.024,'engine','edge')
 # Outside decoration only; no functional controls or gearing.
 ring=ringmesh('decorative-rim',[(-.015,.37),(.015,.37),(.015,.405),(-.015,.405),(-.015,.37)],'x',36,'edge')
 obj('exterior-display-ring-'+str(s),ring,'mechanisms','edge',(s*1.405,2.92,.43))
 for i in range(6):
  a=i*math.pi/3
  rod('display-ring-spoke-'+str(s)+str(i),(s*1.405,2.92,.43),(s*1.405,2.92+math.sin(a)*.37,.43+math.cos(a)*.37),.019,'mechanisms','edge')
rod('rear-frame-crossbar',(-.82,2.92,-4.96),(.82,2.92,-4.96),.041,'mechanisms')
# Inserted into the same Blender MCP builder before selected-scene export.
# External panel seams, fasteners, handrails, lamps and wheel accents only.
bolt=ringmesh('hex-head-art-fastener',[(-.013,0),(-.013,.027),(.015,.027),(.02,.022),(.02,0)],'x',6,'edge')
for s in [-1,1]:
 for i in range(7):
  z=-3.75+i*1.24
  for zz in [z-.48,z+.48]:
   for y in [1.97,2.16]:obj('cladding-fastener-'+str(s)+str(i)+str(zz)+str(y),bolt,'chassis','edge',(s*1.62,y,zz),fine=True)
  box('lower-cover-'+str(s)+str(i),(.068,.29,.72),(s*1.35,1.39,z),'chassis','paint',.018,fine=True)
  rod('cladding-top-weld-'+str(s)+str(i),(s*1.614,2.21,z-.50),(s*1.614,2.21,z+.50),.011,'chassis','edge',fine=True)
 for i in range(18):
  z=-4.56+i*.53
  rod('walkway-tread-'+str(s)+str(i),(s*1.32,1.988,z-.12),(s*1.69,1.988,z+.04),.009,'platform','edge',fine=True)
 for i in range(11):
  z=-3.74+i*.748
  for j in range(6):
   a=j*math.pi/3
   rod('wheel-rib-'+str(s)+str(i)+str(j),(s*1.62,.444+.088*math.sin(a),z+.088*math.cos(a)),(s*1.62,.444+.244*math.sin(a),z+.244*math.cos(a)),.015,'running-gear','edge',fine=True)
   obj('wheel-fastener-'+str(s)+str(i)+str(j),bolt,'running-gear','edge',(s*1.64,.444+.148*math.sin(a),z+.148*math.cos(a)),fine=True)
 for z in [-4.53,4.53]:
  for j in range(10):
   a=j*math.pi/5
   rod('endwheel-rib-'+str(s)+str(z)+str(j),(s*1.69,.755+.16*math.sin(a),z+.16*math.cos(a)),(s*1.69,.755+.45*math.sin(a),z+.45*math.cos(a)),.025,'running-gear','edge',fine=True)
 for i in range(8):
  z=-.70+i*.20
  for y in [-.27,.55,1.16]:obj('cradle-cover-bolt-'+str(s)+str(i)+str(y),bolt,'cradle','edge',(s*1.06,y,z),fine=True)
 for i in range(5):
  y=-.18+i*.25
  for z in [-.75,.76]:obj('cradle-upright-bolt-'+str(s)+str(i)+str(z),bolt,'cradle','edge',(s*1.06,y,z),fine=True)
 for z in [-.45,.0,.45]:
  disk=ringmesh('cover-roundel',[(-.025,0),(-.025,.11),(.025,.11),(.025,0)],'x',24,'paint')
  obj('cradle-round-cover-'+str(s)+str(z),disk,'cradle','paint',(s*1.04,.28,z))
 box('rear-chest-lid-'+str(s),(.67,.052,1.10),(s*.88,2.34,-3.65),'platform','edge',.012,fine=True)
 for z in [-3.94,-3.34]:box('rear-chest-latch-'+str(s)+str(z),(.052,.15,.07),(s*1.22,2.27,z),'platform','recess',.006,fine=True)
 for x in [s*1.28]:
  rod('headlamp-pedestal-'+str(s),(x,2.32,4.79),(x,2.68,4.79),.045,'engine','paint')
  obj('headlamp-case-'+str(s),ringmesh('headlamp-case',[(0,0),(0,.16),(.15,.16),(.15,0)],'z',28,'recess'),'engine','recess',(x,2.67,4.78))
  obj('headlamp-lens-'+str(s),ringmesh('headlamp-lens',[(0,0),(0,.135),(.018,.135),(.018,0)],'z',28,'lamp'),'engine','lamp',(x,2.67,4.947))
 for z in [-5.18,5.16]:
  box('outer-bumper-bracket-'+str(s)+str(z),(.18,.28,.13),(s*.93,1.5,z),'chassis','edge',.022)
  for y in [1.42,1.6]:obj('end-bracket-fastener-'+str(s)+str(z)+str(y),bolt,'chassis','edge',(s*1.04,y,z),fine=True)
 for i in range(4):
  z=-4.34+i*.76
  rod('rear-frame-diagonal-'+str(s)+str(i),(s*.77,2.13,z),(s*.77,2.86,z+.49),.03,'mechanisms','edge',fine=True)
 # Raised silhouette ribs remain in standard too; tiny seams/bolts are high only.
 box('cast-cheek-vertical-band-'+str(s),(.06,1.16,.085),(s*1.057,.53,-.33),'cradle','edge',.010)
 rod('cradle-top-handle-'+str(s),(s*.67,1.43,-.51),(s*.67,1.43,.47),.034,'cradle','edge')
 for z in [-.51,.47]:rod('cradle-handle-foot-'+str(s)+str(z),(s*.67,1.34,z),(s*.67,1.43,z),.034,'cradle','edge')
obj('rear-round-stowage-cover',ringmesh('rear-round-cover',[(-.12,0),(-.12,.42),(.12,.42),(.12,0)],'z',40,'paint'),'platform','paint',(0,2.21,-4.36)).rotation_euler.x=-math.pi/2
# A center access ladder and its bent top handles.
for x in [-.32,.32]:
 rod('front-access-ladder-'+str(x),(x,.45,5.31),(x,2.37,5.31),.026,'engine','paint')
 rod('front-ladder-top-'+str(x),(x,2.37,5.31),(x,2.49,5.18),.026,'engine','paint')
for i in range(7):rod('front-access-rung-'+str(i),(-.32,.49+i*.27,5.32),(.32,.49+i*.27,5.32),.023,'engine','edge')

# Configuration embedded in .blend and exported extras.
root['model_version']='2.0.0';root['authoring']='Blender 4.3.2 via actual stdio MCP';root['reference_scale']='visual approximation; hidden surfaces inferred';root['nonfunctional_game_art']=True
config={'units':'meters','axis':'+Y up, +Z front','baseline_length':10.8,'reference_pose':0,'road_wheels_per_side':11,'owners':list(parts),'prototype_count':len(cache),'stage':'detailed-exterior'}
root['art_configuration']=json.dumps(config)
# Export just this assembly; the studio is added only afterward.
bpy.ops.object.select_all(action='DESELECT')
for o in scene.objects:o.select_set(True)
bpy.context.view_layer.objects.active=root
bpy.ops.export_scene.gltf(filepath=BASE+'detailed-kit.glb',export_format='GLB',use_selection=True,use_active_scene=True,export_animations=False,export_extras=True,export_yup=True)
# Rendering finish uses procedural grain; portable runtime maps are supplied by PGF.
for mat in mats.values():
 if mat.name in ['recessed-art-cavity','lamps-frosted-glass','dark-running-bands']:continue
 nodes=mat.node_tree.nodes;links=mat.node_tree.links;bs=nodes.get('Principled BSDF')
 noise=nodes.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=65;noise.inputs['Detail'].default_value=2
 bump=nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.12;bump.inputs['Distance'].default_value=.026
 links.new(noise.outputs['Fac'],bump.inputs['Height']);links.new(bump.outputs['Normal'],bs.inputs['Normal'])
 ramp=nodes.new('ShaderNodeValToRGB');c=mat.diffuse_color
 ramp.color_ramp.elements[0].position=.18;ramp.color_ramp.elements[0].color=(c[0]*.86,c[1]*.86,c[2]*.86,1)
 ramp.color_ramp.elements[1].position=.82;ramp.color_ramp.elements[1].color=(c[0]*1.08,c[1]*1.08,c[2]*1.08,1)
 links.new(noise.outputs['Fac'],ramp.inputs['Fac']);links.new(ramp.outputs['Color'],bs.inputs['Base Color'])
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,.03));floor=bpy.context.object;floor.name='STUDIO-floor';floor.data.materials.append(material('studio-floor',(.29,.31,.34),.9,0))
bpy.ops.object.camera_add(location=(13,-16,9));camera=bpy.context.object;camera.name='STUDIO-camera';camera.rotation_euler=(Vector((0,0,2.3))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=13.4;scene.camera=camera
for loc,energy,size in [((3,-5,12),2000,8),((-8,-1,7),1400,7),((1,8,9),1800,6)]:
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.name='STUDIO-light';o.data.energy=energy;o.data.shape='DISK';o.data.size=size;o.rotation_euler=(Vector((0,0,1))-o.location).to_track_quat('-Z','Y').to_euler()
scene.world.color=(.3,.3,.3);scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=False
scene.render.resolution_x=1100;scene.render.resolution_y=700;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG'
scene.view_settings.view_transform='AgX';scene.render.filepath=BASE+'evidence/detailed-textured-hero.png'
bpy.ops.wm.save_as_mainfile(filepath=BASE+'detailed-kit.blend')
bpy.ops.render.render(write_still=True)
print('PGF_TRACKED_MORTAR_MAJOR_FORMS='+json.dumps(config))
