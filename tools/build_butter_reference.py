"""Build a textured, closed-volume Butter model from the approved 2D study.

No live game files are changed. Artwork stays intact and is projected by UVs
onto sculpted surfaces; face, hair, garments and limbs are not image planes.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import struct
import sys
from pathlib import Path

import bpy
from mathutils import Vector
from mathutils.geometry import tessellate_polygon

sys.dont_write_bytecode=True
sys.path.insert(0,str(Path(__file__).resolve().parent))
import build_butter_model as helpers

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/"assets"/"butter-reference29"
FRONT=ROOT/"assets"/"butter-2d-study.png"
REAR=OUT/"back-art.png"
MODEL=ROOT/"assets"/"models"/"butter-reference29.blend"
GLB=MODEL.with_suffix(".glb")
WIDTH,HEIGHT=1199,1312
SCALE=480
ORIGIN_X=570
BASELINE=1286
MATERIALS={}
ART={}
PARTS=[]
RIG=None
CAMERA=None


def point(pixel,y=0):
    return Vector(((pixel[0]-ORIGIN_X)/SCALE,y,(BASELINE-pixel[1])/SCALE))


def linear(color):
    return tuple(c/12.92 if c<=.04045 else ((c+.055)/1.055)**2.4 for c in color)


def solid_material(name,color):
    material=bpy.data.materials.new(name);material.use_nodes=True
    rgb=linear(color);material.diffuse_color=(*rgb,1)
    bsdf=material.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value=(*(c*.28 for c in rgb),1)
    bsdf.inputs["Emission Color"].default_value=(*rgb,1)
    bsdf.inputs["Emission Strength"].default_value=.80
    bsdf.inputs["Roughness"].default_value=1
    bsdf.inputs["Specular IOR Level"].default_value=0
    MATERIALS[name]=material
    return material


def image_material(name,path):
    material=bpy.data.materials.new("Art_"+name);material.use_nodes=True
    nodes=material.node_tree.nodes;bsdf=nodes.get("Principled BSDF")
    tex=nodes.new("ShaderNodeTexImage");tex.image=bpy.data.images.load(str(path),check_existing=True)
    tex.image.pack();tex.interpolation="Linear"
    bsdf.inputs["Base Color"].default_value=(0,0,0,1)
    bsdf.inputs["Emission Strength"].default_value=1
    bsdf.inputs["Roughness"].default_value=1
    bsdf.inputs["Specular IOR Level"].default_value=0
    material.node_tree.links.new(tex.outputs["Color"],bsdf.inputs["Emission Color"])
    material.node_tree.links.new(tex.outputs["Alpha"],bsdf.inputs["Alpha"])
    material.surface_render_method="DITHERED"
    material.use_backface_culling=True
    ART[name]=material
    return material


def path(start,segments,steps=9):
    previous=Vector(start);points=[]
    for a,b,end in segments:
        a,b,end=Vector(a),Vector(b),Vector(end)
        for i in range(steps):
            t=i/steps;s=1-t
            points.append(previous*s*s*s+3*a*s*s*t+3*b*s*t*t+end*t*t*t)
        previous=end
    return points


def poly(points):
    return [Vector(p) for p in points]


def bind(obj,bone):
    obj.parent=RIG
    if bone:
        group=obj.vertex_groups.new(name=bone)
        group.add(list(range(len(obj.data.vertices))),1,"REPLACE")
        armature=obj.modifiers.new("Butter armature","ARMATURE");armature.object=RIG
    for polygon in obj.data.polygons:polygon.use_smooth=True
    obj["source"]="approved-2D-UV-on-3D-volume"
    PARTS.append(obj)
    return obj


def mesh(name,vertices,faces,material,bone,uv=None):
    data=bpy.data.meshes.new(name);data.from_pydata(vertices,[],faces);data.update()
    obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj)
    data.materials.append(material)
    if uv:
        layer=data.uv_layers.new(name="Artwork projection")
        for loop in data.loops:layer.data[loop.index].uv=uv[loop.vertex_index]
    return bind(obj,bone)


def uv_front(p):return (p.x/WIDTH,1-p.y/HEIGHT)


def uv_rear(box,bounds):
    left,top,right,bottom=bounds
    bx,by,bw,bh=box
    def project(p):
        u=(p.x-left)/max(1,right-left);v=(p.y-top)/max(1,bottom-top)
        return ((bx+(1-u)*bw)/WIDTH,1-(by+v*bh)/HEIGHT)
    return project


def volume(name,contour,front,back,bulge,back_bulge,color,bone="head",rear_box=None,art=True,resolution=3,front_art="front",cutouts=(),rear_art="back"):
    """Closed sculpted solid plus conforming painted surface, not a billboard.

    Triangle subdivision supplies interior vertices for cheek/hair curvature.
    The exact same approved image coordinates become front UV coordinates.
    """
    contour=list(contour)
    area=sum(contour[i].x*contour[(i+1)%len(contour)].y-contour[(i+1)%len(contour)].x*contour[i].y for i in range(len(contour)))
    if area>0:contour.reverse() # CCW in world XZ -> front normal points -Y.
    left=min(p.x for p in contour);right=max(p.x for p in contour)
    top=min(p.y for p in contour);bottom=max(p.y for p in contour)
    bounds=(left,top,right,bottom)
    cx,cy=(left+right)/2,(top+bottom)/2
    rx,ry=max(1,(right-left)/2),max(1,(bottom-top)/2)
    # Put the depth into painted curved caps, not a broad unpainted slab at
    # the side. Their center depths stay unchanged; the shared rim is narrow.
    transfer=max(0,(back-front-.035)/2) if name in ("Flowing_BackHair","Left_Flowing_Lock","Right_Flowing_Locks") else 0
    front+=transfer;back-=transfer;bulge+=transfer;back_bulge+=transfer
    def curve(p):
        return max(0,1-((p.x-cx)/rx)**2-((p.y-cy)/ry)**2)**.65
    def surface(p,rear=False):return back+back_bulge*curve(p) if rear else front-bulge*curve(p)
    points3=[Vector((p.x,0,-p.y)) for p in contour]
    triangles=tessellate_polygon([points3])
    lookup={tuple(v):i for i,v in enumerate(points3)}
    triangles=[[i if isinstance(i,int) else lookup[tuple(i)] for i in triangle] for triangle in triangles]
    pixels=[];indices={};buckets={};cap=[]
    def index(p):
        key=(round(p[0],5),round(p[1],5))
        if key in indices:return indices[key]
        cell=(math.floor(p[0]*1000),math.floor(p[1]*1000))
        for dx in (-1,0,1):
            for dy in (-1,0,1):
                for candidate in buckets.get((cell[0]+dx,cell[1]+dy),[]):
                    if abs(pixels[candidate].x-p[0])<.0002 and abs(pixels[candidate].y-p[1])<.0002:
                        indices[key]=candidate;return candidate
        indices[key]=len(pixels);pixels.append(Vector(key));buckets.setdefault(cell,[]).append(indices[key])
        return indices[key]
    def bary(a,b,c,u,v):
        # mathutils vectors store float32; interpolate as Python float64 so
        # shared triangle edges deduplicate exactly into a watertight mesh.
        return (a.x*(1-u-v)+b.x*u+c.x*v,a.y*(1-u-v)+b.y*u+c.y*v)
    for a,b,c in triangles:
        a,b,c=contour[a],contour[b],contour[c]
        for i in range(resolution):
            for j in range(resolution-i):
                p=bary(a,b,c,i/resolution,j/resolution)
                q=bary(a,b,c,(i+1)/resolution,j/resolution)
                r=bary(a,b,c,i/resolution,(j+1)/resolution)
                cap.append((index(p),index(q),index(r)))
                if i+j<resolution-1:
                    s=bary(a,b,c,(i+1)/resolution,(j+1)/resolution)
                    cap.append((index(q),index(s),index(r)))
    # Make the front-facing winding independent of tessellation API version.
    for i,face in enumerate(cap):
        a,b,c=[point(pixels[v]) for v in face]
        if (b-a).cross(c-a).y>0:cap[i]=tuple(reversed(face))
    boundary=[index(p) for p in contour]
    n=len(pixels)
    vertices=[point(p,surface(p,False)) for p in pixels]+[point(p,surface(p,True)) for p in pixels]
    faces=list(cap)+[tuple(v+n for v in reversed(face)) for face in cap]
    # Subdivision also splits boundary edges; stitch every intermediate point.
    for i in range(len(contour)):
        a,b=contour[i],contour[(i+1)%len(contour)]
        edge=[index((a.x*(1-t/resolution)+b.x*t/resolution,a.y*(1-t/resolution)+b.y*t/resolution)) for t in range(resolution+1)]
        for a,b in zip(edge,edge[1:]):faces.append((a,a+n,b+n,b))
    # All boundary samples were already generated by cap tessellation.
    assert len(pixels)==n,f"{name}: unmatched boundary subdivision ({len(pixels)-n} points)"
    core=mesh(name+"_Volume",vertices,faces,MATERIALS[color],bone)
    core["closed_volume"]=True;core["depth"]=max(v.y for v in vertices)-min(v.y for v in vertices)
    def clip_polygon(points,evaluate,greater):
        result=[]
        for i,a in enumerate(points):
            b=points[(i+1)%len(points)];av=evaluate(a);bv=evaluate(b)
            inside_a=av>=0 if greater else av<=0;inside_b=bv>=0 if greater else bv<=0
            if inside_a:result.append(a)
            if inside_a!=inside_b:result.append(a.lerp(b,av/(av-bv)))
        return result
    def subtract_convex(points,planes):
        remaining=points;outside=[]
        for evaluate in planes:
            if not remaining:break
            removed=clip_polygon(remaining,evaluate,False)
            if len(removed)>=3:outside.append(removed)
            remaining=clip_polygon(remaining,evaluate,True)
        return outside
    exclusions=[]
    for cutout in cutouts:
        if len(cutout)==4 and isinstance(cutout[0],(int,float)):
            x0,y0,x1,y1=cutout
            exclusions.append(((x0,y0,x1,y1),[lambda p,x0=x0:p.x-x0,lambda p,x1=x1:x1-p.x,lambda p,y0=y0:p.y-y0,lambda p,y1=y1:y1-p.y]))
        else:
            vectors=[Vector((v.x,v.y,0)) for v in cutout]
            for triangle in tessellate_polygon([vectors]):
                tri=[vectors[i] if isinstance(i,int) else i for i in triangle]
                if (tri[1]-tri[0]).cross(tri[2]-tri[0]).z<0:tri.reverse()
                planes=[]
                for i,a in enumerate(tri):
                    b=tri[(i+1)%3];dx,dy=b.x-a.x,b.y-a.y
                    planes.append(lambda p,ax=a.x,ay=a.y,dx=dx,dy=dy:dx*(p.y-ay)-dy*(p.x-ax))
                exclusions.append(((min(v.x for v in tri),min(v.y for v in tri),max(v.x for v in tri),max(v.y for v in tri)),planes))
    def painted_cap(rear,material,projection):
        output=[];output_uv=[];output_faces=[]
        for face in cap:
            a,b,c=[pixels[i] for i in face];regions=[[a,b,c]]
            for box,planes in exclusions:
                next_regions=[]
                for region in regions:
                    if max(p.x for p in region)<box[0] or min(p.x for p in region)>box[2] or max(p.y for p in region)<box[1] or min(p.y for p in region)>box[3]:next_regions.append(region)
                    else:next_regions.extend(subtract_convex(region,planes))
                regions=next_regions
            denominator=(b.y-c.y)*(a.x-c.x)+(c.x-b.x)*(a.y-c.y)
            if abs(denominator)<1e-8:continue
            for region in regions:
                start=len(output)
                for p in region:
                    wa=((b.y-c.y)*(p.x-c.x)+(c.x-b.x)*(p.y-c.y))/denominator
                    wb=((c.y-a.y)*(p.x-c.x)+(a.x-c.x)*(p.y-c.y))/denominator
                    y=surface(a,rear)*wa+surface(b,rear)*wb+surface(c,rear)*(1-wa-wb)
                    output.append(point(p,y+(.003 if rear else -.003)));output_uv.append(projection(p))
                for i in range(1,len(region)-1):
                    f=(start,start+i,start+i+1)
                    if (output[f[1]]-output[f[0]]).cross(output[f[2]]-output[f[0]]).length_squared>1e-16:
                        output_faces.append(tuple(reversed(f)) if rear else f)
        mesh(name+("_BackPaint" if rear else "_Paint"),output,output_faces,material,bone,output_uv)
    if art:
        front_uv=uv_front if front_art=="front" else uv_rear(rear_box,bounds)
        painted_cap(False,ART[front_art],front_uv)
    if rear_box:painted_cap(True,ART[rear_art],uv_rear(rear_box,bounds))
    if color=="hair":
        # Paint the actual side wall with a clean, hair-only rear region.
        # This region contains no face, ribbons, clothing or bag to duplicate.
        wall=[];wall_uv=[];wall_faces=[]
        for face in faces[len(cap)*2:]:
            start=len(wall);a,b,c=[vertices[i] for i in face[:3]]
            normal=(b-a).cross(c-a).normalized()
            for vi in face:
                pixel=pixels[vi%n];depth=1 if vi>=n else 0
                wall.append(vertices[vi]+normal*.003)
                u=.30*(pixel.x-left)/max(1,right-left)+.70*depth
                v=(pixel.y-top)/max(1,bottom-top)
                wall_uv.append(((430+u*340)/WIDTH,1-(180+v*420)/HEIGHT))
            wall_faces.append((start,start+1,start+2,start+3))
        mesh(name+"_SidePaint",wall,wall_faces,ART["back"],bone,wall_uv)
    return core


def head_bow_outline():
    return path((470,117),[
        ((493,91),(535,121),(561,148)),((578,160),(591,132),(618,138)),
        ((650,145),(675,135),(694,150)),((713,181),(676,225),(654,236)),
        ((617,244),(600,199),(576,190)),((554,178),(513,208),(486,204)),
        ((461,196),(454,140),(470,117))])


def ear_bow_outline():
    return path((838,254),[
        ((864,231),(895,257),(913,270)),((931,247),(955,212),(974,224)),
        ((1005,245),(1006,286),(981,303)),((954,326),(929,292),(916,294)),
        ((901,327),(879,341),(860,327)),((839,316),(824,272),(838,254))])


def chest_bow_outline():
    return path((451,687),[
        ((470,663),(505,688),(533,704)),((551,684),(590,678),(627,698)),
        ((640,720),(612,758),(603,783)),((567,785),(554,750),(530,735)),
        ((510,758),(478,770),(450,755)),((432,742),(437,702),(451,687))])


def pouch_outline():
    return path((607,829),[
        ((660,802),(723,816),(744,855)),((774,900),(743,952),(693,967)),
        ((650,986),(592,950),(573,914)),((546,886),(563,851),(607,829))])


def apron_outline():
    return path((449,667),[
        ((486,665),(593,673),(640,684)),((630,776),(644,843),(715,930)),
        ((660,970),(425,974),(330,944)),((314,927),(326,909),(339,891)),
        ((376,842),(418,816),(431,775)),((438,729),(431,691),(449,667))])


def create_rig():
    global RIG
    data=bpy.data.armatures.new("Butter reference skeleton")
    RIG=bpy.data.objects.new("Butter_Reference_Rig",data);bpy.context.collection.objects.link(RIG)
    bpy.context.view_layer.objects.active=RIG;RIG.select_set(True);bpy.ops.object.mode_set(mode="EDIT")
    definitions=[
        ("root",(570,1286),0,(570,1190),0,None),
        ("pelvis",(570,995),0,(567,895),0,"root"),
        ("spine",(567,895),0,(552,635),0,"pelvis"),
        ("head",(552,635),0,(560,190),.05,"spine"),
        ("hair",(580,200),.35,(800,830),.35,"head"),
        ("tail",(570,1000),.25,(850,1040),.40,"pelvis"),
        ("ear.R",(335,220),.02,(210,300),.02,"head"),
        ("ear.L",(845,285),.02,(1010,400),.02,"head"),
        ("upper_arm.R",(429,704),-.04,(370,808),-.12,"spine"),
        ("forearm.R",(370,808),-.12,(285,808),-.28,"upper_arm.R"),
        ("hand.R",(285,808),-.28,(263,771),-.32,"forearm.R"),
        ("slingshot.R",(285,808),-.32,(224,704),-.32,"hand.R"),
        ("upper_arm.L",(678,704),-.03,(742,815),-.08,"spine"),
        ("forearm.L",(742,815),-.08,(774,876),-.16,"upper_arm.L"),
        ("hand.L",(774,876),-.16,(802,893),-.18,"forearm.L"),
    ]
    for side,x,knee_x,toe_x in (("R",465,478,469),("L",625,659,682)):
        definitions.extend([
            (f"thigh.{side}",(x,994),.02,(knee_x,1120),.015,"pelvis"),
            (f"shin.{side}",(knee_x,1120),.015,(toe_x,1242),-.01,f"thigh.{side}"),
            (f"foot.{side}",(toe_x,1242),-.01,(toe_x,1268),-.14,f"shin.{side}")])
    for i in range(3):definitions.append((f"finger.L.{i}",(778+i*7,878),-.18,(788+i*7,895),-.19,"hand.L"))
    for name,a,ay,b,by,parent in definitions:
        bone=data.edit_bones.new(name);bone.head=point(a,ay);bone.tail=point(b,by)
        if parent:bone.parent=data.edit_bones[parent]
    bpy.ops.object.mode_set(mode="OBJECT");RIG.select_set(False)
    RIG["holding_hand"]="hand.R";RIG["drawing_hand"]="hand.L"
    RIG["reference"]="assets/butter-2d-study.png - approved design; UV coordinates preserve facial identity"
    RIG["stage"]="Textured 3D appearance study. Gameplay/animation atlas not replaced."
    helpers.RIG=RIG;helpers.MATERIALS=MATERIALS;helpers.PARTS=[]


def add_hair():
    base=path((330,190),[
        ((420,85),(550,95),(655,140)),((810,116),(921,251),(926,457)),
        ((942,609),(1137,681),(1151,784)),((1140,866),(1043,891),(951,865)),
        ((846,901),(784,865),(750,770)),((704,685),(640,631),(580,617)),
        ((506,620),(406,738),(366,869)),((323,960),(173,903),(192,797)),
        ((219,629),(202,400),(265,275)),((280,229),(305,203),(330,190))])
    volume("Flowing_BackHair",base,.16,.52,.08,.25,"hair","hair",(175,125,875,735),True,3,"back")
    left=path((331,275),[
        ((264,356),(223,421),(226,562)),((215,670),(172,804),(195,862)),
        ((209,911),(306,937),(371,921)),((342,903),(331,874),(347,839)),
        ((363,821),(374,807),(385,800)),((367,739),(339,695),(393,657)),
        ((326,635),(279,608),(271,546)),((275,491),(311,455),(348,447)),
        ((309,412),(323,349),(331,275))])
    volume("Left_Flowing_Lock",left,-.10,.16,.16,.12,"hair","hair")
    right=path((792,303),[
        ((809,473),(848,572),(1035,638)),((1006,647),(978,634),(954,627)),
        ((1040,709),(1146,694),(1150,790)),((1144,763),(1130,746),(1120,744)),
        ((1153,836),(1064,879),(963,872)),((990,856),(1006,831),(1008,807)),
        ((976,847),(931,875),(886,872)),((908,851),(920,826),(918,797)),
        ((865,855),(834,878),(792,850)),((800,866),(819,870),(837,874)),
        ((784,892),(762,866),(744,833)),((707,793),(700,738),(679,677)),
        ((760,645),(799,562),(776,469)),((771,406),(794,358),(792,303))])
    volume("Right_Flowing_Locks",right,-.06,.21,.14,.13,"hair","hair")
    cap=path((300,207),[
        ((362,139),(424,95),(482,113)),((537,126),(565,134),(620,149)),
        ((729,157),(799,139),(842,197)),((857,245),(869,302),(861,343)),
        ((762,306),(691,266),(592,251)),((476,211),(395,235),(300,207))])
    head_bow_cutout=(head_bow_outline(),)
    volume("Crown_Hair",cap,-.18,.24,.13,.16,"hair","head",cutouts=head_bow_cutout)
    fringe=path((486,151),[
        ((405,163),(330,202),(303,301)),((275,354),(286,430),(349,451)),
        ((323,434),(336,373),(365,345)),((406,297),(444,327),(482,366)),
        ((466,287),(477,213),(486,151))])
    volume("Curled_Forelock_R",fringe,-.42,-.25,.12,.05,"hair","head",cutouts=head_bow_cutout)
    center=path((486,219),[
        ((517,233),(556,244),(590,220)),((642,217),(646,318),(706,376)),
        ((680,389),(641,383),(614,371)),((594,389),(532,376),(495,356)),
        ((482,309),(498,240),(486,219))])
    volume("Curled_Forelock_Center",center,-.47,-.24,.12,.05,"hair","head",cutouts=head_bow_cutout)
    right_fringe=path((673,181),[
        ((770,215),(829,343),(801,484)),((797,596),(740,671),(655,676)),
        ((691,649),(691,631),(709,609)),((731,547),(750,462),(724,402)),
        ((691,329),(682,253),(673,181))])
    volume("Curled_Forelock_L",right_fringe,-.37,-.06,.12,.11,"hair","head",cutouts=head_bow_cutout)
    ahoge=path((570,127),[
        ((550,106),(554,66),(612,43)),((665,25),(719,51),(731,84)),
        ((698,61),(675,64),(642,73)),((600,85),(600,102),(628,137)),
        ((607,133),(588,132),(570,127))])
    volume("Curled_Ahoge",ahoge,-.05,.09,.04,.05,"hair","head")


def add_head():
    face=path((347,444),[
        ((331,429),(343,379),(369,352)),((390,335),(397,332),(411,340)),
        ((438,360),(464,371),(491,363)),((517,377),(569,381),(595,373)),
        ((620,380),(677,401),(711,401)),((725,420),(738,442),(731,458)),
        ((723,492),(702,527),(691,593)),((609,620),(477,614),(376,586)),
        ((311,569),(272,539),(266,500)),((259,461),(303,434),(347,444))])
    volume("Painted_Cheek_Face",face,-.39,.13,.075,.26,"skin","head",None,True,5)
    for name,contour,bone,rearbox in [
        ("Floppy_Ear_R",path((331,181),[
            ((290,217),(222,220),(174,260)),((147,286),(170,329),(221,338)),
            ((266,345),(307,297),(343,246)),((353,222),(350,196),(331,181))]),"ear.R",(885,290,175,139)),
        ("Floppy_Ear_L",path((809,190),[
            ((875,207),(879,271),(936,311)),((993,346),(1057,359),(1069,407)),
            ((1072,451),(1000,460),(933,436)),((863,418),(825,348),(810,285)),
            ((802,250),(800,213),(809,190))]),"ear.L",(150,290,210,140))]:
        volume(name,contour,-.20,.04,.05,.08,"hair",bone,rearbox,cutouts=(ear_bow_outline(),) if bone=="ear.L" else ())
    bow=path((470,117),[
        ((493,91),(535,121),(561,148)),((578,160),(591,132),(618,138)),
        ((650,145),(675,135),(694,150)),((713,181),(676,225),(654,236)),
        ((617,244),(600,199),(576,190)),((554,178),(513,208),(486,204)),
        ((461,196),(454,140),(470,117))])
    volume("Head_Ribbon",bow,-.55,-.52,.018,.012,"yellow","head")
    side=path((838,254),[
        ((864,231),(895,257),(913,270)),((931,247),(955,212),(974,224)),
        ((1005,245),(1006,286),(981,303)),((954,326),(929,292),(916,294)),
        ((901,327),(879,341),(860,327)),((839,316),(824,272),(838,254))])
    volume("Ear_Ribbon_L",side,-.31,-.285,.015,.01,"yellow","ear.L")


def add_clothes():
    tee=path((430,641),[
        ((474,611),(579,621),(621,650)),((683,668),(733,713),(734,754)),
        ((708,774),(695,792),(701,822)),((630,864),(470,870),(414,817)),
        ((400,751),(397,687),(430,641))])
    volume("White_Tee",tee,-.08,.17,.15,.14,"white","spine",(500,632,230,110),True,cutouts=(apron_outline(),pouch_outline(),(499,607,587,686),(630,600,850,705)))
    apron=apron_outline()
    volume("Yellow_Apron",apron,-.29,-.13,.05,.03,"yellow","spine",cutouts=(chest_bow_outline(),pouch_outline()))
    rear_apron=path((385,818),[
        ((455,816),(652,817),(695,837)),((703,874),(716,909),(725,946)),
        ((630,975),(442,972),(350,944)),((355,907),(370,853),(385,818))])
    volume("Yellow_Back_Waist",rear_apron,.13,.24,.03,.04,"yellow","pelvis",(432,742,360,192),False)
    chest=path((451,687),[
        ((470,663),(505,688),(533,704)),((551,684),(590,678),(627,698)),
        ((640,720),(612,758),(603,783)),((567,785),(554,750),(530,735)),
        ((510,758),(478,770),(450,755)),((432,742),(437,702),(451,687))])
    volume("Chest_Ribbon",chest,-.385,-.36,.018,.012,"yellow","spine")
    bell=path((524,614),[
        ((559,607),(584,627),(580,655)),((574,682),(537,678),(517,663)),
        ((501,649),(507,623),(524,614))])
    volume("Collar_Bell",bell,-.35,-.24,.05,.03,"yellow","spine")
    shorts=path((367,951),[
        ((461,954),(601,954),(682,962)),((693,979),(697,1004),(690,1017)),
        ((632,1030),(587,1025),(559,1008)),((490,1018),(402,1016),(350,1000)),
        ((350,985),(358,967),(367,951))])
    volume("Pink_Shorts",shorts,-.08,.14,.14,.13,"pink","pelvis",(455,917,320,96))
    bag=path((607,829),[
        ((660,802),(723,816),(744,855)),((774,900),(743,952),(693,967)),
        ((650,986),(592,950),(573,914)),((546,886),(563,851),(607,829))])
    volume("Dog_Face_Pouch",bag,-.43,-.31,.09,.06,"hair","pelvis",(356,821,135,132))
    helpers.curve("Crossbody_Strap",[point((475,639),-.28),point((510,744),-.40),point((572,822),-.43),point((609,840),-.44)],.018,"brown","spine",False)
    helpers.curve("Back_Crossbody_Strap",[point((475,645),.25),point((536,736),.29),point((635,830),.28)],.018,"brown","spine",False)


def add_limbs():
    upper_r=path((422,662),[
        ((392,681),(370,716),(356,748)),((374,761),(401,776),(419,772)),
        ((436,737),(448,699),(450,676)),((444,665),(431,662),(422,662))])
    volume("Sleeve_R",upper_r,-.14,.04,.075,.06,"white","upper_arm.R",(687,682,82,95))
    fore_r=path((372,755),[
        ((388,769),(411,778),(412,799)),((390,822),(349,839),(321,826)),
        ((304,818),(301,788),(315,779)),((334,780),(357,771),(372,755))])
    volume("Forearm_R",fore_r,-.22,-.08,.065,.06,"skin","forearm.R",(759,760,70,100))
    hand_r=path((273,770),[
        ((287,747),(313,777),(309,793)),((325,809),(327,842),(310,847)),
        ((296,849),(274,837),(264,824)),((249,806),(248,784),(273,770))])
    volume("Hand_R",hand_r,-.33,-.17,.06,.045,"white","hand.R",(795,845,66,79))
    upper_l=path((662,682),[
        ((686,679),(726,697),(734,726)),((730,745),(708,762),(694,767)),
        ((681,740),(658,715),(662,682))])
    volume("Sleeve_L",upper_l,-.09,.05,.07,.055,"white","upper_arm.L",(450,674,90,95))
    fore_l=path((701,747),[
        ((719,765),(738,802),(752,831)),((750,848),(772,864),(782,871)),
        ((771,887),(754,892),(743,880)),((720,849),(700,814),(691,779)),
        ((693,763),(694,754),(701,747))])
    volume("Forearm_L",fore_l,-.13,.025,.06,.05,"skin","forearm.L",(399,758,74,100))
    hand_l=path((758,856),[
        ((783,848),(797,871),(811,879)),((827,880),(833,890),(818,899)),
        ((830,906),(810,914),(800,908)),((793,919),(781,905),(771,908)),
        ((748,901),(739,874),(758,856))])
    volume("Hand_L",hand_l,-.22,-.095,.045,.04,"white","hand.L",(385,845,69,77))
    for name,contour,bone,rearbox in [
        ("Stocking_R",path((381,1042),[
            ((407,1061),(488,1061),(528,1052)),((528,1126),(563,1207),(533,1258)),
            ((519,1286),(449,1285),(436,1263)),((422,1197),(391,1117),(381,1042))]),"shin.R",(634,1040,137,247)),
        ("Stocking_L",path((555,1044),[
            ((588,1059),(663,1061),(702,1046)),((707,1114),(753,1212),(729,1255)),
            ((714,1289),(659,1289),(643,1266)),((618,1205),(574,1116),(555,1044))]),"shin.L",(476,1040,147,247))]:
        volume(name,contour,0,.035,.13,.13,"brown",bone,rearbox,cutouts=((0,0,1199,1073),))
    for side,contour,rearbox in [
        ("R",path((372,1029),[
            ((383,1015),(396,1026),(401,1030)),((415,1023),(430,1024),(438,1034)),
            ((450,1021),(467,1025),(474,1035)),((487,1024),(500,1028),(508,1038)),
            ((521,1022),(536,1033),(536,1046)),((523,1079),(495,1080),(478,1062)),
            ((460,1080),(441,1080),(428,1065)),((411,1081),(386,1064),(372,1029))]),(633,1003,144,58)),
        ("L",path((551,1029),[
            ((564,1019),(576,1034),(587,1038)),((601,1028),(616,1030),(625,1041)),
            ((640,1026),(654,1031),(664,1042)),((679,1027),(694,1034),(701,1044)),
            ((714,1033),(724,1043),(719,1056)),((702,1084),(676,1076),(665,1067)),
            ((647,1084),(628,1080),(615,1066)),((596,1083),(566,1075),(551,1029))]),(471,1005,151,58))]:
        volume("Cream_Frill_"+side,contour,-.05,.07,.09,.08,"white","shin."+side,rearbox)


def add_tail_weapon():
    tail=path((570,995),[
        ((640,973),(690,950),(725,965)),((784,999),(891,987),(980,904)),
        ((1008,972),(991,1059),(917,1103)),((854,1142),(770,1110),(722,1073)),
        ((694,1044),(635,1008),(570,995))])
    volume("Center_Rooted_Tail",tail,.26,.46,.12,.16,"hair","tail",(715,956,285,165),cutouts=((0,0,715,1312),),rear_art="front")
    helpers.curve("Tail_Center_Stem",[point((570,995),.22),point((585,993),.26),point((600,991),.29)],.06,"hair","tail",False)
    # The wooden fork is genuine cylindrical geometry, attached to one wrist.
    joint=point((224,726),-.38);grip=point((313,862),-.38)
    tips=[point((137,641),-.38),point((224,604),-.38)]
    helpers.curve("Slingshot_Wood",[grip,point((273,798),-.38),joint],.034,"wood","slingshot.R",True)
    for i,tip in enumerate(tips):
        helpers.segment("Slingshot_Fork_"+str(i),joint,tip,.032,"wood","slingshot.R",True)
        axis=(tip-joint).normalized()
        helpers.segment("Golden_Fork_Wrap_"+str(i),tip-axis*.055,tip,.037,"yellow","slingshot.R",False)
    helpers.curve("Slingshot_Elastic",[tips[0],point((183,671),-.43),tips[1]],.009,"brown","slingshot.R",False)
    bow=path((211,730),[
        ((225,715),(246,732),(254,733)),((266,709),(281,719),(285,733)),
        ((296,759),(266,766),(253,751)),((232,776),(208,760),(211,730))])
    volume("Slingshot_Ribbon",bow,-.46,-.435,.012,.008,"yellow","slingshot.R")


def configure():
    global CAMERA
    bpy.ops.object.select_all(action="SELECT");bpy.ops.object.delete(use_global=False)
    bpy.context.preferences.filepaths.save_version=0
    scene=bpy.context.scene;scene.render.engine="BLENDER_EEVEE_NEXT";scene.eevee.taa_render_samples=16
    scene.render.resolution_x=scene.render.resolution_y=512;scene.render.resolution_percentage=100
    scene.render.film_transparent=True;scene.render.image_settings.file_format="PNG"
    scene.render.image_settings.color_mode="RGBA";scene.view_settings.view_transform="Standard";scene.view_settings.look="None"
    scene.world.use_nodes=True;scene.world.node_tree.nodes["Background"].inputs[1].default_value=.45
    for name,position,power in (("Soft key",(-3,-4,6),300),("Soft fill",(4,1,4),100)):
        data=bpy.data.lights.new(name,"AREA");data.energy=power;data.size=5
        light=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(light);light.location=position
        light.rotation_euler=(Vector((0,0,1.3))-light.location).to_track_quat("-Z","Y").to_euler()
    camera=bpy.data.cameras.new("Reference orthographic");camera.type="ORTHO";camera.ortho_scale=3.15
    CAMERA=bpy.data.objects.new("ReferenceCamera",camera);bpy.context.collection.objects.link(CAMERA);scene.camera=CAMERA
    for name,color in {"hair":(.86,.73,.65),"skin":(1,.93,.89),"white":(1,.98,.95),"yellow":(1,.85,.48),"pink":(.97,.72,.74),"brown":(.40,.26,.23),"wood":(.56,.34,.23),"ink":(.40,.25,.23)}.items():solid_material(name,color)
    MATERIALS["ink"].use_backface_culling=True
    image_material("front",FRONT);image_material("back",REAR)


def view(name):
    center=Vector((.14,0,1.31))
    positions={"front":(.14,-8,1.31),"left":(6,-6,3.5),"right":(-6,-6,3.5),"back":(.14,8,2.7),"game":(.14,-8,6.3),"side":(8,0,1.9)}
    CAMERA.location=positions[name];CAMERA.rotation_euler=(center-CAMERA.location).to_track_quat("-Z","Y").to_euler()


def save_blend():
    view("front");bpy.context.view_layer.objects.active=RIG;RIG.select_set(True)
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type=="VIEW_3D":
                space=area.spaces.active;space.overlay.show_overlays=False;space.shading.type="MATERIAL"
                space.region_3d.view_location=Vector((.14,0,1.31));space.region_3d.view_distance=5
                space.region_3d.view_rotation=CAMERA.rotation_euler.to_quaternion()
    notes=bpy.data.texts.new("START HERE - approved reference model")
    notes.write("Actual closed 3D volumes with conforming artwork UVs.\nApproved face is not redrawn; artwork textures are packed in this file.\nRight wrist owns slingshot.R. Hair, ears, clothing, hands and legs are separately bound.\nThis is an appearance/rig study, not a final animation set or live game replacement.\nRegenerate: blender -b --factory-startup --python tools/build_butter_reference.py\n")
    bpy.ops.wm.save_as_mainfile(filepath=str(MODEL),compress=True)


def export_glb():
    bpy.ops.object.select_all(action="DESELECT");RIG.select_set(True)
    for obj in PARTS+helpers.PARTS:obj.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(GLB),export_format="GLB",use_selection=True,export_animations=False,export_apply=False)
    # Projected paint is deliberately unlit in both Blender and the browser.
    # The exporter sees an emission texture; normalize it to glTF's standard
    # unlit base-color texture, retaining its alpha cutout and exact colors.
    raw=GLB.read_bytes();length,kind=struct.unpack_from("<II",raw,12)
    document=json.loads(raw[20:20+length]);used=set(document.get("extensionsUsed",[]))
    for material in document.get("materials",[]):
        if not material.get("name","").startswith("Art_"):continue
        texture=material.get("emissiveTexture")
        if texture:
            pbr=material.setdefault("pbrMetallicRoughness",{});pbr["baseColorTexture"]=texture;pbr["baseColorFactor"]=[1,1,1,1]
            material.pop("emissiveTexture",None);material["emissiveFactor"]=[0,0,0]
            material.setdefault("extensions",{})["KHR_materials_unlit"]={};used.add("KHR_materials_unlit")
            material["alphaMode"]="MASK";material["alphaCutoff"]=.12;material["doubleSided"]=False
    document["extensionsUsed"]=sorted(used)
    encoded=json.dumps(document,separators=(",",":")).encode();encoded+=b" "*((-len(encoded))%4)
    remaining=raw[20+length:]
    GLB.write_bytes(struct.pack("<4sII",b"glTF",2,20+len(encoded)+len(remaining))+struct.pack("<II",len(encoded),kind)+encoded+remaining)


def main():
    parser=argparse.ArgumentParser();parser.add_argument("--quick",action="store_true");parser.add_argument("--no-render",action="store_true")
    args=parser.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else [])
    OUT.mkdir(parents=True,exist_ok=True);configure();create_rig();add_hair();add_head();add_clothes();add_limbs();add_tail_weapon()
    save_blend();export_glb()
    if not args.no_render:
        for name in (("front","left") if args.quick else ("front","left","right","back","game","side")):
            view(name);bpy.context.scene.render.filepath=str(OUT/(name+".png"));bpy.ops.render.render(write_still=True)
    manifest={"source":"../butter-2d-study.png","sourceSHA256":hashlib.sha256(FRONT.read_bytes()).hexdigest(),"backReference":"back-art.png","model":"../models/butter-reference29.blend","glb":"../models/butter-reference29.glb","stage":"appearance-study-not-game-replacement","animations":False,"bones":len(RIG.data.bones),"volumes":[{"name":o.name,"depth":o.get("depth")} for o in PARTS if o.get("closed_volume")],"paintedSurfaces":[o.name for o in PARTS if o.name.endswith(("_Paint","_BackPaint","_SidePaint"))],"views":["front","left","right","back","game","side"]}
    (OUT/"model.json").write_text(json.dumps(manifest,indent=2)+"\n")
    print("BUTTER_REFERENCE_MODEL_COMPLETE",flush=True)


if __name__=="__main__":main()
