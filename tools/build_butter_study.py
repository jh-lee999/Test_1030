"""A separate, review-first Butter redesign. Never overwrites live game assets.

blender -b --factory-startup --python tools/build_butter_study.py
"""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Matrix, Vector
from mathutils.geometry import tessellate_polygon

sys.dont_write_bytecode=True
sys.path.insert(0,str(Path(__file__).resolve().parent))
import build_butter_model as rig

ROOT=Path(__file__).resolve().parents[1]
OUTPUT=ROOT/"assets"/"butter-study"
BODY_SCALE=.72
HEAD_BASE=.8
TARGET=(0,0,.90)
VIEWS={"front":(0,-8,4.0),"left":(8,-6,4.0),"right":(-8,-6,4.0),"back":(0,8,4.0)}


def compact(point):
    x,y,z=point
    return Vector((x,y,z*BODY_SCALE if z<HEAD_BASE else z-HEAD_BASE*(1-BODY_SCALE)))


def flat_material(name,srgb):
    # Explicit sRGB palette: no studio highlights or bulging eye reflections.
    color=tuple(c/12.92 if c<=.04045 else ((c+.055)/1.055)**2.4 for c in srgb)
    material=bpy.data.materials.new(name)
    material.diffuse_color=(*color,1);material.use_nodes=True
    nodes=material.node_tree.nodes;nodes.clear()
    out=nodes.new("ShaderNodeOutputMaterial");emission=nodes.new("ShaderNodeEmission")
    emission.inputs[0].default_value=(*color,1)
    material.node_tree.links.new(emission.outputs[0],out.inputs[0])
    rig.MATERIALS[name]=material


def bezier_contour(start,segments,steps=10):
    points=[];previous=Vector(start)
    for a,b,end in segments:
        a,b,end=Vector(a),Vector(b),Vector(end)
        for i in range(steps):
            t=i/steps;s=1-t
            points.append(previous*s**3+3*a*s*s*t+3*b*s*t*t+end*t**3)
        previous=end
    return points


def shape(name,points,front,back,material,bone,outline=True):
    """One continuous beveled silhouette, not a pile of overlapping spheres."""
    center=sum(points,Vector((0,0)))/len(points)
    vertices=[];n=len(points)
    bevel=min(.018,(back-front)*.24)
    for scale,y in ((.975,front),(1,front+bevel),(1,back-bevel),(.975,back)):
        for p in points:
            q=center+(p-center)*scale;vertices.append((q.x,y,q.y))
    faces=[]
    # Winding is normalized once, so inverted-hull outlines stay outside.
    area=sum(points[i].x*points[(i+1)%n].y-points[(i+1)%n].x*points[i].y for i in range(n))
    if area<0:
        points=list(reversed(points))
        return shape(name,points,front,back,material,bone,outline)
    for layer in range(3):
        for i in range(n):
            j=(i+1)%n;faces.append((layer*n+i,layer*n+j,(layer+1)*n+j,(layer+1)*n+i))
    cap=[Vector(v) for v in vertices[:n]]
    lookup={tuple(v):i for i,v in enumerate(cap)}
    for triangle in tessellate_polygon([cap]):
        indices=[v if isinstance(v,int) else lookup[tuple(v)] for v in triangle]
        faces.append(tuple(reversed(indices)))
        faces.append(tuple(i+3*n for i in indices))
    volume=0
    for face in faces:
        a=Vector(vertices[face[0]])
        for i in range(1,len(face)-1):
            volume+=a.dot(Vector(vertices[face[i]]).cross(Vector(vertices[face[i+1]])))/6
    if volume<0:faces=[tuple(reversed(face)) for face in faces]
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(vertices,[],faces);mesh.update()
    obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj)
    rig.finish(obj,name,material,bone,outline)
    for modifier in obj.modifiers:
        if modifier.type=="SOLIDIFY":modifier.thickness=.010
    return obj


def panel(name,start,segments,front,back,material,bone="head",outline=True):
    return shape(name,bezier_contour(start,segments),front,back,material,bone,outline)


def oval(name,x,z,rx,rz,y,material,bone="head"):
    points=[Vector((x+rx*math.cos(t*math.tau/48),z+rz*math.sin(t*math.tau/48))) for t in range(48)]
    return shape(name,points,y,y+.004,material,bone,False)


def ribbon(name,pos,size,bone="head"):
    x,y,z=pos
    for sign in (-1,1):
        points=bezier_contour((0,0),[
            ((sign*.4,.35),(sign*1.2,.7),(sign*1.3,.42)),
            ((sign*1.45,.04),(sign*1.3,-.52),(sign*.98,-.45)),
            ((sign*.6,-.36),(sign*.3,-.12),(0,0))],8)
        points=[Vector((x+p.x*size,z+p.y*size)) for p in points]
        shape(name+str(sign),points,y,y+.045,"yellow",bone)
    oval(name+" knot",x,z,size*.28,size*.32,y-.012,"gold",bone)


def skeleton():
    data=bpy.data.armatures.new("Butter compact skeleton")
    rig.RIG=bpy.data.objects.new("Butter_Rig",data);bpy.context.collection.objects.link(rig.RIG)
    bpy.context.view_layer.objects.active=rig.RIG;rig.RIG.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    definitions=[
        ("root",(0,0,0),(0,0,.15),None),
        ("pelvis",(0,0,.36),(0,0,.50),"root"),
        ("spine",(0,0,.50),(0,0,.72),"pelvis"),
        ("head",(0,0,.72),(0,0,1.45),"spine"),
        ("hair",(0,.13,1.55),(0,.13,.72),"head"),
        ("tail",(0,.25,.39),(.05,.42,.48),"pelvis")]
    rig.HAND_REST={"R":Vector((-.23,-.30,.56)),"L":Vector((.23,-.30,.56))}
    for side,sign in (("R",-1),("L",1)):
        definitions.extend([
            (f"ear.{side}",(sign*.58,0,1.76),(sign*.73,-.02,1.52),"head"),
            (f"upper_arm.{side}",(sign*.24,0,.64),(sign*.28,-.12,.56),"spine"),
            (f"forearm.{side}",(sign*.28,-.12,.56),rig.HAND_REST[side],f"upper_arm.{side}"),
            (f"hand.{side}",rig.HAND_REST[side],rig.HAND_REST[side]+Vector((0,-.09,.01)),f"forearm.{side}"),
            (f"thigh.{side}",(sign*.13,0,.36),(sign*.13,0,.23),"pelvis"),
            (f"shin.{side}",(sign*.13,0,.23),(sign*.13,-.01,.10),f"thigh.{side}"),
            (f"foot.{side}",(sign*.13,-.01,.10),(sign*.13,-.13,.075),f"shin.{side}")])
    definitions.append(("slingshot.R",rig.HAND_REST["R"],rig.HAND_REST["R"]+Vector((0,0,.15)),"hand.R"))
    for i in range(3):
        start=rig.HAND_REST["L"]+Vector(((i-1)*.022,-.04,.035))
        definitions.append((f"finger.L.{i}",start,start+Vector((0,-.01,.04)),"hand.L"))
    for name,head,tail,parent in definitions:
        bone=data.edit_bones.new(name);bone.head=head;bone.tail=tail
        if parent:bone.parent=data.edit_bones[parent]
    bpy.ops.object.mode_set(mode="OBJECT")
    rig.RIG["holding_hand"]="hand.R";rig.RIG["drawing_hand"]="hand.L"
    rig.RIG["study"]="Review-first: flat face, continuous hair, compact limbs; not applied to game"
    rig.RIG.data.display_type="STICK";rig.RIG.select_set(False)
    rig.FORK_ORIGIN=rig.HAND_REST["R"]+Vector((0,-.035,-.025))
    rig.FORK_LEFT=rig.FORK_ORIGIN+Vector((-.09,0,.21))
    rig.FORK_RIGHT=rig.FORK_ORIGIN+Vector((.09,0,.21))
    rig.POUCH_REST=rig.HAND_REST["L"]+Vector((0,-.01,.035))


def character():
    # The back silhouette is sculpted as one flowing shape, with pointed locks.
    panel("Continuous long hair",(0,1.86),[
        ((.40,1.91),(.67,1.65),(.64,1.37)),
        ((.61,1.09),(.66,.87),(.75,.70)),
        ((.79,.63),(.66,.50),(.48,.51)),
        ((.54,.54),(.54,.59),(.50,.61)),
        ((.27,.56),(-.13,.59),(-.37,.60)),
        ((-.55,.45),(-.81,.59),(-.72,.74)),
        ((-.62,.91),(-.66,1.13),(-.66,1.38)),
        ((-.69,1.67),(-.36,1.92),(0,1.86))],-.08,.32,"hair","hair")
    panel("Cheek shaped face",(0,1.76),[
        ((.40,1.77),(.59,1.58),(.59,1.32)),
        ((.65,1.19),(.60,1.02),(.46,.93)),
        ((.32,.84),(.14,.80),(0,.80)),
        ((-.14,.80),(-.32,.84),(-.46,.93)),
        ((-.60,1.02),(-.65,1.19),(-.59,1.32)),
        ((-.59,1.58),(-.40,1.77),(0,1.76))],-.32,.16,"skin")
    panel("Swept fringe",(-.55,1.39),[
        ((-.68,1.67),(-.42,1.86),(-.08,1.85)),
        ((.23,1.94),(.60,1.78),(.57,1.45)),
        ((.56,1.39),(.50,1.38),(.45,1.41)),
        ((.35,1.48),(.32,1.55),(.30,1.61)),
        ((.27,1.47),(.12,1.36),(.01,1.41)),
        ((.08,1.45),(.10,1.49),(.10,1.53)),
        ((-.03,1.40),(-.20,1.32),(-.29,1.40)),
        ((-.35,1.48),(-.35,1.52),(-.33,1.56)),
        ((-.39,1.45),(-.47,1.35),(-.55,1.39))],-.372,-.19,"hair")
    # Discrete low-contrast drawing lines, rather than black seams on every lump.
    rig.curve("Fringe part",[(.02,-.381,1.81),(-.03,-.385,1.67),(.01,-.384,1.54)],.006,"hair-line","head")
    for sign in (-1,1):
        rig.curve("Back hair flow "+str(sign),[(sign*.10,.327,1.72),(sign*.13,.329,1.27),(sign*.25,.329,.87),(sign*.33,.325,.63)],.005,"hair-line","hair")
    for side,sign in (("R",-1),("L",1)):
        ear=bezier_contour((.49,1.76),[
            ((.63,1.82),(.78,1.64),(.81,1.53)),
            ((.84,1.40),(.62,1.38),(.57,1.50)),
            ((.51,1.59),(.51,1.68),(.49,1.76))])
        shape("Floppy ear "+side,[Vector((p.x*sign,p.y)) for p in ear],-.27,-.08,"hair",f"ear.{side}")
        ribbon("Ear bow "+side,(sign*.60,-.39,1.76),.085,f"ear.{side}")
    ribbon("Head bow",(0,-.39,1.84),.10)
    panel("Cowlick",(-.05,1.83),[
        ((-.12,1.93),(.02,2.04),(.14,1.98)),
        ((.06,1.98),(.02,1.93),(.10,1.88)),
        ((.05,1.85),(0,1.84),(-.05,1.83))],-.02,.10,"hair")

    # Flat illustrated anime eyes, with a filled iris and only an upper lash.
    for sign in (-1,1):
        x=sign*.215;z=1.235
        eye=bezier_contour((x-.115,z+.055),[
            ((x-.06,z+.11),(x+.055,z+.105),(x+.115,z+.065)),
            ((x+.13,z-.025),(x+.08,z-.105),(x,z-.105)),
            ((x-.09,z-.105),(x-.13,z-.035),(x-.115,z+.055))])
        shape("Flat eye white "+str(sign),eye,-.339,-.334,"white","head",False)
        oval("Blue iris "+str(sign),x,z-.012,.084,.091,-.346,"blue")
        oval("Iris lower tint "+str(sign),x,z-.052,.070,.043,-.350,"blue-light")
        oval("Iris upper pupil "+str(sign),x,z+.018,.034,.052,-.354,"blue-dark")
        oval("Eye glint "+str(sign),x-.031,z+.036,.027,.031,-.360,"white")
        oval("Tiny glint "+str(sign),x+.035,z-.036,.012,.014,-.361,"white")
        rig.curve("Upper lash "+str(sign),[(x-.123,-.365,z+.060),(x-.045,-.365,z+.10),(x+.065,-.365,z+.10),(x+.123,-.365,z+.068)],.011,"brown","head")
        oval("Large rosy cheek "+str(sign),sign*.403,1.065,.112,.058,-.341,"blush")
        for i in range(2):
            cx=sign*.403+(i-.5)*.04
            rig.curve("Cheek mark "+str(sign)+str(i),[(cx-.008,-.349,1.08),(cx+.003,-.349,1.052)],.004,"blush-line","head")
    rig.curve("Butter smile",[(-.055,-.343,1.022),(-.024,-.345,1.003),(0,-.346,1.023),(.026,-.345,1.003),(.056,-.343,1.025)],.009,"brown","head")

    rig.ball("White tee",(0,0,.54),(.255,.18,.20),"white","spine")
    rig.ball("White collar",(0,-.015,.745),(.15,.13,.105),"white","spine")
    panel("Yellow apron",(-.18,.71),[
        ((-.10,.73),(.10,.73),(.18,.71)),
        ((.18,.57),(.24,.44),(.27,.40)),
        ((.17,.35),(-.17,.35),(-.27,.40)),
        ((-.24,.44),(-.18,.57),(-.18,.71))],-.192,-.14,"yellow","spine")
    for sign in (-1,1):
        rig.ball("Pink shorts "+str(sign),(sign*.115,.015,.34),(.145,.15,.115),"pink","pelvis")
        rig.segment("Yellow strap "+str(sign),(sign*.135,-.188,.71),(sign*.12,-.212,.53),.018,"gold","spine",False)
        rig.segment("Back strap "+str(sign),(sign*.14,.155,.70),(sign*.07,.173,.43),.018,"yellow","spine",False)
    ribbon("Chest bow",(0,-.227,.64),.058,"spine")
    ribbon("Back bow",(0,.191,.43),.055,"pelvis")
    rig.curve("Apron pocket",[(-.07,-.223,.47),(0,-.229,.44),(.07,-.223,.47)],.010,"gold","spine")
    for side,sign in (("R",-1),("L",1)):
        upper=rig.RIG.data.bones[f"upper_arm.{side}"];fore=rig.RIG.data.bones[f"forearm.{side}"]
        rig.segment("White sleeve "+side,upper.head_local,upper.head_local.lerp(upper.tail_local,.58),.088,"white",upper.name)
        rig.segment("Upper arm "+side,upper.head_local.lerp(upper.tail_local,.4),upper.tail_local,.050,"skin",upper.name)
        rig.segment("Forearm "+side,fore.head_local,fore.tail_local,.049,"skin",fore.name)
        rig.ball("Small mitten "+side,fore.tail_local,(.068,.061,.067),"white",f"hand.{side}")
        rig.segment("Sock "+side,(sign*.13,-.008,.27),(sign*.13,-.01,.10),.085,"brown",f"shin.{side}")
        for z in (.235,.165):
            rig.segment("Sock stripe "+side+str(z),(sign*.13,-.01,z-.016),(sign*.13,-.01,z+.016),.087,"cream",f"shin.{side}",False)
        rig.ball("Bean shoe "+side,(sign*.13,-.05,.078),(.098,.125,.075),"brown",f"foot.{side}")
    rig.curve("Tail root",[(0,.23,.39),(0,.34,.41),(.04,.42,.47)],.060,"hair","tail",True)
    rig.ball("Small central tail",(.04,.42,.47),(.125,.115,.105),"hair","tail")
    rig.curve("Dog bag strap",[(.16,-.18,.70),(.015,-.225,.54),(-.17,-.20,.43)],.012,"brown","spine")
    oval("Dog pouch",-.17,.42,.097,.081,-.225,"hair","pelvis")
    for sign in (-1,1):
        oval("Pouch ear "+str(sign),-.17+sign*.073,.464,.026,.036,-.232,"brown","pelvis")
        oval("Pouch eye "+str(sign),-.17+sign*.026,.425,.009,.012,-.236,"brown","pelvis")
    oval("Pouch nose",-.17,.402,.013,.010,-.237,"brown","pelvis")


def shorten_body():
    # Bake one anatomical proportion change into geometry AND skeleton. No
    # scale tricks in preview drawing, and no oversized arms to expose weapons.
    for obj in rig.PARTS:
        for vertex in obj.data.vertices:vertex.co=compact(vertex.co)
        obj.data.update()
    bpy.context.view_layer.objects.active=rig.RIG;rig.RIG.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    for bone in rig.RIG.data.edit_bones:
        bone.head=compact(bone.head);bone.tail=compact(bone.tail)
    bpy.ops.object.mode_set(mode="OBJECT");rig.RIG.select_set(False)
    for bone in rig.RIG.data.bones:
        rig.REST[bone.name]=bone.matrix_local.copy()
        rig.RIG.pose.bones[bone.name].rotation_mode="QUATERNION"
    rig.HAND_REST={name:compact(v) for name,v in rig.HAND_REST.items()}
    for name in ("FORK_ORIGIN","FORK_LEFT","FORK_RIGHT","POUCH_REST"):
        setattr(rig,name,compact(getattr(rig,name)))


def pose(gait=0,attack=None,high=False,moving=False):
    rig.TARGETS.clear()
    drop=-.0115*(.5+.5*math.cos(gait*2)) if moving else 0
    base=Matrix.Translation((0,0,drop));sway=math.sin(gait)*.012 if moving else 0
    torso=base@rig.around(compact((0,0,.50)),Matrix.Rotation(sway,4,"Z"))
    for name,transform in (("root",Matrix.Identity(4)),("pelvis",base),("spine",torso),("head",torso)):
        rig.set_target(name,transform@rig.REST[name])
    for name,point,angle in (("hair",(0,.13,1.55),math.sin(gait-.5)*.02 if moving else 0),("tail",(0,.25,.39),math.sin(gait-.7)*.20 if moving else 0)):
        transform=torso if name=="hair" else base
        rig.set_target(name,transform@rig.around(compact(point),Matrix.Rotation(angle,4,"Z"))@rig.REST[name])
    for side,sign in (("R",-1),("L",1)):
        origin=rig.RIG.data.bones[f"ear.{side}"].head_local
        rig.set_target(f"ear.{side}",torso@rig.around(origin,Matrix.Rotation(math.sin(gait)*.025*sign if moving else 0,4,"Y"))@rig.REST[f"ear.{side}"])
    release=.68 if high else .55
    draw=0 if attack is None else rig.smooth(attack/(release*.88)) if attack<release else 1-rig.smooth((attack-release)/.14)
    recoil=0 if attack is None or attack<release else math.sin(min(1,(attack-release)/.20)*math.pi)
    if attack is None:
        grip=compact((-.27,-.22,.53));pinch=compact((.235,-.10,.50))
    else:
        grip=compact((-.235,-.26+recoil*.035,.64))
        pinch=compact((-.025,-.24+.16*draw,.68))
    if high:grip+=Vector((-.02,-.025,.035))
    for side,target in (("R",grip),("L",pinch)):
        upper=rig.RIG.data.bones[f"upper_arm.{side}"];fore=rig.RIG.data.bones[f"forearm.{side}"]
        shoulder=torso@upper.head_local;target=torso@target
        elbow,wrist=rig.solve_limb(shoulder,target,upper.length,fore.length,(-1 if side=="R" else 1,0,-.3))
        rig.aim_bone(upper.name,shoulder,elbow);rig.aim_bone(fore.name,elbow,wrist)
        rig.aim_bone(f"hand.{side}",wrist,wrist+Vector((0,-.09,.0072)))
    left=rig.TARGETS["hand.L"]@rig.REST["hand.L"].inverted()
    for i in range(3):rig.set_target(f"finger.L.{i}",left@rig.REST[f"finger.L.{i}"])
    for side,sign in (("R",-1),("L",1)):
        upper=rig.RIG.data.bones[f"thigh.{side}"];lower=rig.RIG.data.bones[f"shin.{side}"]
        phase=(gait+(math.pi if side=="L" else 0))%math.tau
        along=-.05*math.cos(phase) if moving else -.01
        lift=-math.sin(phase)*.03 if moving and phase>math.pi else 0
        ankle=Vector((sign*.13,along,.072+lift));hip=base@upper.head_local
        knee,ankle=rig.solve_limb(hip,ankle,upper.length,lower.length,(0,-1,.02))
        rig.aim_bone(upper.name,hip,knee);rig.aim_bone(lower.name,knee,ankle)
        rig.aim_bone(f"foot.{side}",ankle,ankle+Vector((0,-.12,-.018)))
    right=rig.TARGETS["hand.R"]@rig.REST["hand.R"].inverted();factor=1.85 if high else 1
    scale=rig.around(rig.HAND_REST["R"],Matrix.Diagonal((factor,factor,factor,1)))
    rig.set_target("slingshot.R",right@scale@rig.REST["slingshot.R"])
    tips=[right@scale@v for v in (rig.FORK_LEFT,rig.FORK_RIGHT)]
    pinch=left@rig.POUCH_REST
    pouch=(tips[0]+tips[1])*.5 if attack is None or attack>=release+.08 else pinch
    if attack is not None and release<=attack<release+.08:pouch=pinch.lerp((tips[0]+tips[1])*.5,rig.smooth((attack-release)/.08))
    for point,co in zip(rig.BAND.data.splines[0].points,(tips[0],pouch,tips[1])):point.co=(*co,1)
    rig.POUCH.location=pouch-rig.POUCH_REST
    bpy.context.view_layer.update()
    return {"rightHand":list(rig.TARGETS["hand.R"].translation),"leftHand":list(rig.TARGETS["hand.L"].translation)}


def camera(view):
    rig.CAMERA.location=VIEWS[view]
    rig.CAMERA.rotation_euler=(Vector(TARGET)-rig.CAMERA.location).to_track_quat("-Z","Y").to_euler()


def render_before():
    # A fair comparison uses the old model at the same image resolution, not
    # an enlarged 128px game cell. Loading it never saves over the live model.
    bpy.ops.wm.open_mainfile(filepath=str(ROOT/"assets"/"models"/"butter.blend"))
    scene=bpy.context.scene;scene.frame_set(1)
    scene.render.resolution_x=scene.render.resolution_y=384
    scene.eevee.taa_render_samples=16
    scene.render.filepath=str(OUTPUT/"before.png")
    bpy.ops.render.render(write_still=True)


def main():
    if "--before-only" in sys.argv:
        render_before();return
    rig.configure_scene()
    # All illustration colors are flat; the model itself supplies the depth.
    for name,color in {
        "skin":(.995,.91,.84),"hair":(.88,.73,.65),"white":(1,.99,.95),
        "yellow":(1,.86,.48),"gold":(.91,.66,.31),"pink":(.96,.70,.72),
        "brown":(.39,.245,.20),"cream":(1,.88,.66),"blue":(.48,.72,.84),
        "blue-light":(.68,.86,.91),"blue-dark":(.38,.44,.64),"blush":(1,.66,.66),
        "blush-line":(.87,.43,.45),"hair-line":(.72,.53,.45),"wood":(.56,.34,.20)
    }.items():flat_material(name,color)
    # Warm outline, not the dark brown/black plastic shell of the first model.
    flat_material("ink",(.45,.29,.25));rig.MATERIALS["ink"].use_backface_culling=True
    skeleton();character();rig.bow=ribbon;rig.create_weapon();shorten_body()
    rig.pose=pose;rig.CAMERA.data.ortho_scale=2.35;camera("front")
    actions=rig.record_actions()
    instructions=bpy.data.texts["START HERE - Butter model"]
    instructions.clear();instructions.write(
        "Butter redesign study - not applied to the live game.\n"
        "Flat illustrated eyes, continuous swept hair, compact body and attached hands.\n"
        "Space plays the synchronized timeline, including the elastic and pouch.\n"
        "Idle 1-25 / Walk 31-55 / Slingshot 61-85 / Walk_Slingshot 91-115 / High 121-145.\n"
        "Right hand holds the fork. Left hand draws the band. No camera-dependent hand swap.\n"
        "Regenerate: blender -b --factory-startup --python tools/build_butter_study.py\n")
    bpy.context.scene.use_preview_range=False;bpy.context.scene.frame_set(1)
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type=="VIEW_3D":area.spaces.active.region_3d.view_location=Vector(TARGET)
    output_model=ROOT/"assets"/"models"/"butter-study.blend"
    bpy.ops.wm.save_as_mainfile(filepath=str(output_model),compress=True)
    if "--model-only" in sys.argv:return
    rig.clear_animation();OUTPUT.mkdir(parents=True,exist_ok=True)
    scene=bpy.context.scene;scene.render.resolution_x=scene.render.resolution_y=384
    scene.eevee.taa_render_samples=16
    frames=[]
    for view in VIEWS:
        camera(view);report=pose()
        rig.render_frame(OUTPUT/f"{view}.png");frames.append({"view":view,"pose":"idle",**report})
    for view in ("front","left"):
        camera(view);report=pose(0,.46)
        rig.render_frame(OUTPUT/f"{view}-ready.png");frames.append({"view":view,"pose":"ready",**report})
    (OUTPUT/"study.json").write_text(json.dumps({"version":"study-1","model":"../models/butter-study.blend","bodyScale":BODY_SCALE,"camera":{"target":TARGET,"scale":2.35,"positions":VIEWS},"actions":actions,"frames":frames},indent=2)+"\n")
    render_before()
    print("BUTTER_STUDY_COMPLETE: separate model and six review images; live assets unchanged",flush=True)


if __name__=="__main__":main()
