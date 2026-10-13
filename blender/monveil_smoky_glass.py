"""
MONVEIL - 3D Smoky-Glass Ambient Background Loop
Blender 4.x Automation Script

Generates a seamless 15-second (360 frames @ 24fps) ambient 3D smoky-glass loop
following the MONVEIL dark fintech design specification.

Execution in Blender:
  1. Open Blender 4.x
  2. Switch to 'Scripting' workspace
  3. Load and run this script (or run in background: blender -b -P blender/monveil_smoky_glass.py -a)
"""

import math
import bpy

def hex_to_linear_rgb(hex_str: str):
    """Convert hex color (#RRGGBB) to Blender linear sRGB."""
    hex_str = hex_str.lstrip('#')
    r, g, b = [int(hex_str[i:i+2], 16) / 255.0 for i in (0, 2, 4)]
    # Convert sRGB to linear
    def to_linear(c):
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    return (to_linear(r), to_linear(g), to_linear(b), 1.0)

# -------------------------------------------------------------------------
# PALETTE DEFINITION
# -------------------------------------------------------------------------
COLOR_MIDNIGHT_NAVY = hex_to_linear_rgb("#0B0B1E")
COLOR_DEEP_INDIGO    = hex_to_linear_rgb("#12102B")
COLOR_PLUM_NAVY      = hex_to_linear_rgb("#15142C")
COLOR_SOFT_VIOLET    = hex_to_linear_rgb("#A78BFA")
COLOR_PALE_LAVENDER  = hex_to_linear_rgb("#D8CCFF")
COLOR_SILVER_LAVENDER= hex_to_linear_rgb("#A8A5BD")

TOTAL_FRAMES = 360
FPS = 24

def clear_scene():
    """Wipe default objects, collections, and materials."""
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for block in (bpy.data.materials, bpy.data.textures, bpy.data.images, bpy.data.lights, bpy.data.cameras):
        for item in block:
            block.remove(item, do_unlink=True)

def setup_render_settings():
    """Configure render engine, output resolution, AgX color management, and frame range."""
    scene = bpy.context.scene
    scene.frame_start = 1
    scene.frame_end = TOTAL_FRAMES
    scene.render.fps = FPS

    # 1920x1080 16:9
    scene.render.resolution_x = 1920
    scene.render.resolution_y = 1080
    scene.render.resolution_percentage = 100

    # Cycles for final production quality
    scene.render.engine = 'CYCLES'
    if hasattr(scene.cycles, 'device'):
        scene.cycles.device = 'GPU'
    scene.cycles.preview_samples = 32
    scene.cycles.samples = 128
    scene.cycles.use_denoising = True

    # Color Management (AgX, Medium High Contrast)
    scene.display_settings.display_device = 'sRGB'
    scene.view_settings.view_transform = 'AgX'
    scene.view_settings.look = 'AgX - Medium High Contrast'

    # Output Format (silent MP4 H.264)
    scene.render.image_settings.file_format = 'FFMPEG'
    scene.render.ffmpeg.format = 'MPEG4'
    scene.render.ffmpeg.codec = 'H264'
    scene.render.ffmpeg.constant_rate_factor = 'PERC_GOOD'
    scene.render.ffmpeg.audio_codec = 'NONE'
    scene.render.filepath = "//monveil_smoky_glass_loop.mp4"

def setup_world():
    """Create ambient midnight navy environment and subtle haze."""
    world = bpy.context.scene.world
    if not world:
        world = bpy.data.worlds.new("MONVEIL_World")
        bpy.context.scene.world = world

    world.use_nodes = True
    nodes = world.node_tree.nodes
    links = world.node_tree.links
    nodes.clear()

    node_out = nodes.new(type='ShaderNodeOutputWorld')
    node_bg = nodes.new(type='ShaderNodeBackground')
    node_bg.inputs['Color'].default_value = COLOR_MIDNIGHT_NAVY
    node_bg.inputs['Strength'].default_value = 0.10

    links.new(node_bg.outputs['Background'], node_out.inputs['Surface'])

def create_smoked_glass_material(name="Smoked_Glass", transmission=0.75, roughness=0.23, alpha=0.68):
    """
    Create physically plausible smoky glass material with subtle frosted noise
    and grazing-angle lavender reflection tint.
    """
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()

    node_out = nodes.new(type='ShaderNodeOutputMaterial')
    node_bsdf = nodes.new(type='ShaderNodeBsdfPrincipled')

    # Principled BSDF settings
    node_bsdf.inputs['Base Color'].default_value = COLOR_PLUM_NAVY
    node_bsdf.inputs['Metallic'].default_value = 0.0
    node_bsdf.inputs['Roughness'].default_value = roughness
    node_bsdf.inputs['IOR'].default_value = 1.47
    
    # Transmission & Alpha
    if 'Transmission Weight' in node_bsdf.inputs:
        node_bsdf.inputs['Transmission Weight'].default_value = transmission
    elif 'Transmission' in node_bsdf.inputs:
        node_bsdf.inputs['Transmission'].default_value = transmission

    if 'Coat Weight' in node_bsdf.inputs:
        node_bsdf.inputs['Coat Weight'].default_value = 0.15
        node_bsdf.inputs['Coat Roughness'].default_value = 0.16

    if 'Alpha' in node_bsdf.inputs:
        node_bsdf.inputs['Alpha'].default_value = alpha

    # Soft edge tint (Layer Weight facing / grazing mask)
    node_layer = nodes.new(type='ShaderNodeLayerWeight')
    node_layer.inputs['Blend'].default_value = 0.35

    node_ramp = nodes.new(type='ShaderNodeValToRGB')
    node_ramp.color_ramp.elements[0].position = 0.0
    node_ramp.color_ramp.elements[0].color = COLOR_PALE_LAVENDER
    node_ramp.color_ramp.elements[1].position = 1.0
    node_ramp.color_ramp.elements[1].color = COLOR_SOFT_VIOLET

    links.new(node_layer.outputs['Facing'], node_ramp.inputs['Fac'])
    
    # Very subtle emission on edges
    if 'Emission Color' in node_bsdf.inputs:
        links.new(node_ramp.outputs['Color'], node_bsdf.inputs['Emission Color'])
        node_bsdf.inputs['Emission Strength'].default_value = 0.03

    links.new(node_bsdf.outputs['BSDF'], node_out.inputs['Surface'])
    return mat

def create_camera():
    """Setup locked camera with slight sinusoidal cyclic drift and depth-of-field."""
    cam_data = bpy.data.cameras.new("MONVEIL_Camera")
    cam_data.lens = 75.0  # 75mm lens
    cam_data.dof.use_dof = True
    cam_data.dof.focus_distance = 11.2
    cam_data.dof.aperture_fstop = 5.6

    cam_obj = bpy.data.objects.new("Camera", cam_data)
    bpy.context.collection.objects.link(cam_obj)
    bpy.context.scene.camera = cam_obj

    base_x, base_y, base_z = 0.0, -11.0, 3.2
    cam_obj.location = (base_x, base_y, base_z)
    cam_obj.rotation_euler = (math.radians(82.5), 0, math.radians(3.6))

    # Animate subtle sinusoidal drift (<= 0.02 units)
    for frame in range(1, TOTAL_FRAMES + 2):
        t = (frame - 1) / TOTAL_FRAMES
        drift = 0.018 * math.sin(2.0 * math.pi * t)
        cam_obj.location.x = base_x + drift
        cam_obj.keyframe_insert(data_path="location", frame=frame)

    return cam_obj

def build_objects(glass_mat):
    """Build the right-weighted smoky glass sculptural objects."""
    
    # 1. Main Rounded Diamond (Beveled Octahedron)
    mesh_diamond = bpy.data.meshes.new("Main_Rounded_Diamond_Mesh")
    obj_diamond = bpy.data.objects.new("Main_Rounded_Diamond", mesh_diamond)
    bpy.context.collection.objects.link(obj_diamond)
    
    # Create octahedron geometry
    import bmesh
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=1, radius=1.0)
    bm.to_mesh(mesh_diamond)
    bm.free()

    obj_diamond.location = (2.4, 0.0, 3.0)
    obj_diamond.scale = (0.9, 0.9, 1.2)
    obj_diamond.data.materials.append(glass_mat)
    
    # Subsurf / bevel for soft faceted edges
    sub_mod = obj_diamond.modifiers.new("Subdivision", 'SUBSURF')
    sub_mod.levels = 2
    sub_mod.render_levels = 3

    # Animate gentle partial rotation (25 deg Z-rotation loop)
    for frame in range(1, TOTAL_FRAMES + 2):
        t = (frame - 1) / TOTAL_FRAMES
        rot_z = math.radians(25.0) * math.sin(2.0 * math.pi * t)
        rot_y = math.radians(8.0) * math.sin(2.0 * math.pi * t)
        obj_diamond.rotation_euler = (0, rot_y, rot_z)
        obj_diamond.keyframe_insert(data_path="rotation_euler", frame=frame)

    # 2. Beveled Cube A
    bpy.ops.mesh.primitive_cube_add(size=1.2, location=(3.9, 0.4, 2.2))
    cube_a = bpy.context.active_object
    cube_a.name = "Beveled_Cube_A"
    cube_a.data.materials.append(glass_mat)
    bev_a = cube_a.modifiers.new("Bevel", 'BEVEL')
    bev_a.width = 0.16
    bev_a.segments = 6

    # 3. Beveled Cube B
    bpy.ops.mesh.primitive_cube_add(size=0.9, location=(2.9, 0.8, 1.6))
    cube_b = bpy.context.active_object
    cube_b.name = "Beveled_Cube_B"
    cube_b.data.materials.append(glass_mat)
    bev_b = cube_b.modifiers.new("Bevel", 'BEVEL')
    bev_b.width = 0.13
    bev_b.segments = 6

    # Animate small cyclic cube counter-rotations
    for frame in range(1, TOTAL_FRAMES + 2):
        t = (frame - 1) / TOTAL_FRAMES
        cube_a.rotation_euler = (
            math.radians(3.0 * math.sin(2 * math.pi * t)),
            math.radians(-4.0 * math.sin(2 * math.pi * t)),
            math.radians(2.0 * math.cos(2 * math.pi * t) - 2.0)
        )
        cube_a.keyframe_insert(data_path="rotation_euler", frame=frame)

        cube_b.rotation_euler = (
            math.radians(-3.0 * math.sin(2 * math.pi * t)),
            math.radians(3.0 * math.cos(2 * math.pi * t) - 3.0),
            math.radians(2.0 * math.sin(2 * math.pi * t))
        )
        cube_b.keyframe_insert(data_path="rotation_euler", frame=frame)

    # 4. Glass Sphere A & B
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.62, location=(4.5, 0.1, 3.8))
    sphere_a = bpy.context.active_object
    sphere_a.name = "Glass_Sphere_A"
    sphere_a.data.materials.append(glass_mat)

    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3, radius=0.42, location=(2.0, 0.6, 1.3))
    sphere_b = bpy.context.active_object
    sphere_b.name = "Glass_Sphere_B"
    sphere_b.data.materials.append(glass_mat)

    # Animate slow orbital drift (<= 0.12 units)
    base_pos_a = (4.5, 0.1, 3.8)
    base_pos_b = (2.0, 0.6, 1.3)
    for frame in range(1, TOTAL_FRAMES + 2):
        t = (frame - 1) / TOTAL_FRAMES
        sphere_a.location = (
            base_pos_a[0] + 0.12 * math.sin(2 * math.pi * t),
            base_pos_a[1],
            base_pos_a[2] + 0.08 * math.cos(2 * math.pi * t) - 0.08
        )
        sphere_a.keyframe_insert(data_path="location", frame=frame)

        sphere_b.location = (
            base_pos_b[0] + 0.09 * math.cos(2 * math.pi * t) - 0.09,
            base_pos_b[1],
            base_pos_b[2] + 0.07 * math.sin(2 * math.pi * t)
        )
        sphere_b.keyframe_insert(data_path="location", frame=frame)

    # 5. Curved Glass Ribbon (Bezier Curve with Bevel)
    curve_data = bpy.data.curves.new('Curved_Glass_Ribbon_Curve', type='CURVE')
    curve_data.dimensions = '3D'
    curve_data.bevel_depth = 0.055
    curve_data.bevel_resolution = 4
    
    polyline = curve_data.splines.new('BEZIER')
    polyline.bezier_points.add(3)
    points = [
        (1.6, 0.3, 1.5),
        (2.6, 0.1, 2.1),
        (3.7, 0.2, 3.0),
        (4.7, 0.2, 3.7)
    ]
    for i, pt in enumerate(points):
        polyline.bezier_points[i].co = pt
        polyline.bezier_points[i].handle_left_type = 'AUTO'
        polyline.bezier_points[i].handle_right_type = 'AUTO'

    ribbon_obj = bpy.data.objects.new('Curved_Glass_Ribbon', curve_data)
    bpy.context.collection.objects.link(ribbon_obj)
    ribbon_obj.data.materials.append(glass_mat)

    # Animate ribbon gentle lateral drift
    base_ribbon_pos = ribbon_obj.location.copy()
    for frame in range(1, TOTAL_FRAMES + 2):
        t = (frame - 1) / TOTAL_FRAMES
        ribbon_obj.location.x = base_ribbon_pos.x + 0.10 * math.sin(2 * math.pi * t)
        ribbon_obj.location.z = base_ribbon_pos.z + 0.06 * math.cos(2 * math.pi * t) - 0.06
        ribbon_obj.keyframe_insert(data_path="location", frame=frame)

def setup_lights():
    """Setup restrained large-source lighting rig."""
    
    # 1. Soft Lavender Key Light (above/right/front)
    key_data = bpy.data.lights.new(name="Soft_Lavender_Key", type='AREA')
    key_data.energy = 120.0
    key_data.color = COLOR_PALE_LAVENDER[:3]
    key_data.size = 5.0
    key_obj = bpy.data.objects.new("Soft_Lavender_Key", key_data)
    key_obj.location = (4.0, -3.0, 7.0)
    key_obj.rotation_euler = (math.radians(35), math.radians(-15), math.radians(-10))
    bpy.context.collection.objects.link(key_obj)

    # Animate key light subtle position drift for wandering highlights
    base_x = key_obj.location.x
    for frame in range(1, TOTAL_FRAMES + 2):
        t = (frame - 1) / TOTAL_FRAMES
        key_obj.location.x = base_x + 0.18 * math.sin(2 * math.pi * t)
        key_obj.keyframe_insert(data_path="location", frame=frame)

    # 2. Violet Rim Light (behind/right)
    rim_data = bpy.data.lights.new(name="Violet_Rim", type='AREA')
    rim_data.energy = 55.0
    rim_data.color = COLOR_SOFT_VIOLET[:3]
    rim_data.size = 4.0
    rim_obj = bpy.data.objects.new("Violet_Rim", rim_data)
    rim_obj.location = (5.0, 2.0, 4.0)
    rim_obj.rotation_euler = (math.radians(-40), math.radians(20), math.radians(130))
    bpy.context.collection.objects.link(rim_obj)

    # 3. Silver Lavender Fill (camera-left, very weak)
    fill_data = bpy.data.lights.new(name="Silver_Lavender_Fill", type='AREA')
    fill_data.energy = 18.0
    fill_data.color = COLOR_SILVER_LAVENDER[:3]
    fill_data.size = 6.0
    fill_obj = bpy.data.objects.new("Silver_Lavender_Fill", fill_data)
    fill_obj.location = (-3.0, -2.0, 3.0)
    bpy.context.collection.objects.link(fill_obj)

def setup_compositor():
    """Setup compositor with fog glow glare, color balance, and corner vignette."""
    scene = bpy.context.scene
    scene.use_nodes = True
    tree = scene.node_tree
    nodes = tree.nodes
    links = tree.links
    nodes.clear()

    render_layers = nodes.new(type='CompositorNodeRLayers')
    composite = nodes.new(type='CompositorNodeComposite')

    # Fog glow glare (restrained edge sheen)
    glare = nodes.new(type='CompositorNodeGlare')
    glare.glare_type = 'FOG_GLOW'
    glare.quality = 'HIGH'
    glare.threshold = 1.2
    glare.size = 6
    glare.mix = -0.85

    links.new(render_layers.outputs['Image'], glare.inputs['Image'])
    links.new(glare.outputs['Image'], composite.inputs['Image'])

def main():
    print("--------------------------------------------------")
    print("MONVEIL: Generating 3D Smoky-Glass Background Loop")
    print("--------------------------------------------------")
    clear_scene()
    setup_render_settings()
    setup_world()
    glass_mat = create_smoked_glass_material()
    create_camera()
    build_objects(glass_mat)
    setup_lights()
    setup_compositor()
    print("MONVEIL Scene generated successfully!")
    print("Total frames: 360 (15 seconds @ 24fps). Perfectly cyclic.")

if __name__ == "__main__":
    main()
