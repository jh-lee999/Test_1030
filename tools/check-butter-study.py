"""Native Blender checks for the isolated redesign, not a visual-quality score."""
import bpy

rig=bpy.data.objects["Butter_Rig"]
assert len(rig.data.bones)==24
assert rig.data.bones["slingshot.R"].parent.name=="hand.R"
assert "Continuous long hair" in bpy.data.objects
assert "Swept fringe" in bpy.data.objects
assert not any(o.name.startswith("Eye ink") for o in bpy.data.objects)
for side in (-1,1):
    eye=bpy.data.objects["Flat eye white "+str(side)]
    ys=[v.co.y for v in eye.data.vertices]
    assert max(ys)-min(ys)<.006,"Eyes must remain a thin illustration, not a sphere"
for name in ("Idle","Walk","Slingshot","Walk_Slingshot","High_Slingshot","Butter_All_Clips"):
    assert name in bpy.data.actions
assert rig.animation_data.action.name=="Butter_All_Clips"
assert bpy.data.objects["Elastic_R_fork_to_L_pinch"].data.animation_data.action.name=="Butter_All_Clips_Elastic"

def sample(frame):
    bpy.context.scene.frame_set(frame);bpy.context.view_layer.update()
    return {n:rig.pose.bones[n].matrix.translation.copy() for n in ("hand.R","hand.L","foot.R","foot.L")}
idle=sample(1)
assert abs(idle["hand.R"].x)<.36 and abs(idle["hand.L"].x)<.36
for frame in range(61,86):
    positions=sample(frame)
    assert max(abs(positions[n].x) for n in ("hand.R","hand.L"))<.36,"Don't stretch arms outside hair to show the weapon"
a,b=sample(31),sample(43)
assert (a["foot.R"]-b["foot.R"]).length>.085
assert (a["foot.L"]-b["foot.L"]).length>.085
a,b=sample(63),sample(72)
assert (a["hand.L"]-b["hand.L"]).length>.075
print("BUTTER_STUDY_OK: thin illustrated eyes, compact attached hands, opposite foot contacts, editable synchronized rig")
