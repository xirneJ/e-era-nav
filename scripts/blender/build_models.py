"""Build the 18 original navigation sculptures with Blender 5.2+.
Run: blender --background --python scripts/blender/build_models.py -- /absolute/repo
No downloaded assets, textures, or third-party model dependencies.
"""
import bpy, math, sys, json
from pathlib import Path
from mathutils import Vector

ROOT = Path(sys.argv[sys.argv.index('--') + 1])
OUT = ROOT / 'design/blender'
OUT.mkdir(parents=True, exist_ok=True)
(ROOT / 'artifacts').mkdir(parents=True, exist_ok=True)
(ROOT / 'design/blender').mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

def material(name, color, metal=0.0, rough=.3):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    p = next((n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
    if p is None:
        p = m.node_tree.nodes.new('ShaderNodeBsdfPrincipled')
        out = m.node_tree.nodes.new('ShaderNodeOutputMaterial')
        m.node_tree.links.new(p.outputs[0], out.inputs['Surface'])
    p.inputs['Base Color'].default_value = (*color, 1)
    p.inputs['Metallic'].default_value = metal
    p.inputs['Roughness'].default_value = rough
    p.inputs['Coat Weight'].default_value = .24
    p.inputs['Coat Roughness'].default_value = .23
    return m

# Linear colors, exported with their physically based materials.
M = {
 'ivory': material('Porcelain · warm ivory', (.86,.89,.84)),
 'navy': material('Ink · midnight blue', (.019,.048,.09), .15),
 'blue': material('Enamel · cobalt', (.035,.24,.8), .18),
 'sky': material('Enamel · glacier', (.21,.66,.88)),
 'teal': material('Enamel · jade', (.025,.45,.34), .12),
 'mint': material('Porcelain · seafoam', (.32,.83,.65)),
 'gold': material('Metal · champagne', (.93,.53,.13), .55,.26),
 'coral': material('Enamel · persimmon', (.88,.16,.095)),
 'rose': material('Porcelain · blush', (.94,.38,.36)),
 'violet': material('Enamel · iris', (.32,.13,.7), .12),
 'lavender': material('Porcelain · lilac', (.63,.43,.89)),
 'silver': material('Metal · brushed aluminium', (.55,.68,.75), .7,.28),
}
# Two shared vertex-color materials keep the whole collection under 110 draw calls.
SURFACES=[]
for name, metal in [('Sculpture porcelain',0),('Sculpture metal',.65)]:
    m=material(name,(1,1,1),metal,.30 if not metal else .26)
    shader=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    attr=m.node_tree.nodes.new('ShaderNodeVertexColor');attr.layer_name='SculptureColor'
    m.node_tree.links.new(attr.outputs['Color'],shader.inputs['Base Color'])
    SURFACES.append(m)

parts=[]
def finish(o, mat):
    o.data.materials.append(M[mat])
    parts.append(o)
    return o

def box(name, loc, dim, mat, bevel=.065):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o=bpy.context.object; o.name=name; o.dimensions=dim
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        mod=o.modifiers.new('Crafted edge radius','BEVEL'); mod.width=bevel; mod.segments=3
        mod=o.modifiers.new('Face weighted normals','WEIGHTED_NORMAL')
    return finish(o,mat)

def ball(name, loc, scale, mat):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, location=loc)
    o=bpy.context.object; o.name=name; o.scale=scale
    for p in o.data.polygons: p.use_smooth=True
    return finish(o,mat)

def cylinder(name, loc, radius, depth, mat, front=False, radius2=None):
    if radius2 is None:
        bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=radius, depth=depth, location=loc)
    else:
        bpy.ops.mesh.primitive_cone_add(vertices=32, radius1=radius, radius2=radius2, depth=depth, location=loc)
    o=bpy.context.object; o.name=name
    if front: o.rotation_euler.x=math.pi/2
    mod=o.modifiers.new('Soft rim','BEVEL'); mod.width=.025; mod.segments=2
    o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
    return finish(o,mat)

def tube(name, points, radius, mat, cyclic=False):
    cu=bpy.data.curves.new(name,'CURVE'); cu.dimensions='3D'; cu.resolution_u=8
    cu.bevel_depth=radius; cu.bevel_resolution=3; cu.use_fill_caps=True
    sp=cu.splines.new('POLY'); sp.points.add(len(points)-1)
    for p,co in zip(sp.points,points): p.co=(*co,1)
    sp.use_cyclic_u=cyclic
    o=bpy.data.objects.new(name,cu); bpy.context.collection.objects.link(o)
    return finish(o,mat)

def arc(name, center, radius, start, end, mat, thickness=.07, plane='front'):
    pts=[]
    for i in range(33):
        a=start+(end-start)*i/32
        if plane=='front': d=(radius*math.cos(a),0,radius*math.sin(a))
        else: d=(radius*math.cos(a),radius*math.sin(a),0)
        pts.append(tuple(center[k]+d[k] for k in range(3)))
    return tube(name,pts,thickness,mat)

def polygon(name, points, depth, mat, y=0, bevel=.05):
    n=len(points)
    v=[(x,y-depth/2,z) for x,z in points]+[(x,y+depth/2,z) for x,z in points]
    faces=[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    me=bpy.data.meshes.new(name);me.from_pydata(v,[],faces);me.update()
    o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o)
    if bevel:
        mod=o.modifiers.new('Rounded contour','BEVEL');mod.width=bevel;mod.segments=3
        o.modifiers.new('Face weighted normals','WEIGHTED_NORMAL')
    return finish(o,mat)

def check(center=(0,-.3,0), size=.5, mat='ivory'):
    x,y,z=center
    tube('Raised approval check',[(x-size*.45,y,z),(x-size*.12,y,z-size*.3),(x+size*.5,y,z+size*.4)],.065,mat)

def bars(y,z,width=.65,mat='ivory'):
    for i,w in enumerate([width,width*.74,width*.48]):
        box('Inset information line',(.1,y,z-i*.16),(w,.035,.048),mat,.02)

def code(y,z,mat='mint',size=.5):
    for side in [-1,1]:
        tube('Code bracket',[(side*size*.7,y,z+size*.35),(side*size,y,z),(side*size*.7,y,z-size*.35)],.043,mat)
    tube('Code slash',[(-.09,y,z-.23),(.09,y,z+.23)],.035,mat)

models={}
def build(slug, fn):
    parts.clear();fn()
    bpy.ops.object.select_all(action='DESELECT')
    for o in parts: o.select_set(True)
    bpy.context.view_layer.objects.active=parts[0]
    bpy.ops.object.convert(target='MESH')
    bpy.ops.object.join()
    o=bpy.context.object;o.name=slug
    bpy.context.scene.cursor.location=(0,0,0)
    bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    # Baked mesh normals and topology: no modifiers needed by the browser.
    colors=o.data.color_attributes.new(name='SculptureColor',type='BYTE_COLOR',domain='CORNER')
    old_materials=list(o.data.materials)
    material_indices=[]
    for face in o.data.polygons:
        mat=old_materials[face.material_index]
        shader=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
        color=shader.inputs['Base Color'].default_value
        material_indices.append(int(shader.inputs['Metallic'].default_value >= .5))
        for loop in face.loop_indices: colors.data[loop].color=color
    o.data.materials.clear()
    for mat in SURFACES:o.data.materials.append(mat)
    for face,index in zip(o.data.polygons,material_indices):face.material_index=index
    o['serviceSlug']=slug; o['authoringTool']='Blender 5.2';o['assetVersion']=1
    models[slug]=o


def passport():
    arc('Brushed steel shackle',(0,.02,.33),.37,0,math.pi,'silver',.115)
    for x in [-.37,.37]: cylinder('Shackle leg',(x,.02,.22),.115,.23,'silver')
    box('Cobalt lock body',(0,0,-.15),(1.13,.57,.88),'blue',.15)
    cylinder('Keyhole surround',(0,-.3,-.1),.20,.048,'gold',True)
    cylinder('Keyhole',(0,-.335,-.065),.067,.027,'navy',True)
    box('Keyhole stem',(0,-.338,-.17),(.07,.03,.15),'navy',.016)
    box('Bottom inlay',(0,-.294,-.45),(.53,.024,.035),'sky',.013)


def ide():
    box('Terminal chassis',(0,0,.04),(1.42,.48,1.06),'teal',.11)
    box('Glass display',(0,-.258,.04),(1.21,.05,.82),'navy',.06)
    code(-.3,.02)
    for i,mat in enumerate(['coral','gold','mint']): ball('Status light',(-.46+i*.12,-.30,.33),(.028,.018,.028),mat)
    box('Keyboard deck',(0,-.13,-.56),(1.5,.87,.12),'silver',.055)
    for row in range(3):
        for col in range(8): box('Keyboard key',(-.48+col*.137,-.43+row*.16,-.49),(.10,.1,.027),'navy',.014)


def cloud():
    for x,z,s in [(-.40,.28,.35),(0,.46,.47),(.44,.28,.33)]:ball('Cloud volume',(x,0,z),(s,.28,s*.83),'ivory')
    box('Cloud underside',(0,0,.12),(1.15,.48,.30),'ivory',.13)
    for z in [-.24,-.49]:
        box('Server module',(0,0,z),(1.06,.55,.20),'blue',.045)
        for x in [-.36,-.24]:ball('Server LED',(x,-.286,z),(.028,.02,.028),'mint')
        for x in [.12,.25,.38]:box('Cooling slot',(x,-.283,z),(.035,.02,.10),'navy',.01)


def trust():
    outline=[(-.59,.52),(0,.74),(.59,.52),(.53,-.16),(.30,-.43),(0,-.65),(-.30,-.43),(-.53,-.16)]
    polygon('Shield metal shell',outline,.28,'silver',bevel=.075)
    polygon('Solid coral enamel',[(x*.83,z*.83) for x,z in outline],.10,'coral',y=-.18,bevel=.06)
    check((0,-.26,.08),.66)


def lottery():
    box('Gift box',(0,0,-.16),(1.09,.82,.83),'violet',.1)
    box('Gift lid',(0,0,.28),(1.20,.91,.18),'lavender',.05)
    box('Front satin ribbon',(0,-.421,-.16),(.20,.03,.83),'gold',.015)
    box('Top ribbon',(0,0,.383),(.20,.91,.035),'gold',.015)
    for side in [-1,1]:
        tube('Sculpted bow',[(0,0,.4),(side*.17,-.02,.69),(side*.41,.0,.72),(side*.43,.07,.54),(0,0,.4)],.073,'gold')
    ball('Ribbon knot',(0,-.02,.43),(.12,.11,.11),'gold')


def identity():
    box('Card enclosure',(0,0,0),(1.4,.23,.99),'teal',.095)
    box('Porcelain card face',(0,-.135,0),(1.27,.045,.86),'ivory',.055)
    box('Header strip',(0,-.17,.30),(1.13,.025,.12),'teal',.02)
    cylinder('Avatar',(-.36,-.19,.035),.13,.036,'gold',True)
    box('Avatar shoulder',(-.36,-.19,-.20),(.33,.04,.17),'sky',.07)
    for i,w in enumerate([.47,.40,.3]):box('Member information',(.24,-.173,.08-i*.14),(w,.025,.047),'teal',.016)
    box('Lanyard tab',(0,0,.56),(.29,.19,.15),'gold',.04)


def clipboard():
    box('Clipboard backing',(0,0,0),(.99,.22,1.27),'blue',.09)
    box('Paper stack',(0,-.137,-.015),(.81,.065,1.04),'ivory',.04)
    box('Metal clip',(0,-.19,.53),(.44,.12,.20),'silver',.05)
    bars(-.182,.24,.48,'blue')
    check((.04,-.2,-.32),.35,'teal')


def registration():
    box('Calendar body',(0,0,-.02),(1.16,.29,1.1),'ivory',.1)
    box('Calendar header',(0,-.025,.41),(1.18,.32,.26),'coral',.075)
    for x in [-.31,.31]:
        tube('Binder ring',[(x,-.17,.40),(x,-.19,.64),(x,.10,.64),(x,.14,.4)],.055,'silver')
    for x,z in [(-.35,.10),(-.1,.1),(-.35,-.15),(-.1,-.15),(-.35,-.4)]:
        box('Calendar day',(x,-.159,z),(.13,.025,.11),'sky',.015)
    cylinder('Approval medallion',(.29,-.23,-.25),.29,.11,'teal',True)
    check((.29,-.30,-.24),.34)


def image_host():
    box('Gallery frame',(0,0,0),(1.30,.30,1.14),'gold',.085)
    box('Sky inset',(0,-.165,0),(1.08,.04,.91),'sky',.025)
    cylinder('Sun',(-.28,-.20,.24),.13,.04,'ivory',True)
    polygon('Distant mountain',[(-.46,-.37),(.03,.25),(.50,-.37)],.075,'teal',-.23,.025)
    polygon('Foreground mountain',[(-.5,-.39),(-.24,-.01),(.10,-.39)],.08,'mint',-.29,.025)
    polygon('Snow cap',[(-.08,.1),(.03,.25),(.15,.1)],.025,'ivory',-.277,.008)


def forum():
    box('Reply bubble',(.23,.16,.20),(.98,.28,.72),'rose',.15)
    polygon('Rear speech tail',[(.43,.0),(.6,-.23),(.25,.0)],.23,'rose',.16,.03)
    box('Conversation bubble',(-.18,-.08,-.12),(1.02,.38,.76),'coral',.15)
    polygon('Speech tail',[(-.5,-.35),(-.61,-.66),(-.23,-.38)],.30,'coral',-.08,.035)
    for x in [-.43,-.18,.07]:ball('Ellipsis',(x,-.288,-.10),(.059,.025,.059),'ivory')


def git():
    # A physical branch tree, with solid commit nodes and two connector planes.
    tube('Main branch',[(-.30,0,-.40),(-.30,0,.50)],.09,'silver')
    tube('Feature branch',[(-.30,0,-.10),(.35,0,.20),(.35,0,.51)],.09,'lavender')
    for x,z,mat in [(-.3,-.43,'violet'),(-.3,.52,'violet'),(.35,.53,'lavender')]:
        cylinder('Commit node',(x,0,z),.205,.27,mat,True)
        cylinder('Commit core',(x,-.15,z),.078,.038,'ivory',True)
    box('Repository foot',(0,.04,-.64),(1.0,.60,.14),'navy',.045)


def acm():
    box('Monitor housing',(0,0,.15),(1.30,.30,.94),'violet',.08)
    box('Screen',(0,-.17,.15),(1.11,.045,.73),'navy',.045)
    # Three ascending columns symbolize algorithmic progress.
    for x,h,mat in [(-.32,.20,'lavender'),(0,.34,'sky'),(.32,.48,'gold')]:
        box('Leaderboard column',(x,-.21,-.08+h/2),(.18,.04,h),mat,.022)
    cylinder('Display neck',(0,.06,-.45),.09,.35,'silver')
    box('Display foot',(0,0,-.64),(.70,.52,.12),'ivory',.045)


def team():
    for x,y,z,s,mat in [(-.43,.10,-.06,.78,'sky'),(.43,.10,-.06,.78,'teal'),(0,-.16,-.18,1,'blue')]:
        ball('Member head',(x,y,z+.58*s),(.19*s,.18*s,.21*s),'ivory')
        cylinder('Member body',(x,y,z+.12*s),.28*s,.49*s,mat,radius2=.16*s)
    box('Team platform',(0,0,-.61),(1.40,.67,.13),'silver',.06)


def developer():
    ball('Solid globe',(0,0,.03),(.56,.56,.56),'blue')
    arc('Equator',(0,0,.03),.567,0,math.tau,'sky',.026,'ground')
    for offset in [-.30,.30]:
        r=math.sqrt(.565**2-offset**2)
        arc('Latitude',(0,0,.03+offset),r,0,math.tau,'sky',.02,'ground')
    for angle in [0,math.pi/2]:
        pts=[(.568*math.cos(a)*math.cos(angle),.568*math.cos(a)*math.sin(angle),.03+.568*math.sin(a)) for a in [i*math.tau/64 for i in range(64)]]
        tube('Meridian',pts,.023,'ivory',True)
    arc('Globe cradle',(0,0,.03),.69,-math.pi*.92,math.pi*.40,'gold',.055)
    cylinder('Globe pedestal',(0,0,-.65),.33,.1,'navy')


def bulb():
    ball('Porcelain lamp',(0,0,.31),(.46,.37,.48),'gold')
    cylinder('Lamp collar',(0,0,-.10),.25,.28,'gold',radius2=.34)
    for z in [-.29,-.40,-.51]:cylinder('Threaded socket',(0,0,z),.255,.085,'silver')
    cylinder('Contact',(0,0,-.59),.14,.09,'navy')
    tube('Filament detail',[(-.16,-.342,.32),(0,-.385,.10),(.16,-.342,.32)],.037,'ivory')
    for side in [-1,1]:tube('Inspiration ray',[(side*.6,0,.5),(side*.77,0,.58)],.047,'gold')


def oj():
    box('Terminal shell',(0,0,.04),(1.30,.47,1.12),'sky',.11)
    box('Terminal display',(0,-.256,.07),(1.1,.045,.80),'navy',.055)
    tube('Prompt chevron',[(-.38,-.295,.29),(-.14,-.295,.08),(-.38,-.295,-.13)],.06,'mint')
    box('Prompt cursor',(.23,-.3,-.14),(.29,.04,.075),'ivory',.02)
    box('Terminal chin',(0,-.26,-.44),(.76,.04,.065),'blue',.025)
    for x in [-.43,.43]:box('Terminal foot',(x,0,-.60),(.23,.35,.12),'silver',.035)


def flask():
    # Opaque porcelain vessel and a raised liquid panel avoid fragile transparency.
    polygon('Porcelain flask',[(-.20,.61),(.20,.61),(.20,.19),(.60,-.44),(.51,-.61),(-.51,-.61),(-.60,-.44),(-.20,.19)],.48,'ivory',bevel=.08)
    polygon('Jade liquid',[(-.32,-.07),(.32,-.07),(.49,-.45),(.43,-.51),(-.43,-.51),(-.49,-.45)],.04,'teal',y=-.267,bevel=.025)
    box('Bottle lip',(0,0,.62),(.53,.56,.12),'teal',.045)
    for x,z,s in [(-.15,-.34,.055),(.19,-.22,.072),(0,-.12,.042)]:ball('Liquid bubble',(x,-.31,z),(s,.023,s),'mint')
    for x,z,s in [(.37,.57,.08),(.51,.85,.055)]:ball('Discovery bubble',(x,0,z),(s,s,s),'mint')


for slug,fn in [('era-passport',passport),('era-ide',ide),('era-cloud',cloud),('era-trust',trust),('era-lottery',lottery),('era-id',identity),('era-clipboard',clipboard),('era-registration',registration),('era-image-host',image_host),('era-forum',forum),('era-git',git),('acm-team',acm),('era-team',team),('era-developer',developer),('miaoji-lab',bulb),('era-oj',oj),('qifa-lab',flask)]:build(slug,fn)

bpy.ops.object.select_all(action='DESELECT')
for o in models.values():o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'navigation-sculptures.raw.glb'),export_format='GLB',use_selection=True,export_extras=True,export_yup=True)
manifest={}
for slug,o in models.items():
    o.data.calc_loop_triangles()
    manifest[slug]={'triangles':len(o.data.loop_triangles),'dimensions':[round(v,3) for v in o.dimensions]}
(OUT/'navigation-sculptures.json').write_text(json.dumps({'generator':bpy.app.version_string,'models':manifest},indent=2)+'\n')

# A source-file contact sheet with the exact same exported meshes/materials.
for i,(slug,o) in enumerate(models.items()):
    col=i%6;row=i//6
    o.location=((col-2.5)*2.65,(row-1)*3.05,.80)
    o.rotation_euler.z=math.radians(-13)
    bpy.ops.mesh.primitive_cylinder_add(vertices=64,radius=1.02,depth=.13,location=(o.location.x,o.location.y,.025))
    plate=bpy.context.object;plate.name='Display plinth';plate.data.materials.append(M['ivory'])
    mod=plate.modifiers.new('Soft rim','BEVEL');mod.width=.06;mod.segments=3
    plate.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
    bpy.ops.object.text_add(location=(o.location.x,o.location.y-1.25,.06),rotation=(0,0,0))
    label=bpy.context.object;label.name='Label '+slug;label.data.body=f'{i+1:02d}  '+slug.replace('era-','').replace('-',' ').upper()
    label.data.align_x='CENTER';label.data.size=.15;label.data.extrude=.0005;label.data.materials.append(M['navy'])

bpy.ops.mesh.primitive_plane_add(size=200)
plane=bpy.context.object;plane.name='Studio backdrop';plane.location.z=-.055;plane.data.materials.append(material('Backdrop',(.67,.73,.73),rough=.8))
scene=bpy.context.scene
scene.world.color=(.4,.4,.4)
scene.world.use_nodes=True
next(n for n in scene.world.node_tree.nodes if n.type == 'BACKGROUND').inputs[0].default_value=(.7,.79,.85,1)
next(n for n in scene.world.node_tree.nodes if n.type == 'BACKGROUND').inputs[1].default_value=.45
for name,loc,power,size,color in [('Key',(-5,-8,13),2300,9,(1,.91,.79)),('Fill',(9,-1,9),1700,8,(.77,.9,1)),('Rim',(-2,8,10),2200,7,(1,1,1))]:
    bpy.ops.object.light_add(type='AREA',location=loc)
    light=bpy.context.object;light.name=name;light.data.energy=power;light.data.shape='DISK';light.data.size=size;light.data.color=color
    light.rotation_euler=(Vector((0,0,0))-light.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(3,-14,19))
cam=bpy.context.object;cam.rotation_euler=(Vector((0,0,.4))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=17.8;scene.camera=cam
scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=True
scene.render.resolution_x=1800;scene.render.resolution_y=1120;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX'
scene.render.image_settings.file_format='PNG'
scene.render.filepath=str(ROOT/'artifacts/blender-models-contact-sheet.png')
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'design/blender/navigation-sculptures.blend'))
bpy.ops.render.render(write_still=True)
print('MODEL_BUILD_COMPLETE',json.dumps(manifest))
