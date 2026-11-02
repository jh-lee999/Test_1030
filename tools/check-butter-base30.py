"""Check the saved native appearance study, not its artistic quality."""
import hashlib
import json
import struct
from pathlib import Path

import bpy

ROOT=Path(__file__).resolve().parents[1]
manifest=json.loads((ROOT/"assets/butter-base30/model.json").read_text())
rig=bpy.data.objects["Butter_Base_Rig"]
assert rig.type=="ARMATURE"
assert manifest["stage"]=="appearance-review-not-live-game"
assert manifest["baseSHA256"]==hashlib.sha256((ROOT/"assets/vendor/kaykit-base30/Barbarian.glb").read_bytes()).hexdigest()
assert manifest["approvedArtSHA256"]==hashlib.sha256((ROOT/"assets/butter-2d-study.png").read_bytes()).hexdigest()
base=[bpy.data.objects[name] for name in manifest["baseMeshes"]]
assert len(base)==6
for obj in base:
    assert obj["base_original_mesh"].startswith("Barbarian_")
    assert any(m.type=="ARMATURE" and m.object==rig for m in obj.modifiers)
    assert all(v.groups for v in obj.data.vertices)

head=bpy.data.objects["Base_Head"]
assert head["head_remodeled"] and head["facial_ink_baked_to_base_uv"]
assert [uv.name for uv in head.data.uv_layers]==["HeadAtlasUV"]
assert head.dimensions.y>.6, "Head must have real depth"
atlas=bpy.data.images["Butter_Face_Atlas30"]
assert atlas.size[:]==(2048,2048) and atlas.packed_file
for obj in bpy.data.objects:
    if obj.type!="MESH":continue
    assert not obj.name.startswith(("Art_","ImagePlane","Projection_"))
    for material in obj.data.materials:
        if not material or not material.use_nodes:continue
        for node in material.node_tree.nodes:
            if node.type=="TEX_IMAGE":
                assert obj==head and node.image==atlas, "Only facial ink uses a texture"
assert rig.data.bones["ButterSlingshot.R"].parent.name=="hand.r"
assert abs(rig.data.bones["ButterTail"].head_local.x)<.00001
assert bpy.data.objects["Hair_Continuous_Silhouette"].dimensions.y>.6
assert len(bpy.data.actions)==0, "Do not export the source clips as finished Butter animation"

glb=(ROOT/"assets/models/butter-base30.glb").read_bytes()
magic,version,length=struct.unpack_from("<III",glb)
assert magic==0x46546C67 and version==2 and length==len(glb)
json_length,json_type=struct.unpack_from("<II",glb,12)
assert json_type==0x4E4F534A
document=json.loads(glb[20:20+json_length])
assert document.get("skins") and len(document["meshes"])>10
assert not document.get("animations")
assert len(document["images"])==1 and "bufferView" in document["images"][0]
assert all("uri" not in buffer for buffer in document["buffers"])
for view in manifest["views"]:
    assert (ROOT/"assets/butter-base30"/(view+".png")).stat().st_size>10000
print("BASE30_NATIVE_OK: weighted base, closed remodeled head, embedded facial UV, native hair/outfit, correct prop bones, self-contained GLB; no animation claims")
