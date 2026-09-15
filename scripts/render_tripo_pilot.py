"""Render one downloaded Tripo candidate for visual/scale inspection."""

from __future__ import annotations

import math
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
INPUT = ROOT / "evidence" / "blender-mcp-3d-board" / "tripo-pilot" / "enchanter_tripo.glb"
OUTPUT = ROOT / "evidence" / "blender-mcp-3d-board" / "tripo-pilot" / "enchanter_tripo.png"
BLEND = ROOT / "evidence" / "blender-mcp-3d-board" / "tripo-pilot" / "enchanter_tripo_candidate.blend"


def look_at(camera: bpy.types.Object, target: Vector) -> None:
    camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()


bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(INPUT))
meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
if not meshes:
    raise RuntimeError("Tripo candidate contains no mesh objects")

corners = [obj.matrix_world @ Vector(corner) for obj in meshes for corner in obj.bound_box]
minimum = Vector((min(point.x for point in corners), min(point.y for point in corners), min(point.z for point in corners)))
maximum = Vector((max(point.x for point in corners), max(point.y for point in corners), max(point.z for point in corners)))
center = (minimum + maximum) * 0.5
size = max(maximum.x - minimum.x, maximum.y - minimum.y, maximum.z - minimum.z, 1.0)

ground = bpy.data.materials.new("Inspection Ground")
ground.diffuse_color = (0.09, 0.12, 0.11, 1.0)
bpy.ops.mesh.primitive_plane_add(size=size * 4, location=(center.x, center.y, minimum.z - size * 0.015))
bpy.context.object.data.materials.append(ground)

world = bpy.context.scene.world or bpy.data.worlds.new("World")
bpy.context.scene.world = world
world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.025, 0.05, 0.055, 1.0)
world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.45

bpy.ops.object.camera_add(location=center + Vector((size * 1.55, size * 1.25, size * 1.55)))
camera = bpy.context.object
camera.name = "Tripo Pilot Inspection Camera"
camera.data.lens = 52
look_at(camera, center)
bpy.context.scene.camera = camera

bpy.ops.object.light_add(type="AREA", location=center + Vector((-size, -size * 0.8, size * 2.2)))
key = bpy.context.object
key.name = "Tripo Pilot Key"
key.data.energy = 4200
key.data.shape = "DISK"
key.data.size = size * 1.5
look_at(key, center)

bpy.ops.object.light_add(type="AREA", location=center + Vector((size * 1.2, size * 0.4, size)))
fill = bpy.context.object
fill.name = "Tripo Pilot Fill"
fill.data.energy = 2200
fill.data.color = (0.45, 0.7, 0.85)
fill.data.size = size
look_at(fill, center)

bpy.ops.object.light_add(type="SUN", location=center + Vector((0, 0, size * 2)))
sun = bpy.context.object
sun.name = "Tripo Pilot Sun"
sun.data.energy = 2.2
sun.rotation_euler = (math.radians(28), math.radians(-32), math.radians(-24))

scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE_NEXT"
scene.render.resolution_x = 900
scene.render.resolution_y = 700
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.filepath = str(OUTPUT)
scene.render.film_transparent = False
scene.render.image_settings.color_mode = "RGBA"
scene.view_settings.look = "AgX - Medium High Contrast"
bpy.ops.wm.save_as_mainfile(filepath=str(BLEND))
bpy.ops.render.render(write_still=True)
print("TRIPO_PILOT_RENDER", {"output": str(OUTPUT), "blend": str(BLEND), "meshes": len(meshes), "size": tuple(round(value, 3) for value in (maximum - minimum))})
