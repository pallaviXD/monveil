import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const TOTAL_LOOP_SECONDS = 15;

export function SmokyGlassCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 1. Scene & Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0B0B1E');
    scene.fog = new THREE.FogExp2('#0B0B1E', 0.045);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    // 2. Camera: 75mm lens equivalent on full-frame is ~28 deg FOV
    const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
    const baseCamPos = new THREE.Vector3(0.0, -11.0, 3.2);
    const lookTarget = new THREE.Vector3(0.7, 0.0, 2.8);
    camera.position.copy(baseCamPos);
    camera.lookAt(lookTarget);

    // 3. Materials (Smoked crystal glass with lavender grazing highlights)
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#15142C'),
      emissive: new THREE.Color('#2A1B4E'),
      emissiveIntensity: 0.08,
      roughness: 0.22,
      metalness: 0.0,
      transmission: 0.78,
      ior: 1.47,
      thickness: 1.6,
      specularIntensity: 1.0,
      specularColor: new THREE.Color('#D8CCFF'),
      clearcoat: 0.18,
      clearcoatRoughness: 0.15,
      attenuationColor: new THREE.Color('#12102B'),
      attenuationDistance: 2.2,
      transparent: true,
      opacity: 0.88,
    });

    const ribbonMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#15142C'),
      emissive: new THREE.Color('#382068'),
      emissiveIntensity: 0.12,
      roughness: 0.18,
      metalness: 0.0,
      transmission: 0.82,
      ior: 1.49,
      thickness: 0.8,
      specularIntensity: 1.2,
      specularColor: new THREE.Color('#A78BFA'),
      clearcoat: 0.25,
      transparent: true,
      opacity: 0.75,
    });

    // 4. Objects (Right-weighted group, clean negative space on left)

    // 4a. Main Rounded Diamond (Beveled Octahedron)
    const diamondGeo = new THREE.OctahedronGeometry(1.0, 2);
    const diamondMesh = new THREE.Mesh(diamondGeo, glassMat);
    diamondMesh.position.set(2.4, 0.0, 3.0);
    diamondMesh.scale.set(0.95, 0.95, 1.25);
    scene.add(diamondMesh);

    // 4b. Beveled Cube A
    const cubeAGeo = new THREE.BoxGeometry(1.2, 1.2, 1.2, 2, 2, 2);
    const cubeAMesh = new THREE.Mesh(cubeAGeo, glassMat);
    cubeAMesh.position.set(3.9, 0.4, 2.2);
    scene.add(cubeAMesh);

    // 4c. Beveled Cube B
    const cubeBGeo = new THREE.BoxGeometry(0.9, 0.9, 0.9, 2, 2, 2);
    const cubeBMesh = new THREE.Mesh(cubeBGeo, glassMat);
    cubeBMesh.position.set(2.9, 0.8, 1.6);
    scene.add(cubeBMesh);

    // 4d. Glass Sphere A & B
    const sphereAGeo = new THREE.SphereGeometry(0.62, 32, 32);
    const sphereAMesh = new THREE.Mesh(sphereAGeo, glassMat);
    sphereAMesh.position.set(4.5, 0.1, 3.8);
    scene.add(sphereAMesh);

    const sphereBGeo = new THREE.IcosahedronGeometry(0.42, 3);
    const sphereBMesh = new THREE.Mesh(sphereBGeo, glassMat);
    sphereBMesh.position.set(2.0, 0.6, 1.3);
    scene.add(sphereBMesh);

    // 4e. Curved Glass Ribbon (Thin 3D CatmullRom arc)
    const ribbonCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(1.6, 0.3, 1.5),
      new THREE.Vector3(2.6, 0.1, 2.1),
      new THREE.Vector3(3.7, 0.2, 3.0),
      new THREE.Vector3(4.7, 0.2, 3.7),
    ]);
    const ribbonGeo = new THREE.TubeGeometry(ribbonCurve, 48, 0.055, 12, false);
    const ribbonMesh = new THREE.Mesh(ribbonGeo, ribbonMat);
    scene.add(ribbonMesh);

    // 4f. Background Soft Indigo Haze / Smoky Wisps
    const wispGeo = new THREE.PlaneGeometry(8, 5);
    const wispMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#12102B'),
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const wispMesh = new THREE.Mesh(wispGeo, wispMat);
    wispMesh.position.set(3.3, 1.5, 2.7);
    scene.add(wispMesh);

    // 5. Lighting Setup
    const ambientLight = new THREE.AmbientLight('#0B0B1E', 1.2);
    scene.add(ambientLight);

    // Key Light (Pale Lavender, drifting)
    const keyLight = new THREE.PointLight('#D8CCFF', 3.5, 18, 1.2);
    keyLight.position.set(4.0, -3.0, 7.0);
    scene.add(keyLight);

    // Rim Light (Soft Violet, behind right)
    const rimLight = new THREE.PointLight('#A78BFA', 2.8, 15, 1.4);
    rimLight.position.set(5.0, 2.0, 4.0);
    scene.add(rimLight);

    // Fill Light (Silver Lavender, camera left, very subtle)
    const fillLight = new THREE.PointLight('#A8A5BD', 0.6, 12, 1.5);
    fillLight.position.set(-3.0, -2.0, 3.0);
    scene.add(fillLight);

    // 6. Resize handling
    function resize() {
      if (!canvas) return;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (width === 0 || height === 0) return;

      const dpr = Math.min(window.devicePixelRatio, 1.5);
      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      }
    }

    // 7. Loop animation
    let rafId = 0;
    const startTime = performance.now();
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function animate() {
      resize();

      if (!prefersReducedMotion) {
        const elapsed = (performance.now() - startTime) / 1000;
        const normTime = (elapsed % TOTAL_LOOP_SECONDS) / TOTAL_LOOP_SECONDS;
        const theta = 2.0 * Math.PI * normTime;

        // Diamond gentle partial rotation (25 deg Z, 8 deg Y)
        diamondMesh.rotation.z = Math.sin(theta) * 0.44;
        diamondMesh.rotation.y = Math.sin(theta) * 0.14;

        // Cube A & B small counter-rotations
        cubeAMesh.rotation.x = Math.sin(theta) * 0.06;
        cubeAMesh.rotation.y = -Math.sin(theta) * 0.08;
        cubeAMesh.rotation.z = (Math.cos(theta) - 1.0) * 0.04;

        cubeBMesh.rotation.x = -Math.sin(theta) * 0.05;
        cubeBMesh.rotation.y = (Math.cos(theta) - 1.0) * 0.06;

        // Spheres slow orbital drift
        sphereAMesh.position.x = 4.5 + 0.12 * Math.sin(theta);
        sphereAMesh.position.z = 3.8 + 0.08 * (Math.cos(theta) - 1.0);

        sphereBMesh.position.x = 2.0 + 0.09 * (Math.cos(theta) - 1.0);
        sphereBMesh.position.z = 1.3 + 0.07 * Math.sin(theta);

        // Ribbon gentle lateral drift
        ribbonMesh.position.x = 0.1 * Math.sin(theta);
        ribbonMesh.position.z = 0.06 * (Math.cos(theta) - 1.0);

        // Key light subtle highlight wandering
        keyLight.position.x = 4.0 + 0.25 * Math.sin(theta);

        // Camera imperceptible sinusoidal translation
        camera.position.x = baseCamPos.x + 0.02 * Math.sin(theta);
        camera.lookAt(lookTarget);
      }

      renderer.render(scene, camera);
      rafId = requestAnimationFrame(animate);
    }

    animate();

    return () => {
      cancelAnimationFrame(rafId);
      renderer.dispose();
      diamondGeo.dispose();
      cubeAGeo.dispose();
      cubeBGeo.dispose();
      sphereAGeo.dispose();
      sphereBGeo.dispose();
      ribbonGeo.dispose();
      wispGeo.dispose();
      glassMat.dispose();
      ribbonMat.dispose();
      wispMat.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        display: 'block',
        pointerEvents: 'none',
      }}
    />
  );
}
