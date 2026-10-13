# MONVEIL · 3D Smoky-Glass Background Loop

This folder contains the complete Blender 4.x scene generation setup and configuration for the **MONVEIL Smoky-Glass Ambient Background Loop**.

---

## Files

- [`monveil_smoky_glass.py`](./monveil_smoky_glass.py): Automated Python script that creates the complete scene from scratch in Blender 4.x.
- [`monveil_smoky_glass_config.json`](./monveil_smoky_glass_config.json): Machine-readable scene specification with all coordinates, colors, materials, lights, and constraints.

---

## How to Generate & Render in Blender

### Option A: From Blender GUI
1. Open **Blender 4.x**.
2. Go to the **Scripting** tab in the top menu.
3. Click **Open** and select `blender/monveil_smoky_glass.py`.
4. Click **Run Script** (▶). The entire scene, lighting, camera, shaders, and cyclic animations (frames 1–360) will be built immediately in your viewport.
5. Press **Ctrl + F12** (or `Render > Render Animation`) to render the silent MP4 loop.

### Option B: From Command Line (Headless Background Render)
If you have Blender installed in your PATH:
```bash
blender --background --python blender/monveil_smoky_glass.py --render-anim
```
The output will be saved as `monveil_smoky_glass_loop.mp4`.

---

## Web App Integration

Once rendered:
1. Place the generated file into the `public/` folder as `public/smoky-glass-loop.mp4`.
2. The MONVEIL landing page will automatically detect and play the 3D smoky-glass loop seamlessly with WebGL aurora fallback.
