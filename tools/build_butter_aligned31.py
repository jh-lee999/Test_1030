"""Model from the registered turnaround coordinates and construction spec."""
import argparse
import hashlib
import json
import math
import sys
from pathlib import Path
import bpy
import bmesh
from mathutils import Vector
from mathutils.geometry import delaunay_2d_cdt

ROOT=Path(__file__).resolve().parents[1]
SPEC=json.loads((ROOT/'docs/butter-modeling31/spec.json').read_text())
SHEET=ROOT/SPEC['turnaround']['file']
OUT=ROOT/'assets/butter-aligned31'
PARTS=[]
MATS={}
RIG=None
S=SPEC['turnaround']['pixelScale']

def xyz(p,y=0):return ((p[0]-390)*S,y,(805-p[1])*S)
def linear(c):return c/12.92 if c<=.04045 else ((c+.055)/1.055)**2.4
def mat(name,hexcolor):
    color=tuple(linear(int(hexcolor[i:i+2],16)/255) for i in (1,3,5))
    m=bpy.data.materials.new(name);m.use_nodes=True;m.diffuse_color=(*color,1)
    bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*color,1)
    bs.inputs['Roughness'].default_value=.9;bs.inputs['Specular IOR Level'].default_value=.1
    bs.inputs['Emission Color'].default_value=(*color,1);bs.inputs['Emission Strength'].default_value=.20
    MATS[name]=m
    return m

def mesh(name,verts,faces,color,bone='head'):
    data=bpy.data.meshes.new(name);data.from_pydata(verts,[],faces);data.update()
    bm=bmesh.new();bm.from_mesh(data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(data);bm.free()
    obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj)
    obj.data.materials.append(MATS[color])
    for f in data.polygons:f.use_smooth=True
    if bone:
        group=obj.vertex_groups.new(name=bone);group.add(list(range(len(data.vertices))),1,'REPLACE')
        mod=obj.modifiers.new('Skin','ARMATURE');mod.object=RIG;obj.parent=RIG
    PARTS.append(obj)
    return obj

def rig():
    global RIG
    data=bpy.data.armatures.new('Butter31 skeleton');RIG=bpy.data.objects.new('Butter31_Rig',data)
    bpy.context.collection.objects.link(RIG);bpy.context.view_layer.objects.active=RIG;RIG.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    bones=[('root',(0,0,0),(0,0,.2),None),('hips',(0,0,.85),(0,0,1.16),'root'),('body',(0,0,1.16),(0,0,1.65),'hips'),('head',(0,0,1.65),(0,0,2.5),'body'),('tail',(0,.21,.91),(.34,.50,.85),'hips')]
    for side,s in [('R',-1),('L',1)]:
        bones += [('arm.'+side,(s*.32,0,1.47),(s*.51,-.03,1.26),'body'),('hand.'+side,(s*.51,-.03,1.26),(s*.66,-.12,1.10),'arm.'+side),('leg.'+side,(s*.19,0,.91),(s*.19,0,.40),'hips'),('foot.'+side,(s*.19,0,.40),(s*.19,-.12,.08),'leg.'+side),('ear.'+side,(s*.57,0,2.68),(s*.83,0,2.44),'head')]
    bones += [('slingshot',(-.66,-.12,1.1),(-.72,-.12,1.55),'hand.R')]
    for name,a,b,parent in bones:
        bone=data.edit_bones.new(name);bone.head=a;bone.tail=b
        if parent:bone.parent=data.edit_bones[parent]
    bpy.ops.object.mode_set(mode='OBJECT');RIG.select_set(False)

def catmull(points,n=5):
    result=[];count=len(points)
    for i in range(count):
        a,b,c,d=[Vector(points[j%count]) for j in (i-1,i,i+1,i+2)]
        for k in range(n):
            t=k/n
            result.append((2*b+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t)*.5)
    return result

def form(name,outline,y,depth,color='hair',bone='head',center=None):
    """Closed broad curved surface with an authored silhouette and depth."""
    outline=catmull(outline)
    pts=[Vector(((p[0]-390)*S,(805-p[1])*S)) for p in outline];n=len(pts)
    def inside(p):
        hit=False
        for i,a in enumerate(pts):
            b=pts[(i+1)%n]
            if (a.y>p.y)!=(b.y>p.y) and p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x:hit=not hit
        return hit
    def distance(p):
        result=10
        for i,a in enumerate(pts):
            b=pts[(i+1)%n];ab=b-a;t=max(0,min(1,(p-a).dot(ab)/max(ab.length_squared,1e-12)))
            result=min(result,(p-(a+ab*t)).length)
        return result
    points=pts.copy();step=.025
    xmin,xmax=min(p.x for p in pts),max(p.x for p in pts);zmin,zmax=min(p.y for p in pts),max(p.y for p in pts)
    for ix in range(1,math.ceil((xmax-xmin)/step)):
        for iz in range(1,math.ceil((zmax-zmin)/step)):
            p=Vector((xmin+ix*step,zmin+iz*step))
            if inside(p) and distance(p)>.009:points.append(p)
    coords,edges,tris,*_=delaunay_2d_cdt(points,[(j,(j+1)%n) for j in range(n)],[list(range(n))],1,.000001)
    distances=[distance(p) for p in coords];maximum=max(max(distances),.001)
    verts=[];faces=[];count=len(coords)
    for side in (-1,1):
        for p,d in zip(coords,distances):
            bump=math.sin(min(1,d/maximum)*math.pi/2)**.65
            verts.append((p.x,y+side*depth*bump,p.y))
    for tri in tris:
        faces.append(tuple(reversed(tri)));faces.append(tuple(i+count for i in tri))
    # Front/back meet at the triangulated silhouette boundary.
    obj=mesh(name,verts,faces,color,bone)
    bm=bmesh.new();bm.from_mesh(obj.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.00001);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(obj.data);bm.free()
    return obj

def loft(name,rings,color,bone='body',n=64):
    # rings = (z, centerX, centerY, radiusX, radiusY)
    v=[];f=[]
    for z,x,y,rx,ry in rings:
        for j in range(n):a=math.tau*j/n;v.append((x+rx*math.cos(a),y+ry*math.sin(a),z))
    for i in range(len(rings)-1):
        for j in range(n):k=(j+1)%n;f.append((i*n+j,i*n+k,(i+1)*n+k,(i+1)*n+j))
    f += [tuple(reversed(range(n))),tuple((len(rings)-1)*n+j for j in range(n))]
    return mesh(name,v,f,color,bone)

def ball(name,co,scale,color,bone='head'):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32,ring_count=20,location=co)
    obj=bpy.context.object;obj.scale=scale;bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    verts=[v.co.copy() for v in obj.data.vertices];faces=[tuple(p.vertices) for p in obj.data.polygons]
    bpy.data.objects.remove(obj,do_unlink=True)
    return mesh(name,verts,faces,color,bone)

def tube(name,points,r,color,bone='head'):
    data=bpy.data.curves.new(name,'CURVE');data.dimensions='3D';data.bevel_depth=r;data.bevel_resolution=3
    spline=data.splines.new('BEZIER');spline.bezier_points.add(len(points)-1)
    for p,co in zip(spline.bezier_points,points):p.co=co;p.handle_left_type=p.handle_right_type='AUTO'
    obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj);bpy.context.view_layer.objects.active=obj
    bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.ops.object.convert(target='MESH')
    verts=[v.co.copy() for v in obj.data.vertices];faces=[tuple(p.vertices) for p in obj.data.polygons]
    bpy.data.objects.remove(obj,do_unlink=True)
    return mesh(name,verts,faces,color,bone)

def head():
    # Shallow, wide cheeks. Cross-sections have a softly flattened face.
    rings=[(1.72,.08,.02),(1.735,.34,.12),(1.77,.50,.24),(1.84,.575,.32),(1.95,.61,.36),(2.10,.61,.38),(2.30,.59,.38),(2.48,.53,.35),(2.65,.36,.25),(2.75,.05,.04)]
    verts=[];faces=[];n=96
    for z,rx,ry in rings:
        for j in range(n):
            a=math.tau*j/n;x=math.cos(a);y=math.sin(a)
            verts.append((rx*math.copysign(abs(x)**.72,x),ry*math.copysign(abs(y)**.55,y),z))
    for row in range(len(rings)-1):
        for j in range(n):k=(j+1)%n;faces.append((row*n+j,row*n+k,(row+1)*n+k,(row+1)*n+j))
    faces += [tuple(reversed(range(n))),tuple((len(rings)-1)*n+j for j in range(n))]
    obj=mesh('Face_Cheek_Volume',verts,faces,'skin')
    sub=obj.modifiers.new('Soft cheeks','SUBSURF');sub.levels=sub.render_levels=2
    bpy.context.view_layer.objects.active=obj;bpy.ops.object.modifier_apply(modifier=sub.name)
    paint_face(obj)

def paint_face(obj):
    # Facial ink is baked to a head UV atlas; no jaw or hair artwork is copied.
    uv=obj.data.uv_layers.new(name='HeadUV');projection=obj.data.uv_layers.new(name='ReferenceBakeOnly')
    attr=obj.data.attributes.new('InkMask','FLOAT','POINT')
    for v in obj.data.vertices:
        px=390+v.co.x/S;py=805-v.co.z/S;value=0
        for x,y,rx,ry in [(331,278,48,44),(451,278,48,44),(391,334,29,25),(283,331,43,29),(491,331,43,29)]:
            d=math.hypot((px-x)/rx,(py-y)/ry);value=max(value,max(0,min(1,(1-d)/.13)))
        attr.data[v.index].value=value*max(0,min(1,(-v.normal.y-.2)/.5))
    for poly in obj.data.polygons:
        values=[]
        for li in poly.loop_indices:
            p=obj.data.vertices[obj.data.loops[li].vertex_index].co
            u=.5+math.atan2(p.x,-p.y)/math.tau;v=.5+math.atan2(p.z-2.24,math.hypot(p.x,p.y))/math.pi
            values.append((li,u,v,p))
        seam=max(v[1] for v in values)-min(v[1] for v in values)>.5
        for li,u,v,p in values:
            uv.data[li].uv=(u+1 if seam and u<.5 else u,v)
            projection.data[li].uv=((390+p.x/S)/1774,1-(805-p.z/S)/887)
    atlas=bpy.data.images.new('Butter31 face atlas',width=2048,height=2048,alpha=False)
    source=bpy.data.images.load(str(SHEET),check_existing=True)
    material=bpy.data.materials.new('Temporary bake');material.use_nodes=True;nodes=material.node_tree.nodes;nodes.clear();links=material.node_tree.links
    out=nodes.new('ShaderNodeOutputMaterial');emit=nodes.new('ShaderNodeEmission');mix=nodes.new('ShaderNodeMixRGB')
    mix.inputs[1].default_value=MATS['skin'].diffuse_color
    tex=nodes.new('ShaderNodeTexImage');tex.image=source;mapping=nodes.new('ShaderNodeUVMap');mapping.uv_map=projection.name
    mask=nodes.new('ShaderNodeAttribute');mask.attribute_name='InkMask'
    links.new(mapping.outputs[0],tex.inputs[0]);links.new(tex.outputs['Color'],mix.inputs[2]);links.new(mask.outputs['Fac'],mix.inputs[0]);links.new(mix.outputs[0],emit.inputs[0]);links.new(emit.outputs[0],out.inputs[0])
    target=nodes.new('ShaderNodeTexImage');target.image=atlas;nodes.active=target
    obj.data.materials.clear();obj.data.materials.append(material);obj.data.uv_layers.active=uv;uv.active_render=True
    bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
    scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=1;scene.render.bake.margin=12
    bpy.ops.object.bake(type='EMIT');atlas.filepath_raw=str(OUT/'face-atlas.png');atlas.file_format='PNG';atlas.save();atlas.pack()
    final=mat('FaceInk',SPEC['palette']['skin']);bs=final.node_tree.nodes.get('Principled BSDF');image=final.node_tree.nodes.new('ShaderNodeTexImage');image.image=atlas
    final.node_tree.links.new(image.outputs['Color'],bs.inputs['Base Color']);final.node_tree.links.new(image.outputs['Color'],bs.inputs['Emission Color']);bs.inputs['Emission Strength'].default_value=.3
    obj.data.materials.clear();obj.data.materials.append(final);obj.data.uv_layers.remove(projection);obj.data.uv_layers.active=uv;uv.active_render=True
    bpy.data.materials.remove(material);obj.select_set(False)

def hair():
    # Continuous scalp bridges the frontal fringe to the rear mass in profile.
    verts=[];faces=[];rows=24;n=80
    for row in range(rows+1):
        theta=.015+1.96*row/rows
        for j in range(n):
            phi=math.tau*j/n
            verts.append((.65*math.sin(theta)*math.cos(phi),.02+.46*math.sin(theta)*math.sin(phi),2.35+.53*math.cos(theta)))
    for row in range(rows):
        for j in range(n):
            k=(j+1)%n;inds=(row*n+j,row*n+k,(row+1)*n+k,(row+1)*n+j)
            midpoint=sum((Vector(verts[i]) for i in inds),Vector())/4
            if midpoint.y<-.10 and midpoint.z<2.48 and abs(midpoint.x)<.54:continue
            faces.append(inds)
    scalp=mesh('Hair_Scalp_Bridge',verts,faces,'hair');scalp.modifiers.new('Scalp thickness','SOLIDIFY').thickness=.018
    form('Hair_Rear_Continuous',[(390,88),(480,103),(532,161),(547,249),(572,337),(640,430),(650,474),(630,506),(614,516),(619,477),(586,510),(551,527),(523,526),(539,485),(494,511),(448,514),(391,483),(337,514),(294,509),(280,481),(266,525),(224,520),(201,491),(184,439),(158,388),(189,358),(216,308),(229,210),(249,143),(309,102)],.30,.42,center=(390,295))
    # Broad curved sheets follow the drawn outlines; there are no tube locks.
    form('Hair_Front_Crown',[(260,225),(271,176),(308,128),(352,105),(391,96),(441,110),(482,137),(514,186),(523,239),(490,234),(454,218),(415,217),(380,224),(341,223),(310,236),(280,257)],-.35,.075)
    form('Bang_R',[(378,114),(340,123),(311,151),(300,181),(305,210),(329,230),(355,233),(368,217),(366,185),(370,148)],-.425,.045,center=(339,177))
    form('Bang_Center',[(365,117),(397,116),(427,135),(436,176),(443,216),(424,234),(393,237),(371,224),(361,198),(361,164)],-.425,.065,center=(399,175))
    form('Bang_L',[(421,113),(457,123),(489,154),(510,196),(517,245),(507,279),(486,296),(510,294),(534,278),(540,245),(525,181),(493,137),(454,111)],-.36,.075,center=(488,202))
    # Small continuous side framing, ending above the shoulders.
    for name,pts in [('R',[(251,243),(258,287),(270,311),(263,349),(277,378),(310,399),(273,392),(245,372),(232,338),(236,289)]),('L',[(529,244),(521,290),(511,313),(520,350),(507,378),(476,399),(510,393),(538,371),(549,337),(544,288)])]:
        form('Face_Frame_'+name,pts,-.20,.105,center=(255 if name=='R' else 525,331))
    form('Ear_R',[(278,116),(254,110),(226,126),(194,157),(161,186),(148,210),(161,229),(194,236),(225,225),(250,194),(269,154)],-.03,.075,bone='ear.R')
    form('Ear_L',[(502,116),(526,110),(554,126),(586,157),(619,186),(632,210),(619,229),(586,236),(555,225),(530,194),(511,154)],-.03,.075,bone='ear.L')
    form('Ahoge',[(389,92),(373,69),(375,49),(400,32),(433,31),(459,44),(472,61),(440,52),(419,54),(406,67),(411,86)],.03,.045)
    # Dark fine seams on front hair and headband give the broad volumes scale.
    tube('Headband',[xyz(p,-.30) for p in [(268,168),(302,131),(343,108),(390,102),(440,111),(478,139),(513,182)]],.009,'gold')

def bow(name,x,z,y,size,bone):
    # Authored thin, folded fabric lobes with curved outer corners.
    start=len(PARTS)
    for side in (-1,1):
        outline=[(x,z),(x+side*size*.8,z-size*.48),(x+side*size,z-size*.22),(x+side*size*.93,z+size*.45),(x+side*size*.45,z+size*.36)]
        form(name+str(side),outline,y,.025,'yellow',bone)
    ball(name+'_Knot',xyz((x,z),y-.02),(.045,.028,.050),'yellow',bone)
    if name=='Head_Bow':
        pivot=Vector(xyz((x,z),y))
        for obj in PARTS[start:]:
            for v in obj.data.vertices:
                p=v.co-pivot
                v.co.y=pivot.y+p.y*.866+p.z*.5
                v.co.z=pivot.z-p.y*.5+p.z*.866

def apron():
    verts=[];faces=[];n=48;rows=12
    for row in range(rows+1):
        t=row/rows;z=.85+(1.19-.85)*t;rx=.50-(.50-.315)*t;ry=.32-(.32-.255)*t
        for j in range(n+1):
            a=-math.pi/2-math.pi*.59+math.pi*1.18*j/n
            verts.append((rx*math.cos(a),-.025+ry*math.sin(a),z))
    for row in range(rows):
        for j in range(n):a=row*(n+1)+j;faces.append((a,a+1,a+n+2,a+n+1))
    obj=mesh('Apron_Open_Back',verts,faces,'yellow','body');solid=obj.modifiers.new('Cloth thickness','SOLIDIFY');solid.thickness=.014
    form('Apron_Bib',[(339,404),(442,404),(458,484),(434,514),(346,514),(325,485)],-.25,.035,'yellow','body')
    form('Apron_Pocket',[(330,521),(443,521),(435,553),(413,567),(367,568),(341,553)],-.36,.008,'yellow','body')
    tube('Pocket_Seam',[xyz(p,-.375) for p in [(330,521),(341,553),(367,568),(413,567),(435,553),(443,521)]],.006,'gold','body')
    for side,s in [('R',-1),('L',1)]:
        tube('Front_Strap_'+side,[(s*.20,-.19,1.65),(s*.23,-.29,1.48),(s*.27,-.29,1.25)],.024,'yellow','body')
        tube('Rear_Strap_'+side,[(s*.20,.18,1.65),(0,.255,1.37),(-s*.22,.27,1.16)],.024,'yellow','body')
    bow('Chest_Bow',390,445,-.335,54,'body');bow('Waist_Back_Bow',390,515,.30,30,'hips')
    bow('Head_Bow',390,101,-.28,62,'head')
    bow('Ear_Bow_R',246,140,-.135,30,'ear.R');bow('Ear_Bow_L',534,140,-.135,30,'ear.L')
    ball('White_Collar',(0,-.17,1.63),(.14,.08,.05),'white','body')
    ball('Collar_Bell',(0,-.25,1.63),(.057,.027,.063),'gold','body')
    tube('Bell_Slit',[(0,-.281,1.65),(0,-.283,1.607)],.006,'ink','body')

def body():
    loft('White_Blouse',[(1.12,0,0,.285,.205),(1.18,0,0,.32,.23),(1.35,0,0,.30,.22),(1.50,0,0,.27,.19),(1.63,0,0,.16,.13)],'white')
    for side,s in [('R',-1),('L',1)]:
        loft('Shorts_'+side,[(.755,s*.19,0,.18,.185),(.80,s*.19,0,.19,.20),(1.02,s*.18,0,.17,.18),(1.10,s*.17,0,.15,.14)],'pink','leg.'+side)
        rings=[]
        for i in range(33):
            z=.045+i*.020;rx=.125+.030*math.sin((z/.70)*math.pi*.6)
            rings.append((z,s*.19,-.028*(1-z/.7),rx,.105+.020*math.sin(z/.70*math.pi)))
        obj=loft('Stocking_'+side,rings,'brown','leg.'+side)
        obj.data.materials.append(MATS['yellow']);obj.data.materials.append(MATS['pink'])
        for p in obj.data.polygons:
            z=sum(obj.data.vertices[i].co.z for i in p.vertices)/len(p.vertices)
            p.material_index=2 if z<.10 else int((z-.10)/.095)%2
        ball('Toe_'+side,(s*.19,-.065,.065),(.128,.14,.065),'pink','foot.'+side)
        verts=[];faces=[];n=80
        for row in range(2):
            for j in range(n):
                a=math.tau*j/n;z=.727-row*.075-(.012*(1+math.cos(a*7)) if row else 0)
                verts.append((s*.19+.168*math.cos(a),.15*math.sin(a),z))
        for j in range(n):k=(j+1)%n;faces.append((j,k,n+k,n+j))
        obj=mesh('Cream_Frill_'+side,verts,faces,'white','leg.'+side);obj.modifiers.new('Fabric','SOLIDIFY').thickness=.012
        # Short white bell sleeve, small forearm, rounded mitten.
        a=Vector((s*.30,0,1.48));b=Vector((s*.45,-.015,1.34))
        tube('Sleeve_'+side,[a,a*.4+b*.6,b],.105,'white','arm.'+side)
        tube('Forearm_'+side,[b,(s*.54,-.04,1.22),(s*.64,-.10,1.13)],.067,'skin','hand.'+side)
        ball('Mitten_'+side,(s*.66,-.10,1.11),(.087,.065,.098),'skin','hand.'+side)
        ball('Thumb_'+side,(s*.60,-.16,1.13),(.040,.035,.052),'skin','hand.'+side)
    apron()
    # Tail root is the rear pelvis center; broad tufted silhouette bends away.
    form('Tail_Central',[(390,576),(416,594),(449,609),(491,611),(526,600),(554,582),(551,624),(535,653),(559,641),(543,680),(507,699),(460,700),(425,678),(410,642),(397,613)],.30,.14,'hair','tail',center=(469,647))
    tube('Tail_Root',[(0,.18,.916),(.08,.29,.87),(.20,.32,.81)],.062,'hair','tail')
    tube('Pouch_Strap',[(-.18,-.225,1.65),(-.02,-.31,1.40),(.23,-.36,1.15),(.32,-.40,.99)],.018,'brown','body')
    ball('Dog_Pouch',(.31,-.39,1.02),(.19,.072,.18),'hair','hips')
    for s in (-1,1):
        ball('Pouch_Ear'+str(s),(.31+s*.15,-.42,1.12),(.063,.035,.082),'brown','hips')
        ball('Pouch_Eye'+str(s),(.31+s*.060,-.465,1.04),(.014,.009,.024),'ink','hips')
    ball('Pouch_Nose',(.31,-.47,1.00),(.020,.009,.013),'ink','hips')
    tube('Pouch_Mouth',[(.27,-.469,.96),(.31,-.477,.943),(.35,-.469,.96)],.005,'ink','hips')
    h=Vector((-.66,-.15,1.11));joint=h+Vector((-.04,0,.19));tips=[joint+Vector((-.16,0,.22)),joint+Vector((.10,0,.31))]
    tube('Slingshot_Handle',[h+Vector((.015,0,-.08)),h,joint],.029,'wood','slingshot')
    for i,p in enumerate(tips):tube('Slingshot_Fork'+str(i),[joint,p],.030,'wood','slingshot');ball('Slingshot_Cap'+str(i),p,(.035,.032,.043),'gold','slingshot')
    tube('Slingshot_Band',[tips[0],joint+Vector((-.02,-.015,.09)),tips[1]],.010,'brown','slingshot')

def setup_camera():
    scene=bpy.context.scene;scene.render.engine='BLENDER_EEVEE_NEXT';scene.eevee.taa_render_samples=32
    scene.render.resolution_x=600;scene.render.resolution_y=887;scene.render.resolution_percentage=100
    scene.render.film_transparent=True;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA'
    scene.view_settings.view_transform='Standard';scene.view_settings.look='None'
    scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[1].default_value=.6
    for name,pos,power in [('Key',(-3,-4,6),350),('Fill',(4,-3,3),200),('Rear',(0,4,5),250)]:
        data=bpy.data.lights.new(name,'AREA');data.energy=power;data.size=5
        obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj);obj.location=pos;obj.rotation_euler=(Vector((0,0,1.5))-obj.location).to_track_quat('-Z','Y').to_euler()
    data=bpy.data.cameras.new('Aligned orthographic');data.type='ORTHO';data.ortho_scale=887*S
    obj=bpy.data.objects.new('Aligned camera',data);bpy.context.collection.objects.link(obj);scene.camera=obj
    return obj

def view(camera,name):
    center=Vector((0,0,(805-887/2)*S))
    directions={'front':(0,-10,0),'left':(7,-7,2),'right':(-7,-7,2),'side':(-10,0,0),'back':(0,10,0),'game':(0,-9,6)}
    camera.location=center+Vector(directions[name]);camera.rotation_euler=(center-camera.location).to_track_quat('-Z','Y').to_euler()

def main():
    args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
    quick='--quick' in args
    OUT.mkdir(parents=True,exist_ok=True);bpy.context.preferences.filepaths.save_version=0
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    for name,color in SPEC['palette'].items():mat(name,color)
    rig();head();hair();body();camera=setup_camera();view(camera,'front')
    source=bpy.data.images.load(str(SHEET),check_existing=True);source.pack()
    ref=bpy.data.objects.new('REFERENCE - registered turnaround',None);bpy.context.collection.objects.link(ref);ref.empty_display_type='IMAGE';ref.data=source;ref.empty_display_size=1774*S;ref.location=(1.988,.9,1.446);ref.rotation_euler=(math.pi/2,0,0);ref.hide_render=True;ref.hide_viewport=True
    note=bpy.data.texts.new('Modeling registration and decisions');note.write((ROOT/'docs/butter-modeling31/README.md').read_text())
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type=='VIEW_3D':
                space=area.spaces.active;space.overlay.show_overlays=False;space.shading.type='MATERIAL';space.region_3d.view_location=Vector((0,0,1.5));space.region_3d.view_distance=5;space.region_3d.view_rotation=camera.rotation_euler.to_quaternion()
    bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/models/butter-aligned31.blend'),compress=True)
    bpy.ops.object.select_all(action='DESELECT');RIG.select_set(True)
    for obj in PARTS:obj.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(ROOT/'assets/models/butter-aligned31.glb'),export_format='GLB',use_selection=True,export_animations=False)
    for name in (['front','side'] if quick else ['front','side','left','right','back','game']):
        view(camera,name);bpy.context.scene.render.filepath=str(OUT/(name+'.png'));bpy.ops.render.render(write_still=True)
    manifest={'version':31,'stage':'appearance-study','spec':'../../docs/butter-modeling31/spec.json','sourceSHA256':hashlib.sha256(SHEET.read_bytes()).hexdigest(),'meshCount':len(PARTS),'bones':len(RIG.data.bones),'landmarks':{k:(805-v)*S for k,v in SPEC['landmarks'].items()},'frontCamera':{'orthoScale':887*S,'center':[0,0,1.446],'imageSize':[600,887]},'views':['front','side','left','right','back','game']}
    (OUT/'model.json').write_text(json.dumps(manifest,indent=2)+'\n')
    print('ALIGNED31_COMPLETE')

if __name__=='__main__':main()
