"""Build a real Butter mesh/armature and render four physical camera views.

blender -b --factory-startup --python tools/build_butter_model.py -- --preview
blender -b --factory-startup --python tools/build_butter_model.py -- --render
"""
from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Matrix, Vector

ROOT = Path(__file__).resolve().parents[1]
MODEL_DIR = ROOT / "assets" / "models"
RENDER_DIR = ROOT / "build" / "butter-model-frames"
TAU = math.tau
CELL = 128
GAIT_FRAMES = 12
SHOT_FRAMES = 8
VIEW_STRIDE = 128
VIEWS = ("down", "left", "right", "up")
CAMERA_TARGET = (0,0,1.14)
CAMERA_POSITIONS = {"down":(0,-8,5.2),"left":(8,-5,5.2),"right":(-8,-5,5.2),"up":(0,8,5.2)}
CLIPS = {
    "idle": {"offset": 0, "gaitFrames": 1, "attackFrames": 1},
    "walk": {"offset": 1, "gaitFrames": 12, "attackFrames": 1},
    "shoot": {"offset": 13, "gaitFrames": 1, "attackFrames": 8},
    "walkShoot": {"offset": 21, "gaitFrames": 12, "attackFrames": 8},
    "high": {"offset": 117, "gaitFrames": 1, "attackFrames": 8},
}
MATERIALS = {}
PARTS = []
REST = {}
TARGETS = {}
RIG = None
BAND = None
POUCH = None
CAMERA = None
HAND_REST = {"R": Vector((-.32,-.635,1.108)), "L": Vector((.32,-.635,1.108))}


def smooth(value):
    value = max(0.0, min(1.0, value))
    return value * value * (3.0 - 2.0 * value)


def toon(name, color, shade=0.78):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    nodes.clear()
    output = nodes.new("ShaderNodeOutputMaterial")
    emission = nodes.new("ShaderNodeEmission")
    diffuse = nodes.new("ShaderNodeBsdfDiffuse")
    diffuse.inputs["Color"].default_value = (1, 1, 1, 1)
    convert = nodes.new("ShaderNodeShaderToRGB")
    ramp = nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.interpolation = "CONSTANT"
    ramp.color_ramp.elements[0].position = 0.24
    ramp.color_ramp.elements[0].color = (*(c * shade for c in color), 1)
    ramp.color_ramp.elements[1].position = 0.55
    ramp.color_ramp.elements[1].color = (*color, 1)
    links = mat.node_tree.links
    links.new(diffuse.outputs[0], convert.inputs[0])
    links.new(convert.outputs[0], ramp.inputs[0])
    links.new(ramp.outputs[0], emission.inputs[0])
    links.new(emission.outputs[0], output.inputs[0])
    MATERIALS[name] = mat
    return mat


def ink_material():
    mat = bpy.data.materials.new("Warm brown silhouette ink")
    mat.diffuse_color = (0.105, 0.040, 0.025, 1)
    mat.use_nodes = True
    mat.use_backface_culling = True
    nodes = mat.node_tree.nodes
    nodes.clear()
    out = nodes.new("ShaderNodeOutputMaterial")
    emission = nodes.new("ShaderNodeEmission")
    emission.inputs[0].default_value = (0.105, 0.040, 0.025, 1)
    mat.node_tree.links.new(emission.outputs[0], out.inputs[0])
    return mat


def finish(obj, name, material, bone=None, outline=True):
    obj.name = name
    obj.data.materials.append(MATERIALS[material])
    if obj.type == "CURVE":
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        bpy.ops.object.convert(target="MESH")
        obj = bpy.context.object
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    if bone:
        group = obj.vertex_groups.new(name=bone)
        group.add(list(range(len(obj.data.vertices))), 1.0, "REPLACE")
        modifier = obj.modifiers.new("Butter armature", "ARMATURE")
        modifier.object = RIG
        obj.parent = RIG
    if outline:
        obj.data.materials.append(MATERIALS["ink"])
        modifier = obj.modifiers.new("Toon silhouette", "SOLIDIFY")
        modifier.thickness = 0.014
        modifier.offset = 1
        modifier.use_flip_normals = True
        modifier.use_rim = False
        modifier.material_offset = 1
    PARTS.append(obj)
    obj.select_set(False)
    return obj


def ball(name, center, radii, material, bone=None, outline=True, rotation=None):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, location=center)
    obj = bpy.context.object
    obj.scale = radii
    if rotation:
        obj.rotation_euler = rotation
    return finish(obj, name, material, bone, outline)


def segment(name, start, end, radius, material, bone=None, outline=True):
    start, end = Vector(start), Vector(end)
    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=radius, depth=(end-start).length, location=(start+end)/2)
    obj = bpy.context.object
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = (end-start).to_track_quat("Z", "Y")
    bevel = obj.modifiers.new("Soft toy edge", "BEVEL")
    bevel.width = min(radius * 0.45, 0.025)
    bevel.segments = 2
    return finish(obj, name, material, bone, outline)


def curve(name, points, radius, material, bone=None, outline=False):
    data = bpy.data.curves.new(name, "CURVE")
    data.dimensions = "3D"
    data.resolution_u = 12
    data.bevel_depth = radius
    data.bevel_resolution = 2
    spline = data.splines.new("BEZIER")
    spline.bezier_points.add(len(points)-1)
    for point, co in zip(spline.bezier_points, points):
        point.co = co
        point.handle_left_type = point.handle_right_type = "AUTO"
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    return finish(obj, name, material, bone, outline)


def create_rig():
    global RIG
    data = bpy.data.armatures.new("Butter skeleton")
    RIG = bpy.data.objects.new("Butter_Rig", data)
    bpy.context.collection.objects.link(RIG)
    bpy.context.view_layer.objects.active = RIG
    RIG.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    definitions = [
        ("root", (0,0,0), (0,0,.2), None),
        ("pelvis", (0,0,.50), (0,0,.72), "root"),
        ("spine", (0,0,.72), (0,0,1.04), "pelvis"),
        ("head", (0,0,1.04), (0,0,1.85), "spine"),
        ("hair", (0,.12,1.65), (0,.12,.82), "head"),
        ("tail", (0,.24,.58), (.08,.43,.70), "pelvis"),
    ]
    for side, sign in (("R", -1), ("L", 1)):
        definitions += [
            (f"ear.{side}", (sign*.54,0,1.97), (sign*.79,-.02,1.62), "head"),
            (f"upper_arm.{side}", (sign*.28,0,.96), (sign*.34,-.27,.94), "spine"),
            (f"forearm.{side}", (sign*.34,-.27,.94), HAND_REST[side], f"upper_arm.{side}"),
            (f"hand.{side}", HAND_REST[side], HAND_REST[side]+Vector((0,-.13,.02)), f"forearm.{side}"),
            (f"thigh.{side}", (sign*.14,0,.50), (sign*.14,-.01,.30), "pelvis"),
            (f"shin.{side}", (sign*.14,-.01,.30), (sign*.14,-.02,.10), f"thigh.{side}"),
            (f"foot.{side}", (sign*.14,-.02,.10), (sign*.14,-.17,.08), f"shin.{side}"),
        ]
    definitions.append(("slingshot.R",HAND_REST["R"],HAND_REST["R"]+Vector((0,0,.18)),"hand.R"))
    for i in range(3):
        start=HAND_REST["L"]+Vector(((i-1)*.032,-.05,.05))
        definitions.append((f"finger.L.{i}",start,start+Vector(((i-1)*.012,-.02,.06)),"hand.L"))
    for name, head, tail, parent in definitions:
        bone = data.edit_bones.new(name)
        bone.head, bone.tail = head, tail
        if parent:
            bone.parent = data.edit_bones[parent]
    bpy.ops.object.mode_set(mode="OBJECT")
    RIG.show_in_front = True
    RIG.data.display_type = "STICK"
    for bone in RIG.data.bones:
        REST[bone.name] = bone.matrix_local.copy()
        RIG.pose.bones[bone.name].rotation_mode = "QUATERNION"
    RIG["holding_hand"] = "hand.R"
    RIG["drawing_hand"] = "hand.L"
    RIG["workflow"] = "Actual skinned geometry; four camera views, no mirrored sprite view"
    RIG.select_set(False)


def bow(name, pos, size, bone="head"):
    x,y,z = pos
    for sign in (-1,1):
        ball(name+f" loop {sign}", (x+sign*size*.72,y,z), (size,.038,size*.55), "yellow", bone, rotation=(0,sign*.35,0))
    ball(name+" knot", pos, (size*.35,.045,size*.35), "gold", bone)


def create_character():
    # Body layers are real geometry: white shirt, yellow apron, pink shorts.
    ball("White short sleeve shirt", (0,0,.82), (.30,.23,.28), "white", "spine")
    ball("Yellow apron bib", (0,-.205,.81), (.245,.045,.235), "yellow", "spine")
    ball("Yellow apron hem", (0,-.015,.61), (.315,.24,.09), "yellow", "pelvis")
    for sign in (-1,1):
        ball("Pink shorts "+str(sign), (sign*.13,.015,.49), (.17,.18,.13), "pink", "pelvis")
        segment("Overall shoulder strap "+str(sign), (sign*.15,-.205,.99), (sign*.12,-.23,.69), .025, "gold", "spine", False)
        segment("Back overall strap "+str(sign), (sign*.17,.21,.98), (sign*.08,.23,.68), .024, "gold", "spine", False)
    bow("Chest bow", (0,-.265,.92), .067, "spine")
    bow("Back bow", (0,.254,.71), .065, "spine")
    ball("Apron pocket", (0,-.256,.69), (.105,.02,.045), "gold", "pelvis", False)

    ball("Cream face", (0,-.025,1.56), (.615,.49,.57), "skin", "head")
    # Open-front hair shell, never a face-covering full sphere.
    verts=[]; faces=[]; rings=18; segments=40
    for row in range(rings+1):
        theta=math.pi*row/rings
        for col in range(segments):
            phi=TAU*col/segments
            verts.append((.66*math.sin(theta)*math.cos(phi), .08+.54*math.sin(theta)*math.sin(phi), 1.60+.63*math.cos(theta)))
    for row in range(rings):
        for col in range(segments):
            indices=[row*segments+col,row*segments+(col+1)%segments,(row+1)*segments+(col+1)%segments,(row+1)*segments+col]
            center=sum((Vector(verts[i]) for i in indices),Vector())/4
            if center.y < -.10 and center.z < 1.87:
                continue
            faces.append(list(reversed(indices)))
    mesh=bpy.data.meshes.new("Sculpted open hair cap")
    mesh.from_pydata(verts,[],faces);mesh.update()
    obj=bpy.data.objects.new("Hair cap",mesh);bpy.context.collection.objects.link(obj)
    finish(obj,"Hair cap","hair","head")
    for sign in (-1,1):
        ball("Long side hair "+str(sign), (sign*.48,.12,1.19), (.245,.30,.53), "hair", "hair", rotation=(0,-sign*.10,0))
    for x in (-.29,0,.29):
        ball("Rounded back hair "+str(x), (x,.39,1.24), (.275,.19,.43), "hair", "hair")
    # Chunky sculpted bangs sit above the eyes.
    for i,(x,z,angle) in enumerate(((-.34,1.92,-.25),(-.12,1.94,-.13),(.12,1.94,.13),(.34,1.92,.25))):
        ball("Bangs "+str(i),(x,-.395,z),(.22,.165,.225),"hair","head",rotation=(0,angle,0))
    for side,sign in (("R",-1),("L",1)):
        ball("Floppy dog ear "+side,(sign*.685,-.005,1.79),(.18,.16,.31),"hair",f"ear.{side}",rotation=(0,-sign*.35,0))
        bow("Ear ribbon "+side,(sign*.62,-.31,2.02),.084,f"ear.{side}")
    bow("Head ribbon",(0,-.54,2.13),.108)
    curve("Cowlick",[(0,.02,2.15),(.025,.025,2.255),(.15,.02,2.29),(.14,-.005,2.24)],.043,"hair","head",True)

    def face_y(x,z,offset=0):
        return -.025-.49*math.sqrt(max(.05,1-(x/.615)**2-((z-1.56)/.57)**2))-offset
    for sign in (-1,1):
        x=sign*.205;z=1.59;y=face_y(x,z)
        normal=Vector((sign*.28,-.958,.04));center=Vector((x,y,z))
        rotation=(0,0,sign*.285)
        ball("Eye ink "+str(sign),center+normal*.010,(.107,.010,.132),"brown","head",False,rotation)
        ball("Eye white "+str(sign),center+normal*.018,(.089,.008,.114),"white","head",False,rotation)
        ball("Blue iris "+str(sign),center+normal*.027+Vector((0,0,-.009)),(.071,.007,.096),"blue","head",False,rotation)
        ball("Iris highlight "+str(sign),center+normal*.035+Vector((-.019,0,.025)),(.020,.006,.026),"white","head",False,rotation)
        cx=sign*.35;cz=1.39
        ball("Rosy cheek "+str(sign),(cx,face_y(cx,cz,.02),cz),(.082,.016,.043),"blush","head",False)
    curve("Small smile",[(-.065,face_y(-.065,1.315,.018),1.315),(-.027,face_y(-.027,1.29,.018),1.29),(0,face_y(0,1.315,.018),1.315),(.027,face_y(.027,1.29,.018),1.29),(.065,face_y(.065,1.315,.018),1.315)],.009,"brown","head")

    for side in ("R","L"):
        upper=RIG.data.bones[f"upper_arm.{side}"]
        fore=RIG.data.bones[f"forearm.{side}"]
        segment("White sleeve "+side,upper.head_local,upper.head_local.lerp(upper.tail_local,.50),.12,"white",f"upper_arm.{side}")
        segment("Arm "+side,upper.head_local.lerp(upper.tail_local,.35),upper.tail_local,.069,"skin",f"upper_arm.{side}")
        ball("Elbow "+side,upper.tail_local,(.073,.073,.073),"skin",f"forearm.{side}",False)
        segment("Forearm "+side,fore.head_local,fore.tail_local,.064,"skin",f"forearm.{side}")
        ball("White glove "+side,RIG.data.bones[f"hand.{side}"].head_local,(.096,.09,.096),"white",f"hand.{side}")
        sign=-1 if side=="R" else 1
        segment("Striped sock "+side,(sign*.14,-.015,.35),(sign*.14,-.02,.11),.097,"brown",f"shin.{side}")
        for index,z in enumerate((.30,.21)):
            segment("Cream sock stripe "+side+str(index),(sign*.14,-.015,z-.022),(sign*.14,-.015,z+.022),.099,"cream",f"shin.{side}",False)
        ball("Sock cuff "+side,(sign*.14,-.01,.36),(.106,.105,.045),"white",f"shin.{side}")
        ball("Rounded boot "+side,(sign*.14,-.07,.095),(.115,.153,.09),"brown",f"foot.{side}")
    for i in range(3):
        bone=RIG.data.bones[f"finger.L.{i}"]
        segment("Release finger "+str(i),bone.head_local,bone.tail_local,.027,"white",bone.name,False)
        ball("Round finger "+str(i),bone.tail_local,(.028,.028,.028),"white",bone.name,False)

    curve("Tail root",[(0,.22,.58),(.02,.37,.60),(.10,.46,.70)],.082,"hair","tail",True)
    ball("Fluffy tail",(.10,.46,.70),(.16,.16,.155),"hair","tail")
    curve("Dog bag strap",[(.20,-.17,1.0),(.02,-.27,.79),(-.18,-.24,.64)],.017,"brown","spine")
    ball("Small dog bag",(-.22,-.255,.60),(.13,.07,.115),"hair","pelvis")
    for sign in (-1,1):
        ball("Bag ear "+str(sign),(-.22+sign*.10,-.28,.655),(.055,.035,.055),"brown","pelvis",False)
        ball("Bag eye "+str(sign),(-.22+sign*.035,-.32,.615),(.012,.012,.021),"brown","pelvis",False)
    ball("Bag nose",(-.22,-.33,.58),(.018,.009,.014),"brown","pelvis",False)


FORK_ORIGIN = HAND_REST["R"]+Vector((0,-.06,-.04))
FORK_LEFT = FORK_ORIGIN+Vector((-.13,0,.29))
FORK_RIGHT = FORK_ORIGIN+Vector((.13,0,.29))
POUCH_REST = HAND_REST["L"]+Vector((0,-.015,.05))


def create_weapon():
    global BAND, POUCH
    segment("Slingshot grip",FORK_ORIGIN,FORK_ORIGIN+Vector((0,0,.15)),.034,"wood","slingshot.R")
    for name,tip in (("left",FORK_LEFT),("right",FORK_RIGHT)):
        segment("Slingshot fork "+name,FORK_ORIGIN+Vector((0,0,.12)),tip,.032,"wood","slingshot.R")
        ball("Fork cap "+name,tip,(.035,.035,.035),"gold","slingshot.R",False)
    bow("Slingshot ribbon",FORK_ORIGIN+Vector((0,-.02,.06)),.039,"slingshot.R")
    data=bpy.data.curves.new("Animated elastic endpoints","CURVE")
    data.dimensions="3D";data.bevel_depth=.009;data.bevel_resolution=1
    spline=data.splines.new("POLY");spline.points.add(2)
    BAND=bpy.data.objects.new("Elastic_R_fork_to_L_pinch",data)
    bpy.context.collection.objects.link(BAND);data.materials.append(MATERIALS["brown"])
    POUCH=ball("Elastic leather pouch",POUCH_REST,(.039,.015,.026),"wood",None,False)


def around(point, matrix):
    return Matrix.Translation(point) @ matrix @ Matrix.Translation(-Vector(point))


def set_target(name, matrix):
    bone=RIG.data.bones[name]
    parent=bone.parent
    if parent:
        relative=REST[parent.name].inverted() @ REST[name]
        basis=relative.inverted() @ TARGETS[parent.name].inverted() @ matrix
    else:
        basis=REST[name].inverted() @ matrix
    RIG.pose.bones[name].matrix_basis=basis
    TARGETS[name]=matrix


def aim_bone(name, head, tail):
    rest=RIG.data.bones[name]
    old=rest.tail_local-rest.head_local
    new=Vector(tail)-Vector(head)
    rotation=old.rotation_difference(new).to_matrix().to_4x4()
    set_target(name,Matrix.Translation(head) @ rotation @ Matrix.Translation(-rest.head_local) @ REST[name])


def solve_limb(root, target, a, b, bend):
    root,target=Vector(root),Vector(target)
    difference=target-root
    distance=min(difference.length,a+b-.0001)
    direction=difference.normalized()
    end=root+direction*distance
    along=(a*a-b*b+distance*distance)/(2*distance)
    height=math.sqrt(max(0,a*a-along*along))
    bend=Vector(bend)
    perpendicular=(bend-direction*bend.dot(direction)).normalized()
    return root+direction*along+perpendicular*height,end


def pose(gait=0.0, attack=None, high=False, moving=False):
    TARGETS.clear()
    drop=-.018*(.5+.5*math.cos(gait*2)) if moving else 0
    base=Matrix.Translation((0,0,drop))
    sway=math.sin(gait)*.018 if moving else 0
    spine=base @ around((0,0,.72),Matrix.Rotation(sway,4,"Z"))
    head=spine @ around((0,0,1.04),Matrix.Rotation(-sway*.6,4,"Y"))
    set_target("root",REST["root"])
    set_target("pelvis",base @ REST["pelvis"])
    set_target("spine",spine @ REST["spine"])
    set_target("head",head @ REST["head"])
    hair_sway=math.sin(gait-.5)*.025 if moving else 0
    set_target("hair",head @ around((0,.12,1.65),Matrix.Rotation(hair_sway,4,"Y")) @ REST["hair"])
    set_target("tail",base @ around((0,.24,.58),Matrix.Rotation(math.sin(gait-.7)*.16 if moving else 0,4,"Z")) @ REST["tail"])
    for side,sign in (("R",-1),("L",1)):
        ear_angle=math.sin(gait-.5)*.045 if moving else 0
        origin=RIG.data.bones[f"ear.{side}"].head_local
        set_target(f"ear.{side}",head @ around(origin,Matrix.Rotation(ear_angle*sign,4,"Y")) @ REST[f"ear.{side}"])

    release=.68 if high else .55
    if attack is None:
        draw=0.0;opening=0.0;recoil=0.0
    elif attack<release:
        draw=smooth(attack/(release*.88));opening=0.0;recoil=0.0
    else:
        snap=smooth((attack-release)/.12)
        draw=1-snap
        opening=smooth((attack-release)/.055)*(1-smooth((attack-.84)/.16))
        recoil=math.sin(min(1,(attack-release)/.18)*math.pi)*(1-smooth((attack-.84)/.16))
    # Hold the fork outside the hair silhouette. The same anatomical hand is
    # visible at the opposite screen edge in the back camera, never mirrored.
    grip=Vector((-.76,-.32,1.12))
    pinch=Vector((-.44,-.34+.28*draw,1.17+.04*draw))
    pinch.x+=opening*.09;pinch.z+=opening*.04
    grip.y+=recoil*.035
    if high:
        grip+=Vector((-.04,-.06,-.02))
    for side,target in (("R",grip),("L",pinch)):
        upper=RIG.data.bones[f"upper_arm.{side}"]
        fore=RIG.data.bones[f"forearm.{side}"]
        shoulder=spine @ upper.head_local
        target=spine @ target
        a=(upper.tail_local-upper.head_local).length
        b=(fore.tail_local-fore.head_local).length
        elbow,wrist=solve_limb(shoulder,target,a,b,(-1 if side=="R" else 1,.1,-.2))
        aim_bone(f"upper_arm.{side}",shoulder,elbow)
        aim_bone(f"forearm.{side}",elbow,wrist)
        hand_direction=spine.to_3x3() @ Vector((0,-.13,.02))
        aim_bone(f"hand.{side}",wrist,wrist+hand_direction)
        if side=="R":
            # A real outward wrist tilt keeps the fork readable beyond long
            # hair from the rear, rather than pasting a weapon over the head.
            set_target("hand.R",around(wrist,Matrix.Rotation(-.60,4,"Y")) @ TARGETS["hand.R"])
    left_deform=TARGETS["hand.L"] @ REST["hand.L"].inverted()
    for i in range(3):
        name=f"finger.L.{i}";origin=RIG.data.bones[name].head_local
        curl=Matrix.Rotation(1.15*(1-opening),4,"X")
        set_target(name,left_deform @ around(origin,curl) @ REST[name])

    for side,sign in (("R",-1),("L",1)):
        upper=RIG.data.bones[f"thigh.{side}"];lower=RIG.data.bones[f"shin.{side}"]
        phase=(gait+(math.pi if side=="L" else 0))%TAU
        along=-.12*math.cos(phase) if moving else -.02
        lift=(-math.sin(phase)*.075 if phase>math.pi else 0) if moving else 0
        ankle=Vector((sign*.14,along,.10+lift))
        hip=base @ upper.head_local
        knee,ankle=solve_limb(hip,ankle,(upper.tail_local-upper.head_local).length,(lower.tail_local-lower.head_local).length,(0,-1,.05))
        aim_bone(f"thigh.{side}",hip,knee)
        aim_bone(f"shin.{side}",knee,ankle)
        aim_bone(f"foot.{side}",ankle,ankle+Vector((0,-.15,-.02)))
    bpy.context.view_layer.update()
    right_deform=TARGETS["hand.R"] @ REST["hand.R"].inverted()
    factor=1.85 if high else 1
    weapon_scale=around(HAND_REST["R"],Matrix.Diagonal((factor,factor,factor,1)))
    set_target("slingshot.R",right_deform @ weapon_scale @ REST["slingshot.R"])
    tip_a=right_deform @ weapon_scale @ FORK_LEFT
    tip_b=right_deform @ weapon_scale @ FORK_RIGHT
    hand_pinch=left_deform @ POUCH_REST
    pouch=(tip_a+tip_b)*.5 if attack is None or (attack>=release+.08) else hand_pinch
    if attack is not None and attack>=release and attack<release+.08:
        pouch=hand_pinch.lerp((tip_a+tip_b)*.5,smooth((attack-release)/.08))
    for point,co in zip(BAND.data.splines[0].points,(tip_a,pouch,tip_b)):
        point.co=(*co,1)
    POUCH.location=pouch-POUCH_REST
    bpy.context.view_layer.update()
    return {"rightHand":list(TARGETS["hand.R"].translation),"leftHand":list(TARGETS["hand.L"].translation),"bandEnds":[list(tip_a),list(tip_b)]}


def record_actions():
    actions=[]
    clips=(("Idle",False,False,False),("Walk",True,False,False),("Slingshot",False,True,False),("Walk_Slingshot",True,True,False),("High_Slingshot",False,True,True))
    def key_pose(frame,phase,attack,high,moving):
        bpy.context.scene.frame_set(frame)
        pose(phase,attack,high,moving)
        for bone in RIG.pose.bones:
            for channel in ("location","rotation_quaternion","scale"):
                bone.keyframe_insert(data_path=channel,frame=frame,group=bone.name)
        for point in BAND.data.splines[0].points:
            point.keyframe_insert(data_path="co",frame=frame)
        POUCH.keyframe_insert(data_path="location",frame=frame)

    for name,moving,shooting,high in clips:
        rig_action=bpy.data.actions.new(name);rig_action.use_fake_user=True
        RIG.animation_data_create();RIG.animation_data.action=rig_action
        BAND.data.animation_data_clear();POUCH.animation_data_clear()
        count=25
        for i in range(count):
            frame=i+1
            phase=i/(count-1)*TAU
            attack=i/(count-1) if shooting else None
            key_pose(frame,phase,attack,high,moving)
        if BAND.data.animation_data and BAND.data.animation_data.action:
            BAND.data.animation_data.action.name=name+"_Elastic"
            BAND.data.animation_data.action.use_fake_user=True
        if POUCH.animation_data and POUCH.animation_data.action:
            POUCH.animation_data.action.name=name+"_Pouch"
            POUCH.animation_data.action.use_fake_user=True
        actions.append(name)
    # A synchronized master timeline makes the delivered .blend playable with
    # Space, including the animated elastic and pouch (not just the skeleton).
    master=bpy.data.actions.new("Butter_All_Clips");master.use_fake_user=True
    RIG.animation_data.action=master
    BAND.data.animation_data_clear();POUCH.animation_data_clear()
    for clip_index,(name,moving,shooting,high) in enumerate(clips):
        start=clip_index*30+1
        bpy.context.scene.timeline_markers.new(name,frame=start)
        for i in range(25):
            key_pose(start+i,i/24*TAU,i/24 if shooting else None,high,moving)
    BAND.data.animation_data.action.name="Butter_All_Clips_Elastic"
    POUCH.animation_data.action.name="Butter_All_Clips_Pouch"
    for action in bpy.data.actions:
        for fcurve in action.fcurves:
            for key in fcurve.keyframe_points:
                key.interpolation="LINEAR"
    scene=bpy.context.scene
    scene.frame_start=1;scene.frame_end=145
    scene.use_preview_range=True;scene.frame_preview_start=91;scene.frame_preview_end=115
    scene.frame_set(103)
    bpy.data.texts.new("START HERE - Butter model").write(
        "Butter: real mesh, weighted armature, toon materials.\n"
        "Space plays the Walk_Slingshot preview range. Disable Preview Range to play all clips.\n"
        "Timeline: Idle 1-25 / Walk 31-55 / Slingshot 61-85 / Walk_Slingshot 91-115 / High 121-145.\n"
        "Weapon bone slingshot.R is parented to hand.R; hand.L draws/releases the elastic.\n"
        "Both hands retain their anatomical sides in all four camera views. No mirrored render.\n"
        "Regenerate: blender -b --factory-startup --python tools/build_butter_model.py -- --render\n")
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type=="VIEW_3D":
                space=area.spaces.active
                space.shading.color_type="MATERIAL"
                space.overlay.show_overlays=False
                space.region_3d.view_location=Vector((0,0,1.14))
                space.region_3d.view_distance=4.2
                space.region_3d.view_rotation=CAMERA.rotation_euler.to_quaternion()
    bpy.context.view_layer.objects.active=RIG;RIG.select_set(True)
    return actions


def clear_animation():
    for obj in bpy.data.objects:
        obj.animation_data_clear()
    BAND.data.animation_data_clear()


def batch_render_meshes():
    """Reduce draw calls only in the render copy; keep editable .blend parts."""
    groups={}
    for obj in PARTS:
        if obj.type!="MESH" or obj.parent!=RIG:
            continue
        outline=any(m.type=="SOLIDIFY" for m in obj.modifiers)
        groups.setdefault((obj.data.materials[0].name,outline),[]).append(obj)
    bpy.ops.object.select_all(action="DESELECT")
    for objects in groups.values():
        for obj in objects:
            bpy.context.view_layer.objects.active=obj
            for modifier in list(obj.modifiers):
                if modifier.type=="BEVEL":
                    bpy.ops.object.modifier_apply(modifier=modifier.name)
            obj.select_set(True)
        bpy.context.view_layer.objects.active=objects[0]
        bpy.ops.object.join()
        bpy.ops.object.select_all(action="DESELECT")


def camera_view(view):
    global CAMERA
    # Chibi hair occludes the far arm at an exact 90-degree profile. Matching
    # three-quarter side cameras expose both the fixed grip and draw motion.
    CAMERA.location=CAMERA_POSITIONS[view]
    CAMERA.rotation_euler=(Vector(CAMERA_TARGET)-CAMERA.location).to_track_quat("-Z","Y").to_euler()


def configure_scene():
    global CAMERA
    bpy.ops.object.select_all(action="SELECT");bpy.ops.object.delete(use_global=False)
    bpy.context.preferences.filepaths.save_version=0
    scene=bpy.context.scene
    scene.render.engine="BLENDER_EEVEE_NEXT"
    scene.eevee.taa_render_samples=16
    scene.render.resolution_x=scene.render.resolution_y=CELL
    scene.render.resolution_percentage=100
    scene.render.film_transparent=True
    scene.render.image_settings.file_format="PNG"
    scene.render.image_settings.color_mode="RGBA"
    scene.render.image_settings.color_depth="8"
    scene.render.fps=24
    scene.view_settings.view_transform="Standard"
    scene.view_settings.look="None"
    scene.world.use_nodes=True
    scene.world.node_tree.nodes["Background"].inputs[0].default_value=(.8,.8,.8,1)
    scene.world.node_tree.nodes["Background"].inputs[1].default_value=.7
    for name,loc,energy,size in (("Soft key",(-3,-4,6),450,4),("Pastel fill",(4,-1,4),180,5),("Back rim",(1,4,5),220,4)):
        data=bpy.data.lights.new(name,"AREA");data.energy=energy;data.shape="DISK";data.size=size
        data.use_shadow=name=="Soft key"
        obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj);obj.location=loc
        obj.rotation_euler=(Vector((0,0,1))-obj.location).to_track_quat("-Z","Y").to_euler()
    data=bpy.data.cameras.new("Orthographic sprite camera");data.type="ORTHO";data.ortho_scale=3.15
    CAMERA=bpy.data.objects.new("SpriteCamera",data);bpy.context.collection.objects.link(CAMERA);scene.camera=CAMERA
    camera_view("down")
    for name,color in {
        "skin":(.98,.88,.80),"hair":(.69,.48,.39),"white":(.98,.97,.92),"yellow":(.96,.73,.27),
        "gold":(.90,.57,.14),"pink":(.95,.56,.62),"brown":(.20,.085,.045),"cream":(.98,.85,.59),
        "blue":(.14,.55,.79),"blush":(.98,.53,.53),"wood":(.43,.20,.065)
    }.items():toon(name,color)
    MATERIALS["ink"]=ink_material()


def render_frame(path):
    scene=bpy.context.scene;scene.render.filepath=str(path)
    bpy.ops.render.render(write_still=True)


def main():
    parser=argparse.ArgumentParser();parser.add_argument("--preview",action="store_true");parser.add_argument("--quick",action="store_true");parser.add_argument("--render",action="store_true")
    parser.add_argument("--views",nargs="+",choices=VIEWS,default=list(VIEWS),help="Rerender selected cameras; keep existing renders for the others")
    args=parser.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else [])
    configure_scene();create_rig();create_character();create_weapon()
    MODEL_DIR.mkdir(parents=True,exist_ok=True);RENDER_DIR.mkdir(parents=True,exist_ok=True)
    actions=record_actions()
    for obj in PARTS:
        if obj.name.startswith(("Slingshot ","Fork cap")):
            assert [g.name for g in obj.vertex_groups]==["slingshot.R"],obj.name
    assert RIG.data.bones["slingshot.R"].parent.name=="hand.R"
    bpy.ops.wm.save_as_mainfile(filepath=str(MODEL_DIR/"butter.blend"),compress=True)
    manifest={"model":"models/butter.blend","cell":CELL,"columns":16,"rows":32,"viewStride":VIEW_STRIDE,"anchor":[64,108],"padding":8,"views":list(VIEWS),"clips":CLIPS,"holdingHand":"hand.R","drawingHand":"hand.L","weaponBone":"slingshot.R","actions":actions,"bones":list(REST),"frames":[],"camera":{"orthoScale":CAMERA.data.ortho_scale,"target":CAMERA_TARGET,"positions":CAMERA_POSITIONS}}
    clear_animation()
    if args.quick or args.render:
        batch_render_meshes()
    if args.quick:
        bpy.context.scene.render.resolution_x=bpy.context.scene.render.resolution_y=256
        bpy.context.scene.eevee.taa_render_samples=8
        for view in VIEWS:
            camera_view(view)
            for label,high in (("draw",False),("high",True)):
                pose(0,.49,high,False);render_frame(RENDER_DIR/f"quick-{view}-{label}.png")
        print("BUTTER_QUICK_COMPLETE",flush=True)
    if args.preview:
        bpy.context.scene.render.resolution_x=bpy.context.scene.render.resolution_y=384
        for view in VIEWS:
            camera_view(view)
            for label,gait,attack,moving in (("idle",0,None,False),("draw",0,.49,False),("release",0,.65,False),("walk",math.pi/2,.49,True)):
                pose(gait,attack,False,moving);render_frame(RENDER_DIR/f"preview-{view}-{label}.png")
        print("BUTTER_PREVIEW_COMPLETE",flush=True)
    if args.render:
        bpy.context.scene.render.resolution_x=bpy.context.scene.render.resolution_y=CELL
        bpy.context.scene.eevee.taa_render_samples=8
        for view_index,view in enumerate(VIEWS):
            camera_view(view)
            for clip,layout in CLIPS.items():
                for gait_index in range(layout["gaitFrames"]):
                    for attack_index in range(layout["attackFrames"]):
                        phase=gait_index/GAIT_FRAMES*TAU
                        attack=(attack_index+.5)/SHOT_FRAMES if layout["attackFrames"]>1 else None
                        moving=clip in ("walk","walkShoot")
                        report=pose(phase,attack,clip=="high",moving)
                        index=view_index*VIEW_STRIDE+layout["offset"]+gait_index*layout["attackFrames"]+attack_index
                        filename=f"{index:03d}.png"
                        if view in args.views:
                            render_frame(RENDER_DIR/filename)
                        else:
                            assert (RENDER_DIR/filename).is_file(),f"Missing cached camera render: {filename}"
                        manifest["frames"].append({"index":index,"view":view,"clip":clip,"gait":gait_index,"attack":attack_index,"file":filename,**report})
                print(f"BUTTER_RENDER_PROGRESS {view} {clip} {len(manifest['frames'])}/500",flush=True)
        (ROOT/"assets"/"butter-model.json").write_text(json.dumps(manifest,indent=2)+"\n")
        print("BUTTER_RENDER_COMPLETE",flush=True)


if __name__=="__main__":main()
