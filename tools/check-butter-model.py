"""Validate the editable native Blender deliverable, not only exported pixels."""
import bpy
from mathutils import Vector

rig=bpy.data.objects["Butter_Rig"]
assert len(rig.data.bones)==24
assert rig.data.bones["slingshot.R"].parent.name=="hand.R"
assert rig["holding_hand"]=="hand.R" and rig["drawing_hand"]=="hand.L"
meshes=[o for o in bpy.data.objects if o.type=="MESH" and o.parent==rig]
assert len(meshes)>70,"Expected actual modeled body parts, not an image plane"
assert sum(len(o.data.vertices) for o in meshes)>10000
for obj in meshes:
    assert any(m.type=="ARMATURE" and m.object==rig for m in obj.modifiers)
    assert len(obj.vertex_groups)>0
    if obj.name.startswith(("Slingshot ","Fork cap")):
        assert [g.name for g in obj.vertex_groups]==["slingshot.R"]
for name in ("Idle","Walk","Slingshot","Walk_Slingshot","High_Slingshot","Butter_All_Clips"):
    assert name in bpy.data.actions
    assert len(bpy.data.actions[name].fcurves)>100
band=bpy.data.objects["Elastic_R_fork_to_L_pinch"]
pouch=bpy.data.objects["Elastic leather pouch"]
assert rig.animation_data.action.name=="Butter_All_Clips"
assert band.data.animation_data.action.name=="Butter_All_Clips_Elastic"
assert pouch.animation_data.action.name=="Butter_All_Clips_Pouch"

# Master timeline: same weapon wrist, actually moving opposite feet/left hand.
def sample(frame):
    bpy.context.scene.frame_set(frame)
    bpy.context.view_layer.update()
    return {n:rig.pose.bones[n].matrix.translation.copy() for n in ("hand.R","hand.L","foot.R","foot.L")}
a,b=sample(91),sample(103)
assert (a["foot.R"]-b["foot.R"]).length>.15
assert (a["foot.L"]-b["foot.L"]).length>.15
assert (a["hand.L"]-b["hand.L"]).length>.15
assert (a["hand.R"]-b["hand.R"]).length<.03
sample(135)
assert rig.pose.bones["slingshot.R"].scale.length>2.5,"High skill must grow the held weapon"
print("BUTTER_NATIVE_MODEL_OK: real weighted meshes, 24 bones, synchronized native actions, opposite foot contacts, fixed weapon wrist")
