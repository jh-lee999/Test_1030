"""Render the character atlas into a compact, mesh-deformed animation sheet."""

from __future__ import annotations

import math
import subprocess
import tempfile
from pathlib import Path

import bpy


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "starlight-atlas.webp"
OUTPUT = ROOT / "assets" / "animated-characters.webp"
FRAME_COUNT = 8
FRAME_SIZE = 192
GRID = 14
SPRITES = (
    ("player", 0, 0),
    ("bat", 1, 0),
    ("shade", 2, 0),
    ("brute", 3, 0),
    ("elite", 0, 1),
)


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for block in bpy.data.meshes:
        bpy.data.meshes.remove(block)
    for block in bpy.data.materials:
        bpy.data.materials.remove(block)


def configure_scene() -> bpy.types.Scene:
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.eevee.taa_render_samples = 1
    scene.render.resolution_x = FRAME_SIZE
    scene.render.resolution_y = FRAME_SIZE
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.color_depth = "8"
    scene.render.resolution_percentage = 100
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.look = "Medium High Contrast"
    scene.view_settings.exposure = 0
    scene.view_settings.gamma = 1
    scene.render.image_settings.color_mode = "RGBA"

    bpy.ops.object.camera_add(location=(0, 0, 10))
    camera = bpy.context.object
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = 2.28
    scene.camera = camera
    return scene


def make_material() -> bpy.types.Material:
    image = bpy.data.images.load(str(SOURCE), check_existing=True)
    image.colorspace_settings.name = "sRGB"

    material = bpy.data.materials.new("AtlasEmission")
    material.use_nodes = True
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    nodes.clear()

    texture = nodes.new("ShaderNodeTexImage")
    texture.image = image
    texture.interpolation = "Linear"
    transparent = nodes.new("ShaderNodeBsdfTransparent")
    emission = nodes.new("ShaderNodeEmission")
    mix = nodes.new("ShaderNodeMixShader")
    output = nodes.new("ShaderNodeOutputMaterial")
    links.new(texture.outputs["Color"], emission.inputs["Color"])
    links.new(texture.outputs["Alpha"], mix.inputs["Fac"])
    links.new(transparent.outputs[0], mix.inputs[1])
    links.new(emission.outputs[0], mix.inputs[2])
    links.new(mix.outputs[0], output.inputs["Surface"])
    return material


def make_grid(material: bpy.types.Material):
    vertices = []
    faces = []
    for row in range(GRID + 1):
        y = -1 + row * 2 / GRID
        for col in range(GRID + 1):
            x = -1 + col * 2 / GRID
            vertices.append((x, y, 0))
    for row in range(GRID):
        for col in range(GRID):
            a = row * (GRID + 1) + col
            faces.append((a, a + 1, a + GRID + 2, a + GRID + 1))

    mesh = bpy.data.meshes.new("AnimatedSpriteMesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    uv_layer = mesh.uv_layers.new(name="AtlasUV")
    sprite = bpy.data.objects.new("AnimatedSprite", mesh)
    bpy.context.collection.objects.link(sprite)
    sprite.data.materials.append(material)
    return sprite, tuple((vertex[0], vertex[1]) for vertex in vertices), uv_layer


def set_uv(mesh, uv_layer, kind: str, atlas_col: int, atlas_row: int) -> None:
    u0 = atlas_col / 4
    u1 = (atlas_col + 1) / 4
    if kind == "player":
        u1 = 0.277
    elif kind == "bat":
        u0 = 0.28
    v0 = 1 - (atlas_row + 1) / 2
    v1 = 1 - atlas_row / 2
    for polygon in mesh.polygons:
        for loop_index in polygon.loop_indices:
            vertex = mesh.vertices[mesh.loops[loop_index].vertex_index]
            normalized_x = (vertex.co.x + 1) / 2
            normalized_y = (vertex.co.y + 1) / 2
            uv_layer.data[loop_index].uv = (
                u0 + normalized_x * (u1 - u0),
                v0 + normalized_y * (v1 - v0),
            )


def deform(kind: str, x: float, y: float, phase: float) -> tuple[float, float]:
    wave = math.sin(phase)
    if kind == "player":
        return x * (1 + 0.018 * wave) + y * 0.024 * wave, y * (1 - 0.016 * wave)
    if kind == "bat":
        wing_weight = min(1, abs(x) ** 1.5)
        return x * (1 + 0.075 * wave), y + wing_weight * 0.095 * wave
    if kind == "shade":
        return x * (1 + 0.026 * wave), y + math.sin(phase + x * 2.4) * 0.025 * (1 - max(0, y))
    if kind == "brute":
        return x * (1 + 0.024 * wave) + y * 0.018 * wave, y * (1 - 0.018 * wave)
    pulse = 0.022 * wave
    return x * (1 + pulse), y * (1 + pulse) + math.sin(phase + x * 1.5) * 0.012


def pose(sprite, base_vertices, kind: str, frame: int) -> None:
    phase = frame / FRAME_COUNT * math.tau
    for index, (base_x, base_y) in enumerate(base_vertices):
        x, y = deform(kind, base_x, base_y, phase)
        sprite.data.vertices[index].co = (x, y, 0)
    sprite.rotation_euler[2] = math.sin(phase) * (0.012 if kind != "bat" else 0.025)
    hover = {"player": 0.018, "bat": 0.055, "shade": 0.04, "brute": 0.012, "elite": 0.025}[kind]
    sprite.location.y = math.sin(phase) * hover
    sprite.data.update()


def main() -> None:
    if not SOURCE.exists():
        raise FileNotFoundError(SOURCE)
    clear_scene()
    scene = configure_scene()
    material = make_material()
    sprite, base_vertices, uv_layer = make_grid(material)

    with tempfile.TemporaryDirectory(prefix="starlight-animation-") as temp_dir:
        temp = Path(temp_dir)
        rendered_frames = []
        for kind, atlas_col, atlas_row in SPRITES:
            set_uv(sprite.data, uv_layer, kind, atlas_col, atlas_row)
            for frame in range(FRAME_COUNT):
                pose(sprite, base_vertices, kind, frame)
                frame_path = temp / f"{kind}-{frame:02d}.png"
                scene.render.filepath = str(frame_path)
                bpy.ops.render.render(write_still=True)
                rendered_frames.append(str(frame_path))

        subprocess.run(
            [
                "magick",
                "montage",
                *rendered_frames,
                "-tile",
                f"{FRAME_COUNT}x{len(SPRITES)}",
                "-geometry",
                f"{FRAME_SIZE}x{FRAME_SIZE}+0+0",
                "-background",
                "none",
                "-strip",
                "-quality",
                "84",
                str(OUTPUT),
            ],
            check=True,
        )
    print(f"Rendered {FRAME_COUNT * len(SPRITES)} frames to {OUTPUT}")


if __name__ == "__main__":
    main()
