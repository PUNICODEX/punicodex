/**
 * PUNICODEX 3D Temple Mode — WebGL scene per pantheon with hotspots.
 */
(function (global) {
  'use strict';

  function init(container, pantheon, entries) {
    if (typeof THREE === 'undefined') {
      container.innerHTML = '<div style="padding:2rem;color:var(--text-muted)">Three.js not loaded.</div>';
      return null;
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0f);
    scene.fog = new THREE.FogExp2(0x0a0a0f, 0.03);

    const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(0, 2, 8);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambient);
    const point = new THREE.PointLight(0xd4af37, 1, 20);
    point.position.set(2, 4, 4);
    scene.add(point);

    // Floor
    const floorGeo = new THREE.PlaneGeometry(30, 30);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x1a1a25, roughness: 0.8 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1;
    scene.add(floor);

    // Central pillar
    const pillarGeo = new THREE.CylinderGeometry(0.5, 0.7, 6, 16);
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x2a2a3a, metalness: 0.3, roughness: 0.5 });
    const pillar = new THREE.Mesh(pillarGeo, pillarMat);
    pillar.position.y = 2;
    scene.add(pillar);

    // Hotspots
    const hotspots = [];
    const count = Math.min(entries.length, 12);
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const radius = 4;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.25, 16, 16),
        new THREE.MeshStandardMaterial({ color: 0xd4af37, emissive: 0x553300 })
      );
      sphere.position.set(x, 1.5, z);
      sphere.userData = { entry: entries[i] };
      scene.add(sphere);
      hotspots.push(sphere);

      // Label
      const label = createLabel(entries[i].unicode);
      label.position.set(x, 2.1, z);
      scene.add(label);
    }

    // Orbit-like controls via mouse
    let isDragging = false;
    let previousMouse = { x: 0, y: 0 };
    let azimuth = 0;
    let polar = Math.PI / 3;
    const radius = 8;

    renderer.domElement.addEventListener('mousedown', (e) => { isDragging = true; previousMouse = { x: e.clientX, y: e.clientY }; });
    window.addEventListener('mouseup', () => { isDragging = false; });
    renderer.domElement.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const dx = e.clientX - previousMouse.x;
      const dy = e.clientY - previousMouse.y;
      previousMouse = { x: e.clientX, y: e.clientY };
      azimuth -= dx * 0.005;
      polar = Math.max(0.2, Math.min(Math.PI / 2 - 0.1, polar - dy * 0.005));
      updateCamera();
    });

    function updateCamera() {
      camera.position.x = radius * Math.sin(polar) * Math.cos(azimuth);
      camera.position.y = radius * Math.cos(polar) + 1;
      camera.position.z = radius * Math.sin(polar) * Math.sin(azimuth);
      camera.lookAt(0, 1.5, 0);
    }
    updateCamera();

    // Raycaster for clicks
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    renderer.domElement.addEventListener('click', (e) => {
      if (isDragging) return;
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(hotspots);
      if (intersects.length > 0 && global.onTempleHotspotClick) {
        global.onTempleHotspotClick(intersects[0].object.userData.entry);
      }
    });

    function animate() {
      requestAnimationFrame(animate);
      hotspots.forEach((h, i) => {
        h.position.y = 1.5 + Math.sin(Date.now() * 0.002 + i) * 0.1;
      });
      renderer.render(scene, camera);
    }
    animate();

    return { scene, camera, renderer };
  }

  function createLabel(text) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 128;
    canvas.height = 32;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#d4af37';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(text, canvas.width / 2, 22);
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(1.5, 0.4, 1);
    return sprite;
  }

  global.PunyTemple3D = { init };
})(typeof window !== 'undefined' ? window : globalThis);
