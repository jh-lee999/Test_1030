"""Validate geometry and asset identity; art likeness is reviewed visually."""
import hashlib
import json
import struct
from pathlib import Path

import bmesh
import bpy

root=Path(__file__).resolve().parents[1]
rig=bpy.data.objects["Butter_Reference_Rig"]
assert len(rig.data.bones)==24
assert rig.data.bones["slingshot.R"].parent.name=="hand.R"
assert rig["holding_hand"]=="hand.R"
volumes=[o for o in bpy.data.objects if o.get("closed_volume")]
assert len(volumes)>=30
for obj in volumes:
    bm=bmesh.new();bm.from_mesh(obj.data)
    assert all(edge.is_manifold for edge in bm.edges),f"Open edge in {obj.name}"
    assert abs(bm.calc_volume())>.000001,f"Not a 3D solid: {obj.name}"
    bm.free()
    assert obj.parent==rig and any(m.type=="ARMATURE" for m in obj.modifiers)
face=bpy.data.objects["Painted_Cheek_Face_Volume"]
assert face["depth"]>.5,"Face must have actual depth, not a card"
paint=bpy.data.objects["Painted_Cheek_Face_Paint"]
assert len(paint.data.uv_layers)==1
assert max(v.co.y for v in paint.data.vertices)-min(v.co.y for v in paint.data.vertices)>.035
assert bpy.data.objects["Tail_Center_Stem"].vertex_groups[0].name=="tail"
packed=[i for i in bpy.data.images if i.packed_file]
assert len(packed)>=2,"The delivered .blend must contain its textures"
front=next(i for i in packed if Path(i.filepath).name=="butter-2d-study.png")
assert tuple(front.size)==(1199,1312)

binary=(root/"assets/models/butter-reference29.glb").read_bytes()
assert binary[:4]==b"glTF" and struct.unpack_from("<I",binary,8)[0]==len(binary)
size=struct.unpack_from("<I",binary,12)[0];gltf=json.loads(binary[20:20+size])
assert len(gltf["meshes"])>=60 and len(gltf["skins"][0]["joints"])==24
assert len(gltf["images"])>=2
for material in gltf["materials"]:
    if material.get("name","").startswith("Art_"):
        assert "KHR_materials_unlit" in material.get("extensions",{})
        assert "baseColorTexture" in material["pbrMetallicRoughness"]
assert not gltf.get("animations"),"Appearance study must not pretend to be a finished animation set"
print(f"BUTTER_REFERENCE_OK: {len(volumes)} closed solids, 24-bone rig, curved painted face, packed textures, self-contained textured GLB")
