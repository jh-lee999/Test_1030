"""Adapt an actual CC0 character base; never inflate or layer artwork meshes.

The approved picture supplies facial ink only, baked into the base head's own
UV atlas. All hair and clothing are modeled three-dimensional surfaces.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import math
import sys
from pathlib import Path

import bmesh
import bpy
from mathutils import Matrix,Vector

sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/"assets/vendor/kaykit-base30/Barbarian.glb"
ART=ROOT/"assets/butter-2d-study.png"
OUT=ROOT/"assets/butter-base30"
MODEL=ROOT/"assets/models/butter-base30.blend"
GLB=MODEL.with_suffix(".glb")
RIG=None
PARTS=[]
MATS={}
CAMERA=None


def rgb(c):return tuple(v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in c)


def material(name,color):
    m=bpy.data.materials.new("Butter_"+name);m.use_nodes=True
    m.diffuse_color=(*rgb(color),1)
    shader=m.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value=(*rgb(color),1)
    shader.inputs["Roughness"].default_value=.9
    shader.inputs["Specular IOR Level"].default_value=.12
    MATS[name]=m
    return m


def groups(mesh):
    adj=[set() for _ in mesh.vertices]
    for edge in mesh.edges:
        a,b=edge.vertices;adj[a].add(b);adj[b].add(a)
    unseen=set(range(len(adj)));result=[]
    while unseen:
        start=next(iter(unseen));unseen.remove(start);queue=[start];part=[]
        while queue:
            vertex=queue.pop();part.append(vertex)
            for neighbor in adj[vertex]:
                if neighbor in unseen:unseen.remove(neighbor);queue.append(neighbor)
        result.append(part)
    return sorted(result,key=len,reverse=True)


def retain(obj,keep):
    bm=bmesh.new();bm.from_mesh(obj.data);bm.verts.ensure_lookup_table()
    bmesh.ops.delete(bm,geom=[v for v in bm.verts if v.index not in keep],context="VERTS")
    bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.00001)
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
    bm.to_mesh(obj.data);bm.free();obj.data.update()


def zshape(z):
    if z<.55:return z*1.35
    if z<1.25:return .7425+(z-.55)*.88
    return 1.3585+z-1.25


def proportion(p,part=""):
    x,y,z=p
    if "Arm" in part or any(k in part.lower() for k in ("arm.","wrist.","hand.","handslot.","handik.","elbowik.")):
        sign=-1 if x<0 else 1
        x=sign*.212+(x-sign*.212)*.70;y*=.82
    if "Leg" in part or any(k in part for k in ("upperleg","lowerleg","foot","toes","kneeIK","heel","toe-roll","foot-roll")):
        y*=.74
    return Vector((x,y,zshape(z)))


def install_base():
    global RIG
    bpy.ops.object.select_all(action="SELECT");bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=str(SOURCE))
    RIG=next(o for o in bpy.data.objects if o.type=="ARMATURE")
    keep_names={"Barbarian_Head","Barbarian_Body","Barbarian_ArmLeft","Barbarian_ArmRight","Barbarian_LegLeft","Barbarian_LegRight"}
    for obj in list(bpy.data.objects):
        if obj!=RIG and obj.name not in keep_names:bpy.data.objects.remove(obj,do_unlink=True)
    assert all(abs(RIG.matrix_world[i][j]-(1 if i==j else 0))<.0001 for i in range(4) for j in range(4))
    meshes=[bpy.data.objects[n] for n in sorted(keep_names)]
    for obj in meshes:
        components=groups(obj.data)
        if obj.name.endswith("Head"):
            # The original head is one skin shell plus separate beard, eyes,
            # nose and ears. Keep the author's skin topology, not the props.
            chosen=set(components[0])
        elif obj.name.endswith("Body"):
            chosen={i for part in components if max((obj.matrix_world@obj.data.vertices[v].co).z for v in part)>.9 for i in part}
        else:chosen=set(range(len(obj.data.vertices)))
        retain(obj,chosen)
        inverse=obj.matrix_world.inverted()
        for v in obj.data.vertices:
            p=proportion(obj.matrix_world@v.co,obj.name)
            if obj.name.endswith("Head"):
                p.x*=1.20;p.y*=.93;p.z=1.80+(p.z-1.80)*.90
            v.co=inverse@p
        obj.data.update()
        obj["base_source"]="KayKit CC0 Adventurers / Barbarian"
        obj["base_original_mesh"]=obj.name
        obj["base_topology_not_art_projection"]=True
    bpy.context.view_layer.objects.active=RIG;RIG.select_set(True);bpy.ops.object.mode_set(mode="EDIT")
    for bone in RIG.data.edit_bones:
        a,b=proportion(bone.head,bone.name),proportion(bone.tail,bone.name)
        bone.head=a;bone.tail=b
    bpy.ops.object.mode_set(mode="OBJECT")
    if RIG.animation_data:
        for track in RIG.animation_data.nla_tracks:track.mute=True
    RIG.animation_data_create();RIG.animation_data.action=bpy.data.actions["Idle_Rig"]
    bpy.context.scene.frame_set(1);bpy.context.view_layer.update()
    deps=bpy.context.evaluated_depsgraph_get()
    for obj in meshes:
        baked=bpy.data.meshes.new_from_object(obj.evaluated_get(deps),preserve_all_data_layers=True,depsgraph=deps)
        assert any(len(v.groups) for v in baked.vertices),"Source skin weights must survive pose baking"
        obj.data=baked
        for mod in list(obj.modifiers):
            if mod.type=="ARMATURE":obj.modifiers.remove(mod)
    bpy.context.view_layer.objects.active=RIG;bpy.ops.object.mode_set(mode="POSE")
    bpy.ops.pose.armature_apply(selected=False);bpy.ops.object.mode_set(mode="OBJECT")
    RIG.animation_data_clear()
    for bone in RIG.pose.bones:bone.matrix_basis=Matrix.Identity(4)
    for action in list(bpy.data.actions):bpy.data.actions.remove(action)
    for obj in meshes:
        arm=obj.modifiers.new("KayKit skin","ARMATURE");arm.object=RIG
        for face in obj.data.polygons:face.use_smooth=True
        sub=obj.modifiers.new("Smooth base topology","SUBSURF");sub.levels=sub.render_levels=2
        bpy.context.view_layer.objects.active=obj;obj.select_set(True)
        bpy.ops.object.modifier_apply(modifier=sub.name);obj.select_set(False)
        if "Head" in obj.name:
            # Re-form the base's boxy head into a closed cheek silhouette.
            # A convex hull removes its recessed beard/neck attachment faces;
            # those would overlap a spherical atlas at the chin.
            positions=[v.co.copy() for v in obj.data.vertices]
            center=Vector(tuple((min(p[i] for p in positions)+max(p[i] for p in positions))/2 for i in range(3)))
            radii=Vector(tuple(max(abs(p[i]-center[i]) for p in positions) for i in range(3)))
            bm=bmesh.new()
            for p in positions:
                direction=Vector(tuple((p[i]-center[i])/radii[i] for i in range(3))).normalized()
                bm.verts.new((direction.x*.575,direction.y*.405,1.87+direction.z*.485))
            hull=bmesh.ops.convex_hull(bm,input=list(bm.verts),use_existing_faces=False)
            bmesh.ops.delete(bm,geom=hull["geom_interior"],context="VERTS")
            bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
            rebuilt=bpy.data.meshes.new("Base head - rounded closed retopology");bm.to_mesh(rebuilt);bm.free();obj.data=rebuilt
            obj.vertex_groups.clear();group=obj.vertex_groups.new(name="head")
            group.add(list(range(len(obj.data.vertices))),1,"REPLACE")
            for face in obj.data.polygons:face.use_smooth=True
            obj["head_remodeled"]=True
        obj.data.materials.clear()
        if "Head" in obj.name:obj.data.materials.append(MATS["skin"])
        elif "Body" in obj.name:obj.data.materials.append(MATS["white"])
        elif "Arm" in obj.name:
            obj.data.materials.append(MATS["skin"]);obj.data.materials.append(MATS["white"])
            for face in obj.data.polygons:
                influence={}
                for vi in face.vertices:
                    for g in obj.data.vertices[vi].groups:
                        name=obj.vertex_groups[g.group].name;influence[name]=influence.get(name,0)+g.weight/len(face.vertices)
                white=sum(w for n,w in influence.items() if n.startswith(("upperarm.","hand.","wrist.")))
                face.material_index=1 if white>.55 else 0
        else:obj.data.materials.append(MATS["brown"])
        obj.name="Base_"+obj.name.removeprefix("Barbarian_")
        PARTS.append(obj)
    RIG.name="Butter_Base_Rig";RIG["source"]="Kay Lousberg / KayKit Adventurers (CC0)"
    RIG["holding_hand"]="hand.r";RIG["drawing_hand"]="hand.l"
    RIG["stage"]="base-mesh appearance study; not live game or final animation"
    add_custom_bones()
    return bpy.data.objects["Base_Head"]


def add_custom_bones():
    bpy.context.view_layer.objects.active=RIG;RIG.select_set(True);bpy.ops.object.mode_set(mode="EDIT")
    for name,head,tail,parent in [
        ("ButterHair",(0,.12,2.12),(0,.25,1.40),"head"),
        ("ButterEar.R",(-.49,0,2.16),(-.74,-.01,1.96),"head"),
        ("ButterEar.L",(.49,0,2.16),(.74,-.01,1.96),"head"),
        ("ButterTail",(0,.24,.70),(.40,.45,.72),"hips")]:
        bone=RIG.data.edit_bones.new(name);bone.head=head;bone.tail=tail;bone.parent=RIG.data.edit_bones[parent]
    hand=RIG.data.edit_bones["hand.r"]
    bone=RIG.data.edit_bones.new("ButterSlingshot.R");bone.head=hand.head;bone.tail=hand.head+Vector((0,0,.20));bone.parent=hand
    bpy.ops.object.mode_set(mode="OBJECT");RIG.select_set(False)


def finish(obj,name,mat,bone,weights=None):
    obj.name=name
    bpy.context.view_layer.objects.active=obj;obj.select_set(True)
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    obj.data.materials.append(MATS[mat]);obj.parent=RIG
    if weights:
        for group_name in weights:obj.vertex_groups.new(name=group_name)
        for v in obj.data.vertices:
            values=weights(v.co)
            for group_name,w in values.items():obj.vertex_groups[group_name].add([v.index],w,"REPLACE")
    else:
        group=obj.vertex_groups.new(name=bone);group.add(list(range(len(obj.data.vertices))),1,"REPLACE")
    arm=obj.modifiers.new("Butter skin","ARMATURE");arm.object=RIG
    for face in obj.data.polygons:face.use_smooth=True
    obj["construction"]="native_3d_surface_no_artwork_layer"
    PARTS.append(obj);obj.select_set(False)
    return obj


def mesh(name,vertices,faces,mat,bone):
    data=bpy.data.meshes.new(name);data.from_pydata(vertices,[],faces);data.update()
    obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj)
    return finish(obj,name,mat,bone)


def ball(name,center,size,mat,bone):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32,ring_count=20,location=center)
    obj=bpy.context.object;obj.scale=size
    return finish(obj,name,mat,bone)


def tube(name,points,radius,mat,bone):
    data=bpy.data.curves.new(name,"CURVE");data.dimensions="3D";data.bevel_depth=radius;data.bevel_resolution=3
    spline=data.splines.new("BEZIER");spline.bezier_points.add(len(points)-1)
    for p,co in zip(spline.bezier_points,points):p.co=co;p.handle_left_type=p.handle_right_type="AUTO"
    obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj)
    bpy.context.view_layer.objects.active=obj;obj.select_set(True);bpy.ops.object.convert(target="MESH")
    return finish(bpy.context.object,name,mat,bone)


def bezier(points,t):
    a,b,c,d=[Vector(p) for p in points];s=1-t
    return a*s**3+3*b*s*s*t+3*c*s*t*t+d*t**3


def strand(name,points,width,depth,bone="ButterHair",round_end=False):
    vertices=[];faces=[];rings=34;sides=14
    for i in range(rings):
        t=i/(rings-1);center=bezier(points,t)
        tangent=(bezier(points,min(1,t+.005))-bezier(points,max(0,t-.005))).normalized()
        normal=Vector((0,-1,0));normal=(normal-tangent*normal.dot(tangent)).normalized()
        across=tangent.cross(normal).normalized()
        # An actual swept oval cross-section, not a cutout silhouette.
        taper=(.40+.60*math.sin(t*math.pi*.93))*(1-t)**(.42 if round_end else .68)
        taper=max(.025 if round_end else .008,taper)
        for j in range(sides):
            a=math.tau*j/sides
            vertices.append(center+across*math.cos(a)*width*taper+normal*math.sin(a)*depth*taper)
    for i in range(rings-1):
        for j in range(sides):k=(j+1)%sides;faces.append((i*sides+j,i*sides+k,(i+1)*sides+k,(i+1)*sides+j))
    faces.append(tuple(reversed(range(sides))));faces.append(tuple((rings-1)*sides+j for j in range(sides)))
    obj=mesh(name,vertices,[tuple(reversed(face)) for face in faces],"hair",bone)
    return obj


def face_mask(px,py):
    # Copy eyes, eyebrows, mouth and cheek ink only. Copying the whole drawn
    # face also transfers its jaw outline and creates a false horizontal chin.
    strength=0
    for x,y,rx,ry in ((426,430,68,79),(622,463,71,77),(510,533,52,45),(330,510,60,45),(641,550,58,40)):
        distance=math.sqrt(((px-x)/rx)**2+((py-y)/ry)**2)
        strength=max(strength,max(0,min(1,(1-distance)/.12)))
    return strength


def bake_face(head):
    scene=bpy.context.scene
    while head.data.uv_layers:head.data.uv_layers.remove(head.data.uv_layers[0])
    atlas_uv=head.data.uv_layers.new(name="HeadAtlasUV");projection=head.data.uv_layers.new(name="InkProjectionForBakeOnly")
    attr=head.data.attributes.new("FACE_INK_MASK","FLOAT","POINT")
    bounds=[head.matrix_world@v.co for v in head.data.vertices]
    cx=(min(v.x for v in bounds)+max(v.x for v in bounds))/2
    cy=(min(v.y for v in bounds)+max(v.y for v in bounds))/2
    cz=(min(v.z for v in bounds)+max(v.z for v in bounds))/2
    for v,p in zip(head.data.vertices,bounds):
        px=500+(p.x-cx)*460/1.25;py=470-(p.z-1.90)*260/.75
        facing=max(0,min(1,(-v.normal.y-.08)/.45))
        attr.data[v.index].value=face_mask(px,py)*facing
    for face in head.data.polygons:
        values=[]
        for li in face.loop_indices:
            p=bounds[head.data.loops[li].vertex_index]
            u=.5+math.atan2(p.x-cx,-(p.y-cy))/math.tau
            v=.5+math.atan2(p.z-cz,math.hypot(p.x-cx,p.y-cy))/math.pi
            values.append([li,u,v,p])
        seam=max(a[1]for a in values)-min(a[1]for a in values)>.5
        for li,u,v,p in values:
            if seam and u<.5:u+=1
            atlas_uv.data[li].uv=(u,v)
            projection.data[li].uv=((500+(p.x-cx)*460/1.25)/1199,1-(470-(p.z-1.90)*260/.75)/1312)
    atlas=bpy.data.images.new("Butter_Face_Atlas30",width=2048,height=2048,alpha=False)
    atlas.generated_color=(*rgb((1,.95,.92)),1)
    src=bpy.data.images.load(str(ART),check_existing=True)
    m=bpy.data.materials.new("FaceBakeTemporary");m.use_nodes=True;n=m.node_tree.nodes;n.clear();links=m.node_tree.links
    out=n.new("ShaderNodeOutputMaterial");emit=n.new("ShaderNodeEmission");mix=n.new("ShaderNodeMixRGB")
    mix.inputs[1].default_value=(*rgb((1,.95,.92)),1)
    tex=n.new("ShaderNodeTexImage");tex.image=src
    uv=n.new("ShaderNodeUVMap");uv.uv_map=projection.name;links.new(uv.outputs[0],tex.inputs[0])
    mask=n.new("ShaderNodeAttribute");mask.attribute_name="FACE_INK_MASK"
    links.new(mask.outputs["Fac"],mix.inputs[0]);links.new(tex.outputs["Color"],mix.inputs[2]);links.new(mix.outputs[0],emit.inputs[0]);links.new(emit.outputs[0],out.inputs[0])
    target=n.new("ShaderNodeTexImage");target.image=atlas;n.active=target
    head.data.materials.clear();head.data.materials.append(m)
    head.data.uv_layers.active=atlas_uv;atlas_uv.active_render=True
    bpy.ops.object.select_all(action="DESELECT");head.select_set(True);bpy.context.view_layer.objects.active=head
    scene.render.engine="CYCLES";scene.cycles.device="CPU";scene.cycles.samples=1;scene.render.bake.margin=16
    bpy.ops.object.bake(type="EMIT")
    atlas.filepath_raw=str(OUT/"face-atlas.png");atlas.file_format="PNG";atlas.save();atlas.pack()
    final=material("FaceAtlas",(1,.95,.92));nodes=final.node_tree.nodes;bsdf=nodes.get("Principled BSDF")
    painted=nodes.new("ShaderNodeTexImage");painted.image=atlas
    final.node_tree.links.new(painted.outputs["Color"],bsdf.inputs["Base Color"])
    # Keep the cream face readable under a top-view game's lighting rather
    # than producing a dark, beard-like shadow across the lower cheeks.
    final.node_tree.links.new(painted.outputs["Color"],bsdf.inputs["Emission Color"])
    bsdf.inputs["Emission Strength"].default_value=.30
    head.data.materials.clear();head.data.materials.append(final)
    head.data.uv_layers.remove(projection);head.data.uv_layers.active=atlas_uv;atlas_uv.active_render=True
    bpy.data.materials.remove(m)
    scene.render.engine="BLENDER_EEVEE_NEXT";head.select_set(False)
    head["facial_ink_baked_to_base_uv"]=True


def add_hair():
    vertices=[];faces=[];rings=20;segments=64
    for i in range(rings+1):
        theta=.03+2.38*i/rings
        for j in range(segments):
            phi=math.tau*j/segments
            vertices.append((.625*math.sin(theta)*math.cos(phi),.46*math.sin(theta)*math.sin(phi)+.015,1.87+.555*math.cos(theta)))
    for i in range(rings):
        for j in range(segments):
            k=(j+1)%segments;inds=(i*segments+j,i*segments+k,(i+1)*segments+k,(i+1)*segments+j)
            center=sum((Vector(vertices[v])for v in inds),Vector())/4
            if center.y<-.10 and center.z<2.06:continue
            faces.append(inds)
    cap=mesh("Hair_Scalp",vertices,[tuple(reversed(face)) for face in faces],"hair","head")
    solid=cap.modifiers.new("Scalp thickness","SOLIDIFY");solid.thickness=.025
    for side,s in (("R",-1),("L",1)):
        strand("Front_Side_Hair_"+side,[(s*.46,-.04,2.17),(s*.61,-.24,1.80),(s*.63,-.12,1.20),(s*.50,-.08,.91)],.21,.105)
        strand("Outer_Side_Hair_"+side,[(s*.43,.18,2.20),(s*.69,.22,1.70),(s*.78,.12,1.04),(s*.91,.07,1.06)],.245,.115)
        strand("Rear_Side_Hair_"+side,[(s*.31,.35,2.15),(s*.53,.53,1.55),(s*.58,.43,1.01),(s*.76,.28,.96)],.26,.13)
        strand("Floppy_Dog_Ear_"+side,[(s*.48,-.005,2.21),(s*.64,-.05,2.18),(s*.83,-.09,2.02),(s*.76,-.10,1.94)],.18,.075,"ButterEar."+side,True)
    for i,x in enumerate((-.24,0,.25)):
        strand("Back_Hair_Lock_"+str(i),[(x,.37,2.18),(x*1.35,.60,1.65),(x*1.65+.06,.52,1.03),(x*1.85+.12,.35,.83)],.255,.14)
    for name,points,width in [
        ("Bang_R",[(-.20,-.30,2.30),(-.39,-.45,2.25),(-.39,-.50,2.02),(-.25,-.49,1.99)],.22),
        ("Bang_Center",[(.00,-.29,2.31),(.07,-.50,2.25),(-.025,-.53,2.04),(.14,-.50,1.99)],.215),
        ("Bang_L",[(.25,-.25,2.28),(.43,-.43,2.18),(.34,-.48,2.02),(.48,-.43,2.01)],.20)]:
        strand(name,points,width,.075,"head")
    strand("Ahoge",[(0,.0,2.33),(-.04,-.015,2.49),(.13,-.02,2.60),(.24,-.025,2.51)],.067,.038,"head")
    # Merge the crown and long locks into one continuous haircut. Separate
    # oval locks read as dangling tubes at gameplay scale.
    hair=[o for o in PARTS if o.name=="Hair_Scalp" or o.name.startswith(("Front_Side_Hair_","Outer_Side_Hair_","Rear_Side_Hair_","Back_Hair_Lock_","Bang_"))]
    bpy.ops.object.select_all(action="DESELECT")
    for obj in hair:
        for mod in list(obj.modifiers):
            if mod.type=="ARMATURE":obj.modifiers.remove(mod)
            else:
                bpy.context.view_layer.objects.active=obj;bpy.ops.object.modifier_apply(modifier=mod.name)
        obj.select_set(True);PARTS.remove(obj)
    bpy.context.view_layer.objects.active=cap;bpy.ops.object.join()
    cap.name="Hair_Continuous_Silhouette";cap.data.remesh_voxel_size=.014
    bpy.ops.object.voxel_remesh()
    smooth=cap.modifiers.new("Soft hair joins","SMOOTH");smooth.factor=.75;smooth.iterations=5
    bpy.ops.object.modifier_apply(modifier=smooth.name)
    cap.vertex_groups.clear();group=cap.vertex_groups.new(name="head");group.add(list(range(len(cap.data.vertices))),1,"REPLACE")
    for face in cap.data.polygons:face.use_smooth=True
    arm=cap.modifiers.new("Butter hair skin","ARMATURE");arm.object=RIG
    PARTS.append(cap);cap.select_set(False)


def ribbon(name,center,size,bone):
    x,y,z=center
    for sign in (-1,1):
        verts=[(x,y,z),(x+sign*size*.95,y+.012,z+size*.43),(x+sign*size*1.10,y+.008,z-size*.33),(x+sign*size*.55,y-.027,z+size*.02)]
        faces=[(0,1,3),(1,2,3),(2,0,3)]
        faces=[tuple(reversed(f)) if (Vector(verts[f[1]])-Vector(verts[f[0]])).cross(Vector(verts[f[2]])-Vector(verts[f[0]])).y>0 else f for f in faces]
        obj=mesh(name+str(sign),verts,faces,"yellow",bone)
        solid=obj.modifiers.new("Thin fabric","SOLIDIFY");solid.thickness=.008
        bevel=obj.modifiers.new("Ribbon edge","BEVEL");bevel.width=.007;bevel.segments=2
    ball(name+" knot",center,(size*.20,.020,size*.25),"gold",bone)


def shell(name,cx,cy,z0,z1,rx0,rx1,ry0,ry1,mat,bone,arc=math.tau):
    vertices=[];faces=[];steps=36;rows=8
    for i in range(rows+1):
        t=i/rows;z=z0+(z1-z0)*t
        for j in range(steps+1):
            a=-math.pi/2-arc/2+arc*j/steps
            vertices.append((cx+(rx0+(rx1-rx0)*t)*math.cos(a),cy+(ry0+(ry1-ry0)*t)*math.sin(a),z))
    for i in range(rows):
        for j in range(steps):
            a=i*(steps+1)+j;faces.append((a,a+1,a+steps+2,a+steps+1))
    obj=mesh(name,vertices,faces,mat,bone);solid=obj.modifiers.new("Cloth thickness","SOLIDIFY");solid.thickness=.014
    bevel=obj.modifiers.new("Cloth hem","BEVEL");bevel.width=.008;bevel.segments=2
    return obj


def clothing():
    shell("Shirt_Lower",0,0,.82,.96,.30,.345,.235,.29,"white","spine")
    shell("Apron_Skirt",0,-.025,.77,1.06,.43,.32,.325,.285,"yellow","spine",math.pi*1.02)
    shell("Apron_Bib",0,-.035,1.02,1.28,.225,.19,.285,.275,"yellow","chest",math.pi*.62)
    for side,s in (("r",-1),("l",1)):
        shell("Pink_Shorts_"+side,s*.17,0,.58,.81,.155,.17,.175,.20,"pink","upperleg."+side)
        vertices=[];faces=[];n=80
        for row in range(3):
            for i in range(n):
                a=math.tau*i/n
                z=.615-row*.022-(.012*(1-math.cos(a*10)) if row==2 else 0)
                vertices.append((s*.17+.160*math.cos(a),.18*math.sin(a),z))
        for row in range(2):
            for i in range(n):j=(i+1)%n;faces.append((row*n+i,row*n+j,(row+1)*n+j,(row+1)*n+i))
        frill=mesh("Cream_Frill_"+side,vertices,[tuple(reversed(face)) for face in faces],"white","upperleg."+side)
        solid=frill.modifiers.new("Frill fabric","SOLIDIFY");solid.thickness=.008
        tube("Apron_Strap_"+side,[(s*.135,-.28,1.30),(s*.15,-.315,1.17),(s*.14,-.315,1.03)],.018,"gold","chest")
        tube("Back_Strap_"+side,[(s*.14,.22,1.30),(s*.13,.29,1.15),(-s*.12,.29,.96)],.018,"yellow","chest")
    ribbon("Chest_Bow",(0,-.335,1.16),.12,"chest")
    ribbon("Head_Bow",(0,-.265,2.34),.16,"head")
    for side,s in (("R",-1),("L",1)):ribbon("Ear_Bow_"+side,(s*.57,-.145,2.21),.095,"ButterEar."+side)
    ribbon("Back_Waist_Bow",(0,.315,.94),.115,"hips")
    ball("Collar_Bell",(0,-.265,1.315),(.044,.022,.044),"gold","chest")
    tube("Bell_Slit",[(0,-.291,1.325),(0,-.291,1.298)],.004,"brown","chest")
    for obj in [o for o in PARTS if o.name.startswith("Base_Leg")]:
        bm=bmesh.new();bm.from_mesh(obj.data)
        for z in (.08,.18,.28,.38,.48,.58,.62):
            bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),plane_co=(0,0,z),plane_no=(0,0,1),clear_inner=False,clear_outer=False,dist=.00001)
        bm.to_mesh(obj.data);bm.free();obj.data.update()
        obj.data.materials.clear()
        for name in ("brown","stripe","pink","white"):obj.data.materials.append(MATS[name])
        for face in obj.data.polygons:
            z=sum(obj.data.vertices[i].co.z for i in face.vertices)/len(face.vertices)
            face.material_index=2 if z<.08 else 3 if z>.62 else int((z-.08)/.10)%2
            face.use_smooth=True
    # Accessories have actual depth and are attached to native rig bones.
    tube("Pouch_Strap",[(-.13,-.27,1.30),(0,-.345,1.12),(.24,-.32,.87)],.012,"brown","spine")
    ball("Dog_Pouch",(.27,-.35,.85),(.132,.063,.118),"hair","hips")
    for s in (-1,1):
        ball("Pouch_Ear"+str(s),(.27+s*.097,-.37,.91),(.045,.025,.057),"brown","hips")
        ball("Pouch_Eye"+str(s),(.27+s*.04,-.414,.86),(.009,.006,.014),"brown","hips")
    ball("Pouch_Nose",(.27,-.417,.825),(.013,.006,.010),"brown","hips")
    strand("Fluffy_Central_Tail",[(0,.24,.69),(.08,.50,.67),(.43,.57,.63),(.62,.40,.88)],.22,.14,"ButterTail")
    hand=RIG.data.bones["hand.r"].head_local
    h=Vector((hand.x,hand.y-.055,hand.z+.035));joint=h+Vector((0,0,.11));tips=[joint+Vector((s*.09,0,.16))for s in (-1,1)]
    tube("Slingshot_Handle",[h-Vector((0,0,.07)),h,joint],.023,"wood","ButterSlingshot.R")
    for i,tip in enumerate(tips):
        tube("Slingshot_Fork"+str(i),[joint,tip],.023,"wood","ButterSlingshot.R")
        ball("Slingshot_Cap"+str(i),tip,(.028,.027,.027),"gold","ButterSlingshot.R")
    tube("Slingshot_Band",[tips[0],(tips[0]+tips[1])*.5+Vector((0,-.018,-.02)),tips[1]],.006,"brown","ButterSlingshot.R")
    ribbon("Slingshot_Bow",(h.x,h.y-.03,h.z+.045),.05,"ButterSlingshot.R")


def setup():
    global CAMERA
    scene=bpy.context.scene;scene.render.engine="BLENDER_EEVEE_NEXT";scene.eevee.taa_render_samples=64
    scene.render.resolution_x=scene.render.resolution_y=512;scene.render.resolution_percentage=100
    scene.render.film_transparent=True;scene.render.image_settings.file_format="PNG";scene.render.image_settings.color_mode="RGBA"
    scene.view_settings.view_transform="Standard";scene.view_settings.look="None"
    scene.world.use_nodes=True;scene.world.node_tree.nodes["Background"].inputs[1].default_value=.4
    for name,position,energy in (("Large key",(-3,-4,6),350),("Soft fill",(4,-1,3.5),150),("Rim",(0,4,5),250),("Face fill",(0,-4,2),100)):
        data=bpy.data.lights.new(name,"AREA");data.energy=energy;data.size=5
        if name=="Face fill":data.use_shadow=False
        obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj);obj.location=position
        obj.rotation_euler=(Vector((0,0,1.35))-obj.location).to_track_quat("-Z","Y").to_euler()
    data=bpy.data.cameras.new("Butter camera");data.type="ORTHO";data.ortho_scale=3.2
    CAMERA=bpy.data.objects.new("Butter camera",data);bpy.context.collection.objects.link(CAMERA);scene.camera=CAMERA


def view(name):
    positions={"front":(0,-8,1.35),"left":(6,-6,3.5),"right":(-6,-6,3.5),"back":(0,8,2.7),"side":(8,0,1.9),"game":(0,-8,6.2)}
    CAMERA.location=positions[name];CAMERA.rotation_euler=(Vector((0,0,1.35))-CAMERA.location).to_track_quat("-Z","Y").to_euler()


def main():
    parser=argparse.ArgumentParser();parser.add_argument("--quick",action="store_true")
    args=parser.parse_args(sys.argv[sys.argv.index("--")+1:]if"--"in sys.argv else[])
    OUT.mkdir(parents=True,exist_ok=True);bpy.context.preferences.filepaths.save_version=0
    for name,c in {"skin":(1,.95,.92),"white":(1,.985,.96),"hair":(.80,.69,.62),"yellow":(1,.85,.48),"gold":(.88,.61,.28),"pink":(.96,.72,.75),"brown":(.40,.27,.25),"wood":(.49,.30,.20),"stripe":(.98,.83,.48)}.items():material(name,c)
    head=install_base();bake_face(head);add_hair();clothing();setup();view("front")
    for image in bpy.data.images:
        if image.name.startswith("Butter_Face_Atlas30"):image.pack()
    for unused_mat in list(bpy.data.materials):
        if unused_mat.users==0:bpy.data.materials.remove(unused_mat)
    for image in list(bpy.data.images):
        if image.users==0:bpy.data.images.remove(image)
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type=="VIEW_3D":
                space=area.spaces.active;space.overlay.show_overlays=False;space.shading.type="MATERIAL"
                space.region_3d.view_location=Vector((0,0,1.35));space.region_3d.view_distance=5;space.region_3d.view_rotation=CAMERA.rotation_euler.to_quaternion()
    notes=bpy.data.texts.new("START HERE - CC0 base rebuild")
    notes.write("Derived from Kay Lousberg / KayKit Adventurers Barbarian, CC0. See assets/vendor/kaykit-base30/LICENSE.txt.\nThe base head and limb topology/weights are adapted, not image-derived volumes.\nFacial ink is baked into the head's own UV atlas. Hair, outfit and props use no artwork planes.\nAppearance/rig review only. No live game change and no finished animation set.\nBuild: blender -b --factory-startup --python tools/build_butter_base30.py\n")
    bpy.ops.wm.save_as_mainfile(filepath=str(MODEL),compress=True)
    bpy.ops.object.select_all(action="DESELECT");RIG.select_set(True)
    for obj in PARTS:obj.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(GLB),export_format="GLB",use_selection=True,export_animations=False,export_apply=False)
    for name in (("front","left")if args.quick else("front","left","right","back","side","game")):
        view(name);bpy.context.scene.render.filepath=str(OUT/(name+".png"));bpy.ops.render.render(write_still=True)
    manifest={"stage":"appearance-review-not-live-game","source":"KayKit Adventurers Character Pack, Kay Lousberg, CC0","sourceCommit":"672074b73ba276876a19e8816ecdc5241817ab47","baseSHA256":hashlib.sha256(SOURCE.read_bytes()).hexdigest(),"approvedArtSHA256":hashlib.sha256(ART.read_bytes()).hexdigest(),"faceAtlas":"face-atlas.png","bones":len(RIG.data.bones),"baseMeshes":[o.name for o in PARTS if o.name.startswith("Base_")],"noArtworkProjectionMeshes":True,"views":["front","left","right","back","side","game"]}
    (OUT/"model.json").write_text(json.dumps(manifest,indent=2)+"\n")
    print("BUTTER_BASE30_COMPLETE",flush=True)


if __name__=="__main__":main()
