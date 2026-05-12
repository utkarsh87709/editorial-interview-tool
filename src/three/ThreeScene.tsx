import { useEffect, useRef } from "react";
import * as THREE from "three";

export function ThreeScene() {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x020617, 0.035);

    const container = mountRef.current;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(0x020617, 0);
    renderer.domElement.style.position = "absolute";
    renderer.domElement.style.top = "0";
    renderer.domElement.style.left = "0";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    container.appendChild(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(38, container.clientWidth / container.clientHeight, 0.1, 200);
    camera.position.set(0, 6, 18);

    const ambient = new THREE.AmbientLight(0xffffff, 0.45);
    const mainLight = new THREE.DirectionalLight(0x8ee7ff, 1.0);
    mainLight.position.set(8, 20, 18);
    const bounceLight = new THREE.PointLight(0x7c3aed, 1.7, 26, 2);
    bounceLight.position.set(-6, 5, 8);
    scene.add(ambient, mainLight, bounceLight);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(120, 120, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0x07121f, roughness: 0.9, metalness: 0.15, transparent: true, opacity: 0.8 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1.25;
    scene.add(ground);

    const platforms = new THREE.Group();
    const shapes = [
      { x: -6, z: -1, scale: 1.8, color: 0x4f46e5 },
      { x: 4, z: -2.5, scale: 1.4, color: 0x14b8a6 },
      { x: 0, z: 4, scale: 2.1, color: 0x22c55e },
      { x: 6, z: 3, scale: 1.2, color: 0xf59e0b }
    ];

    shapes.forEach((shape) => {
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(3.2 * shape.scale, 0.8, 3.2 * shape.scale),
        new THREE.MeshStandardMaterial({ color: shape.color, roughness: 0.4, metalness: 0.6 })
      );
      box.position.set(shape.x, -0.3 + shape.scale * 0.1, shape.z);
      box.rotation.y = Math.PI / 8;
      platforms.add(box);

      const highlight = new THREE.EdgesGeometry(box.geometry);
      const line = new THREE.LineSegments(
        highlight,
        new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25 })
      );
      box.add(line);
    });

    scene.add(platforms);

    const orb = new THREE.Mesh(
      new THREE.SphereGeometry(0.85, 36, 36),
      new THREE.MeshStandardMaterial({ color: 0x60a5fa, emissive: 0x3b82f6, emissiveIntensity: 0.8, roughness: 0.2, metalness: 0.35 })
    );
    orb.position.set(0, 3.8, 0);
    scene.add(orb);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(4.75, 0.12, 20, 120),
      new THREE.MeshStandardMaterial({ color: 0xa855f7, emissive: 0x9333ea, emissiveIntensity: 0.5, roughness: 0.15, metalness: 0.8 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 3.8;
    scene.add(ring);

    const starsGeometry = new THREE.BufferGeometry();
    const starCount = 150;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i += 1) {
      starPositions[i * 3] = (Math.random() - 0.5) * 60;
      starPositions[i * 3 + 1] = Math.random() * 18 + 1;
      starPositions[i * 3 + 2] = (Math.random() - 0.5) * 60;
    }
    starsGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    const stars = new THREE.Points(
      starsGeometry,
      new THREE.PointsMaterial({ color: 0xe0e7ff, size: 0.14, transparent: true, opacity: 0.8 })
    );
    scene.add(stars);

    let frameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      const elapsed = clock.getElapsedTime();
      platforms.rotation.y = elapsed * 0.08;
      ring.rotation.z = elapsed * 0.32;
      orb.position.y = 3.8 + Math.sin(elapsed * 1.1) * 0.35;
      orb.rotation.y = elapsed * 0.6;
      bounceLight.position.x = Math.cos(elapsed * 0.8) * 7;
      bounceLight.position.z = Math.sin(elapsed * 0.9) * 7;
      renderer.render(scene, camera);
      frameId = window.requestAnimationFrame(animate);
    };

    const onResize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener("resize", onResize);
    animate();

    return () => {
      window.removeEventListener("resize", onResize);
      window.cancelAnimationFrame(frameId);
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className="absolute inset-0 -z-10 pointer-events-none" />;
}
