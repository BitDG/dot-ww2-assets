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
