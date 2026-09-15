"""Build the Guildholm 3D board authoring source and browser handoff.

This keeps the editable Blender source and deterministically integrates the
accepted Magnific/Tripo handoff for all fifteen landmarks. Missing candidates
fall back to the authored blockout so the playable route remains recoverable.
Run with the project's pinned Blender executable.
"""

from __future__ import annotations

import math
import hashlib
import json
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "public" / "board3d"
EVIDENCE_DIR = ROOT / "evidence" / "blender-mcp-3d-board"
TRIPO_BATCH_DIR = EVIDENCE_DIR / "tripo-batch"
TRIPO_PILOT_DIR = EVIDENCE_DIR / "tripo-pilot"
BLEND_PATH = OUT_DIR / "guildholm_3d_board.blend"
GLB_PATH = OUT_DIR / "guildholm_3d_board.glb"
TRIPO_MANIFEST_PATH = OUT_DIR / "tripo-manifest.json"
RENDER_PATH = EVIDENCE_DIR / "guildholm_3d_board.png"


LOCATION_ORDER = [
    "noble-heights", "graveyard", "general-store", "bank", "forge",
    "guild-hall", "cave", "academy", "enchanter", "armory",
    "rusty-tankard", "shadow-market", "fence", "slums", "landlord",
]

POSITIONS = {
    "noble-heights": (-10.5, -6.8),
    "graveyard": (-11.4, -2.2),
    "general-store": (-10.2, 2.5),
    "bank": (-10.5, 7.2),
    "forge": (-7.0, 9.8),
    "guild-hall": (-2.6, 10.1),
    "cave": (1.4, 10.1),
    "academy": (5.6, 9.7),
    "enchanter": (9.3, 7.3),
    "armory": (10.8, 3.6),
    "rusty-tankard": (10.6, -0.9),
    "shadow-market": (9.0, -5.4),
    "fence": (5.0, -7.0),
    "slums": (0.0, -7.2),
    "landlord": (-5.2, -7.0),
}

COLORS = {
    "grass": "#365846", "grass_edge": "#243b31", "road": "#c49a63",
    "road_edge": "#735338", "parchment": "#e6d1a0", "wood": "#5b3926",
    "wood_light": "#a7774c", "stone": "#9aa1a4", "stone_dark": "#4f5b60",
    "roof": "#a6543d", "roof_dark": "#64342e", "gold": "#d8ab4d",
    "water": "#3c7280", "purple": "#7853a4", "glow": "#f0a13c",
    "leaf": "#47704d", "leaf_dark": "#294c3a", "slate": "#677788",
}


# Generated GLBs are accepted into the board only when they exist in this
# explicit handoff map. Missing files deliberately fall back to the authored
# blockout so a partial external-service run never breaks the playable route.
TRIPO_ASSETS = {
    "noble-heights": TRIPO_BATCH_DIR / "noble-heights.glb",
    "graveyard": TRIPO_BATCH_DIR / "graveyard.glb",
    "general-store": TRIPO_BATCH_DIR / "general-store.glb",
    "bank": TRIPO_BATCH_DIR / "bank.glb",
    "forge": TRIPO_BATCH_DIR / "forge.glb",
    "guild-hall": TRIPO_BATCH_DIR / "guild-hall.glb",
    "cave": TRIPO_BATCH_DIR / "cave.glb",
    "academy": TRIPO_BATCH_DIR / "academy.glb",
    "enchanter": TRIPO_PILOT_DIR / "enchanter_tripo.glb",
    "armory": TRIPO_BATCH_DIR / "armory.glb",
    "rusty-tankard": TRIPO_BATCH_DIR / "rusty-tankard.glb",
    "shadow-market": TRIPO_BATCH_DIR / "shadow-market.glb",
    "fence": TRIPO_BATCH_DIR / "fence.glb",
    "slums": TRIPO_BATCH_DIR / "slums.glb",
    "landlord": TRIPO_BATCH_DIR / "landlord.glb",
}

TRIPO_ENVELOPES = {
    "noble-heights": (4.6, 4.6, 5.4), "graveyard": (3.8, 3.8, 3.6),
    "general-store": (3.5, 3.4, 3.4), "bank": (3.6, 3.5, 3.8),
    "forge": (3.9, 3.8, 3.5), "guild-hall": (4.1, 3.8, 3.8),
    "cave": (3.8, 3.7, 3.2), "academy": (4.2, 3.8, 4.8),
    "enchanter": (3.2, 3.2, 5.6), "armory": (3.5, 3.4, 3.6),
    "rusty-tankard": (3.8, 3.7, 3.8), "shadow-market": (3.8, 3.7, 3.5),
    "fence": (3.8, 3.7, 3.5), "slums": (4.0, 3.8, 3.2),
    "landlord": (3.5, 3.4, 3.7),
}

TRIPO_RESULTS = {}
TRIPO_RUNTIME_FACE_BUDGET = 4500


def rgb(value: str):
    value = value.lstrip("#")
    return tuple(int(value[index:index + 2], 16) / 255 for index in (0, 2, 4))


MATERIALS = {}


def material(name: str, value: str, roughness=0.78, metallic=0.0, emission=None):
    if name in MATERIALS:
        return MATERIALS[name]
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*rgb(value), 1.0)
    mat.use_nodes = True
    principled = mat.node_tree.nodes.get("Principled BSDF")
    if principled:
        principled.inputs["Base Color"].default_value = (*rgb(value), 1.0)
        principled.inputs["Roughness"].default_value = roughness
        principled.inputs["Metallic"].default_value = metallic
        if emission:
            emission_input = principled.inputs.get("Emission Color") or principled.inputs.get("Emission")
            strength_input = principled.inputs.get("Emission Strength")
            if emission_input:
                emission_input.default_value = (*rgb(emission), 1.0)
            if strength_input:
                strength_input.default_value = 2.2
    MATERIALS[name] = mat
    return mat


def assign(obj, mat):
    obj.data.materials.append(mat)
    return obj


def finish_mesh(obj, bevel_amount=0.0):
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel_amount > 0:
        modifier = obj.modifiers.new("soft hand-painted edges", "BEVEL")
        modifier.width = bevel_amount
        modifier.segments = 2
        modifier.limit_method = "ANGLE"
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    obj.select_set(False)
    return obj


def tag(obj, location_id=None, parent=None, name=None):
    if parent:
        obj.parent = parent
    if location_id:
        obj["locationId"] = location_id
        obj.name = name or f"location_{location_id}_{obj.name}"
    elif name:
        obj.name = name
    return obj


def cube(name, location, dimensions, mat, parent=None, location_id=None, bevel_amount=0.0, rotation=None):
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = assign(bpy.context.object, mat)
    obj.dimensions = dimensions
    if rotation:
        obj.rotation_euler = rotation
    finish_mesh(obj, bevel_amount)
    return tag(obj, location_id, parent, name)


def cylinder(name, location, radius, depth, mat, parent=None, location_id=None, vertices=12, bevel_amount=0.0, rotation=None):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location)
    obj = assign(bpy.context.object, mat)
    obj.rotation_euler = rotation or (-math.pi / 2, 0, 0)
    finish_mesh(obj, bevel_amount)
    return tag(obj, location_id, parent, name)


def cone(name, location, radius, depth, mat, parent=None, location_id=None, vertices=4, rotation=None, scale=None):
    bpy.ops.mesh.primitive_cone_add(vertices=vertices, radius1=radius, radius2=radius * 0.14, depth=depth, location=location)
    obj = assign(bpy.context.object, mat)
    obj.rotation_euler = rotation or (-math.pi / 2, 0, 0)
    if scale:
        obj.scale = scale
    finish_mesh(obj, 0.02)
    return tag(obj, location_id, parent, name)


def ico(name, location, scale, mat, parent=None, location_id=None):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=1.0, location=location)
    obj = assign(bpy.context.object, mat)
    obj.scale = scale
    finish_mesh(obj, 0.04)
    return tag(obj, location_id, parent, name)


def make_root(location_id):
    root = bpy.data.objects.new(f"location_{location_id}", None)
    bpy.context.collection.objects.link(root)
    root.empty_display_type = "PLAIN_AXES"
    root["locationId"] = location_id
    root["source"] = "procedural-blender-v1"
    return root


def _object_bounds(objects):
    corners = [obj.matrix_world @ Vector(corner) for obj in objects for corner in obj.bound_box]
    minimum = Vector((min(point.x for point in corners), min(point.y for point in corners), min(point.z for point in corners)))
    maximum = Vector((max(point.x for point in corners), max(point.y for point in corners), max(point.z for point in corners)))
    return minimum, maximum


def _sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def import_tripo_asset(root, location_id, x, z):
    path = TRIPO_ASSETS.get(location_id)
    if not path or not path.exists():
        return False

    before = set(bpy.context.scene.objects)
    try:
        bpy.ops.import_scene.gltf(filepath=str(path))
    except RuntimeError as error:
        print("TRIPO_IMPORT_FALLBACK", location_id, str(error))
        return False

    imported = [obj for obj in bpy.context.scene.objects if obj not in before]
    if not imported:
        print("TRIPO_IMPORT_FALLBACK", location_id, "no imported objects")
        return False

    container = bpy.data.objects.new(f"tripo_{location_id}", None)
    bpy.context.collection.objects.link(container)
    container.parent = root
    for obj in imported:
        if obj.parent is None:
            obj.parent = container

    mesh_imported = [obj for obj in imported if obj.type == "MESH"]
    if not mesh_imported:
        print("TRIPO_IMPORT_FALLBACK", location_id, "no mesh objects")
        return False
    source_faces = sum(len(obj.data.polygons) for obj in mesh_imported)
    for obj in mesh_imported:
        face_count = len(obj.data.polygons)
        if face_count <= TRIPO_RUNTIME_FACE_BUDGET:
            continue
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        modifier = obj.modifiers.new("runtime silhouette budget", "DECIMATE")
        modifier.ratio = TRIPO_RUNTIME_FACE_BUDGET / face_count
        bpy.ops.object.modifier_apply(modifier=modifier.name)
        obj.select_set(False)
    integrated_faces = sum(len(obj.data.polygons) for obj in mesh_imported)
    minimum, maximum = _object_bounds(mesh_imported)
    size = maximum - minimum
    target_width, target_depth, target_height = TRIPO_ENVELOPES[location_id]
    scale = min(target_width / max(size.x, 0.001), target_depth / max(size.z, 0.001), target_height / max(size.y, 0.001)) * 0.94
    container.scale = (scale, scale, scale)
    container.location = (x - ((minimum.x + maximum.x) * 0.5) * scale, 0.4 - minimum.y * scale, z - ((minimum.z + maximum.z) * 0.5) * scale)
    container["assetSource"] = "magnific-tripo"
    container["sourceFile"] = path.name
    container["normalizationScale"] = scale
    root["source"] = "magnific-tripo"
    root["assetFile"] = path.name
    source_plate = OUT_DIR / "backgrounds" / f"{location_id}.jpg"
    candidate_relative = "tripo-pilot/enchanter_tripo.glb" if location_id == "enchanter" else f"tripo-batch/{location_id}.glb"
    TRIPO_RESULTS[location_id] = {
        "locationId": location_id,
        "status": "accepted",
        "model": "tripo-p1",
        "faceLimit": 10000,
        "textureQuality": "standard",
        "referenceJpg": f"public/board3d/backgrounds/{location_id}.jpg",
        "referenceSha256": _sha256(source_plate) if source_plate.exists() else None,
        "candidateGlb": f"evidence/blender-mcp-3d-board/{candidate_relative}",
        "candidateSha256": _sha256(path),
        "sourceFile": path.name,
        "bounds": [round(value, 5) for value in size],
        "sourceFaces": source_faces,
        "integratedFaces": integrated_faces,
        "runtimeFaceBudget": TRIPO_RUNTIME_FACE_BUDGET,
        "normalizationScale": round(scale, 8),
    }
    for obj in mesh_imported:
        obj["locationId"] = location_id
        obj.select_set(False)
    print("TRIPO_IMPORT", {"location": location_id, "source": str(path), "scale": round(scale, 5), "bounds": tuple(round(value, 3) for value in size), "sourceFaces": source_faces, "integratedFaces": integrated_faces})
    return True


def house(root, location_id, x, z, width, depth, height, body_color, roof_color, sign_color=None):
    body = cube("body", (x, height / 2 + 0.4, z), (width, height, depth), material(f"{location_id}-body", body_color), root, location_id, 0.12)
    roof = cone("roof", (x, height + 1.0, z), 1.0, 1.0, material(f"{location_id}-roof", roof_color), root, location_id, 4, (-math.pi / 2, 0, 0), (width * 0.67, depth * 0.67, 1.45))
    cube("door", (x, height * 0.42 + 0.4, z + depth / 2 + 0.04), (width * 0.19, height * 0.48, 0.08), material(f"{location_id}-door", COLORS["wood"]), root, location_id, 0.03)
    for side in (-1, 1):
        cube("window", (x + side * width * 0.27, height * 0.62 + 0.4, z + depth / 2 + 0.05), (width * 0.16, height * 0.19, 0.07), material(f"{location_id}-window", COLORS["gold"]), root, location_id, 0.02)
    for side in (-1, 1):
        cube("timber", (x + side * width * 0.32, height * 0.52 + 0.4, z + depth / 2 + 0.08), (0.10, height * 0.78, 0.10), material(f"{location_id}-timber", COLORS["wood"]), root, location_id, 0.02)
    if sign_color:
        cube("sign", (x, height * 0.73 + 0.4, z + depth / 2 + 0.14), (width * 0.54, 0.20, 0.08), material(f"{location_id}-sign", sign_color), root, location_id, 0.04)
    return body


def tower(root, location_id, x, z, radius, height, stone_color, roof_color, glow_color=None):
    cylinder("tower", (x, height / 2 + 0.4, z), radius, height, material(f"{location_id}-tower", stone_color), root, location_id, 12, 0.08)
    cone("tower-roof", (x, height + 1.25, z), radius * 1.15, 2.2, material(f"{location_id}-tower-roof", roof_color), root, location_id, 12, None, (1, 1, 1))
    for level in (0.37, 0.62, 0.84):
        cube("tower-window", (x, height * level + 0.4, z + radius * 0.93), (radius * 0.24, height * 0.10, 0.07), material(f"{location_id}-window", glow_color or COLORS["gold"], emission=glow_color), root, location_id, 0.02)


def castle(root, location_id, x, z):
    cube("castle-keep", (x, 2.0, z), (3.0, 3.2, 2.8), material("noble-stone", COLORS["stone"]), root, location_id, 0.12)
    cone("castle-roof", (x, 4.2, z), 1.0, 1.0, material("noble-roof", COLORS["roof"]), root, location_id, 4, (-math.pi / 2, 0, 0), (2.1, 1.8, 1.8))
    for side in (-1, 1):
        tower(root, location_id, x + side * 1.35, z + 0.10, 0.58, 4.2, COLORS["stone"], COLORS["roof"])
    cube("castle-door", (x, 1.0, z + 1.46), (0.58, 1.40, 0.08), material("noble-door", COLORS["wood"]), root, location_id, 0.05)
    for side in (-1, 1):
        cube("castle-window", (x + side * 0.70, 2.25, z + 1.45), (0.30, 0.45, 0.08), material("noble-window", COLORS["gold"]), root, location_id, 0.03)


def graveyard(root, location_id, x, z):
    cylinder("chapel", (x, 1.10, z), 1.0, 2.2, material("grave-stone", COLORS["stone_dark"]), root, location_id, 8, 0.08)
    cone("chapel-roof", (x, 2.55, z), 1.14, 1.0, material("grave-roof", COLORS["slate"]), root, location_id, 8)
    for offset in (-1.4, -0.5, 0.5, 1.4):
        cube("headstone", (x + offset, 0.42, z + 0.65), (0.32, 0.70, 0.18), material("headstone", COLORS["stone"]), root, location_id, 0.04)
        cube("cross", (x + offset, 0.95, z + 0.65), (0.12, 0.65, 0.12), material("cross", COLORS["stone"]), root, location_id, 0.02)


def cave(root, location_id, x, z):
    dark = material("cave-dark", "#172127")
    rock = material("cave-rock", COLORS["stone_dark"])
    ico("cave-left", (x - 0.85, 0.75, z), (1.1, 1.4, 1.15), rock, root, location_id)
    ico("cave-right", (x + 0.85, 0.75, z), (1.1, 1.55, 1.2), rock, root, location_id)
    ico("cave-top", (x, 1.65, z), (1.5, 0.95, 1.15), rock, root, location_id)
    cube("cave-mouth", (x, 0.72, z + 0.38), (1.45, 1.0, 0.22), dark, root, location_id, 0.20)
    for offset in (-0.55, 0.55):
        ico("cave-crystal", (x + offset, 0.35, z + 0.58), (0.18, 0.42, 0.18), material("cave-crystal", "#4f95a6", emission="#4bafbd"), root, location_id)


def enchanter(root, location_id, x, z):
    tower(root, location_id, x, z, 0.9, 4.6, COLORS["stone_dark"], COLORS["purple"], COLORS["purple"])
    for offset in (-0.58, 0.58):
        ico("arcane-orb", (x + offset, 2.5, z + 0.75), (0.16, 0.16, 0.16), material("arcane-orb", COLORS["purple"], emission=COLORS["purple"]), root, location_id)


def academy(root, location_id, x, z):
    house(root, location_id, x, z, 3.2, 2.2, 2.4, COLORS["stone"], COLORS["slate"], COLORS["gold"])
    for side in (-1, 1):
        tower(root, location_id, x + side * 1.25, z + 0.10, 0.38, 3.4, COLORS["stone"], COLORS["slate"], COLORS["gold"])


def forge(root, location_id, x, z):
    house(root, location_id, x, z, 3.1, 2.5, 2.0, COLORS["roof_dark"], COLORS["roof"], COLORS["glow"])
    cylinder("forge-hearth", (x + 1.05, 0.66, z + 1.35), 0.33, 0.70, material("forge-glow", COLORS["glow"], emission=COLORS["glow"]), root, location_id, 12, 0.04, (math.pi / 2, 0, 0))
    for offset in (-0.7, -0.2, 0.3, 0.8):
        cube("forge-rack", (x + 1.2, 0.62, z + offset), (0.12, 0.95, 0.12), material("forge-metal", COLORS["stone_dark"], metallic=0.55), root, location_id, 0.03)


def market(root, location_id, x, z, dark=False):
    body = COLORS["stone_dark"] if dark else COLORS["wood_light"]
    roof = COLORS["purple"] if dark else COLORS["roof"]
    house(root, location_id, x, z, 2.8, 2.4, 1.8, body, roof, COLORS["gold"])
    for side in (-1, 1):
        cube("crate", (x + side * 1.0, 0.52, z + 1.35), (0.56, 0.62, 0.56), material(f"{location_id}-crate", COLORS["wood"]), root, location_id, 0.06)
    cone("market-awning", (x, 2.2, z + 1.7), 1.0, 0.45, material(f"{location_id}-awning", roof), root, location_id, 4, (-math.pi / 2, 0, 0), (1.45, 1.2, 0.6))


def tavern(root, location_id, x, z):
    house(root, location_id, x, z, 3.0, 2.7, 2.0, COLORS["wood_light"], COLORS["roof_dark"], COLORS["gold"])
    for side in (-1, 1):
        cylinder("tankard-post", (x + side * 1.2, 0.85, z + 1.48), 0.08, 1.4, material("tankard-post", COLORS["wood"]), root, location_id, 8)


def armory(root, location_id, x, z):
    house(root, location_id, x, z, 2.7, 2.2, 1.9, COLORS["stone_dark"], COLORS["slate"], COLORS["gold"])
    for offset in (-0.75, -0.25, 0.25, 0.75):
        cube("weapon-rack", (x + offset, 0.82, z + 1.27), (0.08, 1.35, 0.08), material("armory-metal", COLORS["gold"], metallic=0.6), root, location_id, 0.02)


def slums(root, location_id, x, z):
    house(root, location_id, x, z, 3.1, 2.5, 1.5, "#80634f", "#59463d", COLORS["roof_light"] if "roof_light" in COLORS else "#a98456")
    for offset in (-1.0, 0.0, 1.0):
        cube("patch", (x + offset, 1.20, z + 1.25), (0.45, 0.08, 0.26), material("slum-patch", "#b1845c"), root, location_id, 0.02)


def landlord(root, location_id, x, z):
    house(root, location_id, x, z, 2.7, 2.2, 1.9, "#a27c5a", "#6c4b39", COLORS["gold"])
    cube("paperwork", (x + 0.72, 0.80, z + 1.24), (0.32, 0.45, 0.06), material("paperwork", COLORS["parchment"]), root, location_id, 0.02)


def add_location(location_id):
    x, z = POSITIONS[location_id]
    root = make_root(location_id)
    if import_tripo_asset(root, location_id, x, z):
        return root
    TRIPO_RESULTS[location_id] = {
        "locationId": location_id,
        "status": "fallback",
        "model": None,
        "referenceJpg": f"public/board3d/backgrounds/{location_id}.jpg",
        "candidateGlb": None,
        "sourceFile": "procedural-blender-v1",
    }
    if location_id == "noble-heights": castle(root, location_id, x, z)
    elif location_id == "graveyard": graveyard(root, location_id, x, z)
    elif location_id == "cave": cave(root, location_id, x, z)
    elif location_id == "enchanter": enchanter(root, location_id, x, z)
    elif location_id == "academy": academy(root, location_id, x, z)
    elif location_id == "forge": forge(root, location_id, x, z)
    elif location_id == "shadow-market": market(root, location_id, x, z, dark=True)
    elif location_id == "fence": market(root, location_id, x, z)
    elif location_id == "rusty-tankard": tavern(root, location_id, x, z)
    elif location_id == "armory": armory(root, location_id, x, z)
    elif location_id == "slums": slums(root, location_id, x, z)
    elif location_id == "landlord": landlord(root, location_id, x, z)
    elif location_id == "bank": house(root, location_id, x, z, 2.8, 2.4, 2.3, COLORS["stone"], COLORS["slate"], COLORS["gold"])
    elif location_id == "guild-hall": house(root, location_id, x, z, 3.3, 2.5, 2.0, "#78634f", COLORS["roof"], COLORS["gold"])
    elif location_id == "general-store": house(root, location_id, x, z, 2.8, 2.2, 1.8, COLORS["wood_light"], COLORS["roof"], COLORS["gold"])
    return root


def add_tree(x, z, size=1.0):
    trunk = material("tree-trunk", "#5d452f")
    leaf = material("tree-leaf", COLORS["leaf"])
    cylinder("tree-trunk", (x, 0.78 * size, z), 0.16 * size, 1.55 * size, trunk, vertices=8, bevel_amount=0.03)
    ico("tree-crown", (x, 1.85 * size, z), (0.78 * size, 1.02 * size, 0.78 * size), leaf)
    ico("tree-crown-small", (x + 0.38 * size, 1.55 * size, z + 0.10 * size), (0.48 * size, 0.62 * size, 0.48 * size), material("tree-leaf-dark", COLORS["leaf_dark"]))


def add_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.meshes, bpy.data.curves, bpy.data.materials, bpy.data.cameras, bpy.data.lights):
        # Keep materials generated in this script only; no source assets are linked.
        pass

    grass = material("ground-grass", COLORS["grass"])
    grass_edge = material("ground-edge", COLORS["grass_edge"])
    road = material("road-dirt", COLORS["road"])
    road_edge = material("road-edge", COLORS["road_edge"])
    wood = material("board-wood", COLORS["wood"])
    parchment = material("center-parchment", COLORS["parchment"], roughness=0.92)
    water = material("pond-water", COLORS["water"], roughness=0.23)

    cube("board-edge", (0, -0.62, 1.0), (29.2, 0.72, 25.0), grass_edge, bevel_amount=0.35)
    cube("board-ground", (0, -0.20, 1.0), (28.5, 0.40, 24.3), grass, bevel_amount=0.22)
    cube("center-wood-frame", (0, 0.20, 1.0), (16.4, 0.28, 11.3), wood, bevel_amount=0.16)
    cube("center-parchment", (0, 0.40, 1.0), (15.5, 0.25, 10.4), parchment, bevel_amount=0.18)
    cube("center-inset", (0, 0.54, 1.0), (14.8, 0.08, 9.7), material("center-inset", "#d8bb7d", roughness=0.96), bevel_amount=0.12)

    for index, location_id in enumerate(LOCATION_ORDER):
        start = POSITIONS[location_id]
        end = POSITIONS[LOCATION_ORDER[(index + 1) % len(LOCATION_ORDER)]]
        dx, dz = end[0] - start[0], end[1] - start[1]
        length = math.sqrt(dx * dx + dz * dz)
        angle = math.atan2(dx, dz)
        midpoint = ((start[0] + end[0]) / 2, 0.13, (start[1] + end[1]) / 2)
        cube(f"road-{index:02d}", midpoint, (0.92, 0.12, length), road_edge, rotation=(0, angle, 0), bevel_amount=0.08)
        cube(f"road-fill-{index:02d}", (midpoint[0], 0.21, midpoint[2]), (0.68, 0.07, length), road, rotation=(0, angle, 0), bevel_amount=0.05)

    for location_id in LOCATION_ORDER:
        x, z = POSITIONS[location_id]
        cylinder("location-pad", (x, 0.37, z), 0.64, 0.10, material("location-pad", "#d7b263", metallic=0.15), vertices=16, bevel_amount=0.03)
        cylinder("location-inset", (x, 0.44, z), 0.49, 0.05, material("location-inset", "#4f735d"), vertices=16)
        add_location(location_id)

    # Fixed scenery avoids the center play area and keeps the ring legible.
    for x, z, size in [
        (-13.0, -9.6, 1.2), (-10.5, -10.2, 0.9), (-7.0, -10.7, 1.1), (7.2, -10.1, 1.0),
        (11.7, -8.8, 1.25), (13.0, -4.0, 0.9), (13.0, 1.8, 1.2), (12.8, 8.2, 1.0),
        (8.1, 11.7, 1.2), (1.8, 12.2, 0.85), (-4.2, 12.0, 1.0), (-9.5, 11.2, 1.15),
        (-13.0, 6.2, 1.2), (-13.4, 0.0, 0.9), (-13.1, -5.6, 1.0),
    ]:
        add_tree(x, z, size)

    for x, z, radius in [(-7.2, -3.4, 0.8), (6.7, -3.3, 0.75), (-8.7, 4.8, 0.55)]:
        cylinder("pond", (x, 0.05, z), radius, 0.05, water, vertices=20, bevel_amount=0.05)
        cylinder("pond-glint", (x - radius * 0.18, 0.09, z - radius * 0.15), radius * 0.45, 0.02, material("pond-glint", "#b4d2c4", roughness=0.17), vertices=16)

    # A few permanent brass lamps make the ring readable at gameplay distance.
    for x, z in [(-9.0, 9.5), (4.0, 9.8), (10.1, 5.6), (10.3, -3.4), (-5.7, -6.8)]:
        cylinder("lamp-post", (x, 0.85, z), 0.07, 1.35, wood, vertices=8)
        ico("lamp-glow", (x, 1.58, z), (0.16, 0.16, 0.16), material("lamp-glow", COLORS["gold"], emission=COLORS["gold"]))

    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.render.resolution_x = 1280
    scene.render.resolution_y = 800
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(RENDER_PATH)
    scene.render.film_transparent = False
    scene.render.image_settings.color_mode = "RGBA"
    scene.world.color = (0.045, 0.075, 0.08)
    scene.view_settings.look = "AgX - Medium High Contrast"

    camera_data = bpy.data.cameras.new("Guildholm 3D gameplay camera")
    camera = bpy.data.objects.new("Guildholm 3D gameplay camera", camera_data)
    bpy.context.collection.objects.link(camera)
    camera.location = (28.0, 32.0, 28.0)
    camera_data.lens = 38
    camera_data.clip_end = 100
    camera.rotation_euler = (Vector((0, 0.0, 1.0)) - camera.location).to_track_quat("-Z", "Y").to_euler()
    scene.camera = camera

    sun_data = bpy.data.lights.new("warm afternoon sun", "SUN")
    sun_data.energy = 3.2
    sun_data.angle = math.radians(18)
    sun = bpy.data.objects.new("warm afternoon sun", sun_data)
    sun.rotation_euler = (math.radians(-35), math.radians(-25), math.radians(-20))
    bpy.context.collection.objects.link(sun)

    area_data = bpy.data.lights.new("soft sky fill", "AREA")
    area_data.energy = 650
    area_data.shape = "DISK"
    area_data.size = 16
    area = bpy.data.objects.new("soft sky fill", area_data)
    area.location = (-4, 16, -8)
    area.rotation_euler = (math.radians(-90), 0, 0)
    bpy.context.collection.objects.link(area)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)
    # Do not leave Blender's rolling .blend1 backup beside the browser asset.
    # The editable source is already retained at BLEND_PATH and can be
    # regenerated deterministically from this script.
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    bpy.ops.export_scene.gltf(
        filepath=str(GLB_PATH),
        export_format="GLB",
        export_cameras=False,
        export_lights=False,
        export_materials="EXPORT",
        export_extras=True,
        export_yup=True,
        export_apply=True,
    )
    bpy.ops.render.render(write_still=True)

    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    result = {
        "blend": str(BLEND_PATH),
        "glb": str(GLB_PATH),
        "render": str(RENDER_PATH),
        "location_roots": len([obj for obj in bpy.context.scene.objects if obj.name.startswith("location_") and obj.type == "EMPTY"]),
        "mesh_objects": len(meshes),
        "triangles": sum(len(obj.data.polygons) for obj in meshes),
        "materials": len(bpy.data.materials),
        "locations": LOCATION_ORDER,
        "tripoAccepted": sum(item["status"] == "accepted" for item in TRIPO_RESULTS.values()),
        "tripoFallback": sum(item["status"] == "fallback" for item in TRIPO_RESULTS.values()),
        "tripoIntegratedFaces": sum(item.get("integratedFaces", 0) for item in TRIPO_RESULTS.values()),
    }
    TRIPO_MANIFEST_PATH.write_text(json.dumps({"assets": [TRIPO_RESULTS[location_id] for location_id in LOCATION_ORDER]}, indent=2) + "\n")
    print("BOARD3D_RESULT", result)


if __name__ == "__main__":
    add_scene()
