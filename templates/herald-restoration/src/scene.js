import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const SEED = 54825;
const DURATION = 36;
const TAU = Math.PI * 2;
const GOLD = 0xd4af37;
const NIGHT = 0x050505;
const params = new URLSearchParams(location.search);
const CAPTURE = params.has('t');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

function mulberry32(a) {
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(SEED);
const clamp01 = v => Math.max(0, Math.min(1, v));
const smoother = v => { const x = clamp01(v); return x * x * x * (x * (x * 6 - 15) + 10); };
const easeOutBack = v => { const x = clamp01(v) - 1; return 1 + 1.35 * x * x * x + .35 * x * x; };
function life(t, start, end) {
  const assembled = smoother((t - start) / (end - start));
  const returned = smoother((t - 32) / 4);
  return assembled * (1 - returned);
}

function createRenderer() {
  const options = { antialias: true, preserveDrawingBuffer: true };
  try {
    return new THREE.WebGLRenderer({ ...options, powerPreference: 'high-performance' });
  } catch (err) {
    console.warn('high-performance WebGL context failed, retrying default:', err);
  }
  try {
    return new THREE.WebGLRenderer(options);
  } catch (err) {
    showFallback(err);
    throw err;
  }
}

function showFallback(error) {
  console.error('Pantheon initialization failed:', error);
  window.__SCENE_ERROR__ = String(error?.stack || error);
  const message = document.querySelector('#fallback p');
  if (message && window.__SCENE_ERROR__) {
    message.textContent = `This experience needs WebGL. (${window.__SCENE_ERROR__.split('\n')[0]})`;
  }
  document.getElementById('boot')?.remove();
  document.getElementById('fallback').style.display = 'grid';
}

// Mobile GPUs (especially on high-DPI phones) cannot sustain the full scene:
// full-resolution bloom buffers + 2048px PCFSoft shadows + DPR 1.5 get the
// driver to kill the WebGL context at peak load (the dome/coffer sequence,
// t≈19–29s). Detect early and render a lighter configuration.
const MOBILE = matchMedia('(pointer: coarse)').matches || innerWidth / innerHeight < 0.8;

const renderer = createRenderer();
renderer.setPixelRatio(MOBILE ? 1 : Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = MOBILE ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
renderer.domElement.addEventListener('webglcontextlost', (event) => {
  event.preventDefault();
  showFallback(new Error('The graphics context was lost (GPU ran out of resources). Please reload.'));
});
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = .88;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.info.autoReset = false;
renderer.domElement.setAttribute('aria-label', 'A black marble and gold Unicode Pantheon assembling from scattered fragments');
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(NIGHT);
scene.fog = new THREE.Fog(NIGHT, 30, 105);
const camera = new THREE.PerspectiveCamera(innerWidth / innerHeight < .8 ? 55 : 42, innerWidth / innerHeight, .1, 240);
camera.position.set(15, 10, 21);
const controls = new OrbitControls(camera, renderer.domElement);
// Orbit is opt-in — never block page scroll on touch devices unless the user
// explicitly enters orbit mode.
renderer.domElement.style.touchAction = 'pan-y';
controls.target.set(0, 4.5, 0);
controls.enableDamping = true;
controls.dampingFactor = .065;
controls.minDistance = 12;
controls.maxDistance = 42;
controls.maxPolarAngle = Math.PI * .48;
controls.enabled = false;

const pmrem = new THREE.PMREMGenerator(renderer);
const room = new RoomEnvironment();
const envTarget = pmrem.fromScene(room, .04);
scene.environment = envTarget.texture;
room.dispose();
pmrem.dispose();

scene.add(new THREE.HemisphereLight(0xb8c3d8, 0x211709, .62));
const key = new THREE.DirectionalLight(0xffe6b0, 2.35);
key.position.set(-11, 20, 13);
key.castShadow = true;
key.shadow.mapSize.set(MOBILE ? 1024 : 2048, MOBILE ? 1024 : 2048);
Object.assign(key.shadow.camera, { left: -16, right: 16, top: 18, bottom: -12, near: 1, far: 55 });
key.shadow.normalBias = .035;
key.shadow.bias = -.00015;
scene.add(key);
const fill = new THREE.DirectionalLight(0x8496c0, .72);
fill.position.set(14, 9, -12);
scene.add(fill);
const rim = new THREE.DirectionalLight(GOLD, 1.15);
rim.position.set(2, 13, -16);
scene.add(rim);
const heartLight = new THREE.PointLight(GOLD, 0, 23, 1.8);
heartLight.position.set(0, 5, 0);
scene.add(heartLight);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), .38, .62, .94);
composer.addPass(bloom);
const finishingPass = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, uPhase: { value: 0 } },
  vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uPhase; varying vec2 vUv;
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    void main(){
      vec4 c=texture2D(tDiffuse,vUv);
      float d=distance(vUv,vec2(.5));
      float vignette=1.0-smoothstep(.28,.76,d)*.52;
      c.rgb*=vignette;
      c.rgb=mix(c.rgb,c.rgb*vec3(1.035,1.0,.94),.32);
      float grain=(hash(gl_FragCoord.xy+vec2(sin(uPhase),cos(uPhase))*17.0)-.5)/255.0;
      c.rgb+=grain;
      gl_FragColor=vec4(max(c.rgb,0.0),c.a);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`
});
composer.addPass(finishingPass);

function stoneTexture(kind = 'ivory') {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const image = ctx.createImageData(size, size);
  const dark = kind === 'obsidian';
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = (y * size + x) * 4;
    const n = Math.sin(x * .071 + Math.sin(y * .037) * 2.4) + Math.sin(y * .093 + x * .019) * .55 + Math.sin((x + y) * .027) * .8;
    const vein = Math.pow(Math.abs(Math.sin(n * 2.1 + x * .011)), 18);
    const grain = Math.sin(x * 1.73 + y * 2.17) * .5 + .5;
    const base = dark ? 13 + grain * 5 + n * 1.5 : 164 + grain * 5 + n * 2;
    image.data[i] = base + (dark ? 5 : 8) * vein;
    image.data[i + 1] = base + (dark ? 3 : 6) * vein;
    image.data[i + 2] = base - (dark ? 1 : 3) + 4 * vein;
    image.data[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(dark ? 5 : 2, dark ? 5 : 3);
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return texture;
}

const ivoryMap = stoneTexture('ivory');
const obsidianMap = stoneTexture('obsidian');
const materials = {
  ivory: new THREE.MeshPhysicalMaterial({ color: 0xbcb4a4, map: ivoryMap, roughness: .38, metalness: .04, clearcoat: .12, clearcoatRoughness: .4, envMapIntensity: .72 }),
  stoneDark: new THREE.MeshPhysicalMaterial({ color: 0x211f1a, map: obsidianMap, roughness: .4, metalness: .2, clearcoat: .22, clearcoatRoughness: .34, envMapIntensity: .8 }),
  gold: new THREE.MeshStandardMaterial({ color: GOLD, roughness: .3, metalness: .88, envMapIntensity: 1.1 }),
  goldDark: new THREE.MeshStandardMaterial({ color: 0x806317, roughness: .4, metalness: .8, envMapIntensity: .9 }),
  coffer: new THREE.MeshStandardMaterial({ color: 0x302e27, roughness: .5, metalness: .24 }),
  glow: new THREE.MeshStandardMaterial({ color: 0xf0d875, emissive: GOLD, emissiveIntensity: 3.2, roughness: .24, metalness: .5 }),
  ground: new THREE.MeshStandardMaterial({ color: 0x080807, map: obsidianMap, roughness: .82, metalness: .02, envMapIntensity: .12 })
};

const ground = new THREE.Mesh(new THREE.CircleGeometry(180, 96).rotateX(-Math.PI / 2), materials.ground);
ground.receiveShadow = true;
scene.add(ground);

const architecture = new THREE.Group();
scene.add(architecture);
const parts = [];
const instanceSystems = [];
const tmp = {
  p: new THREE.Vector3(), q: new THREE.Quaternion(), s: new THREE.Vector3(),
  m: new THREE.Matrix4(), m2: new THREE.Matrix4(), e: new THREE.Euler(),
  a: new THREE.Vector3(), b: new THREE.Vector3(), c: new THREE.Vector3()
};

function registerPart(object, start, end, offset, spin = [0, 0, 0], startScale = .08) {
  object.updateMatrix();
  parts.push({
    object, start, end,
    finalP: object.position.clone(), finalQ: object.quaternion.clone(), finalS: object.scale.clone(),
    scatterP: object.position.clone().add(new THREE.Vector3(...offset)),
    scatterQ: new THREE.Quaternion().setFromEuler(new THREE.Euler(...spin)),
    scatterS: object.scale.clone().multiplyScalar(startScale)
  });
  architecture.add(object);
  return object;
}

function makeInstanced(geometry, material, data, shadow = true) {
  const mesh = new THREE.InstancedMesh(geometry, material, data.length);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.castShadow = shadow;
  mesh.receiveShadow = shadow;
  mesh.frustumCulled = false;
  architecture.add(mesh);
  const system = { mesh, data };
  instanceSystems.push(system);
  return system;
}

function instanceDatum(position, quaternion, scale, start, end, offset, spin = [0, 0, 0]) {
  return {
    finalP: new THREE.Vector3(...position), finalQ: quaternion || new THREE.Quaternion(), finalS: new THREE.Vector3(...scale),
    scatterP: new THREE.Vector3(...position).add(new THREE.Vector3(...offset)),
    scatterQ: new THREE.Quaternion().setFromEuler(new THREE.Euler(...spin)),
    scatterS: new THREE.Vector3(...scale).multiplyScalar(.12), start, end
  };
}

function annularSector(inner, outer, height, angle, segments = 5) {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, outer, -angle / 2, angle / 2, false);
  shape.absarc(0, 0, inner, angle / 2, -angle / 2, true);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: true, bevelSize: .025, bevelThickness: .025, bevelSegments: 2, curveSegments: segments });
  geometry.rotateX(Math.PI / 2);
  geometry.translate(0, height / 2, 0);
  return geometry;
}

function latheProfile(points, material, segments = 128) {
  const mesh = new THREE.Mesh(new THREE.LatheGeometry(points.map(p => new THREE.Vector2(...p)), segments), material);
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

// Three nested foundation drums, each with a machined stone profile.
const foundationSpecs = [
  { r: 9.5, h: .42, y: 0, start: 2.8, end: 6.2 },
  { r: 8.75, h: .38, y: .42, start: 4.1, end: 7.1 },
  { r: 8.05, h: .34, y: .80, start: 5.2, end: 8.0 }
];
for (const [i, f] of foundationSpecs.entries()) {
  const profile = [[0, 0], [f.r - .18, 0], [f.r, .09], [f.r, f.h - .09], [f.r - .16, f.h], [0, f.h]];
  const drum = latheProfile(profile, i === 1 ? materials.ivory : materials.stoneDark);
  drum.position.y = f.y;
  registerPart(drum, f.start, f.end, [0, -7 - i * 2, 0], [0, i * .4, 0], .35);
  const inlay = new THREE.Mesh(new THREE.TorusGeometry(f.r - .22, .035, 8, 160).rotateX(Math.PI / 2), materials.gold);
  inlay.position.y = f.y + f.h + .014;
  inlay.castShadow = true;
  registerPart(inlay, f.start + .45, f.end + .6, [0, -8, 0], [0, 0, 0], .15);
}

// A radial mosaic under the colonnade.
const mosaicData = [];
for (let i = 0; i < 96; i++) {
  const a = i / 96 * TAU;
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -a, 0));
  mosaicData.push(instanceDatum(
    [Math.cos(a) * 7.65, 1.18, Math.sin(a) * 7.65], q, [.035, .025, .72],
    5.7 + i * .008, 9.2 + i * .008,
    [Math.cos(a) * 7, 4 + (i % 7), Math.sin(a) * 7], [a, a * .5, 0]
  ));
}
makeInstanced(new THREE.BoxGeometry(1, 1, 1), materials.goldDark, mosaicData, false);

// The entablature is built from separate voussoirs rather than a single ring.
const entablatureData = [];
const friezeData = [];
for (let i = 0; i < 48; i++) {
  const a = i / 48 * TAU;
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -a, 0));
  const offset = [Math.cos(a) * (9 + rand() * 5), 5 + rand() * 9, Math.sin(a) * (9 + rand() * 5)];
  entablatureData.push(instanceDatum(
    [Math.cos(a) * 0, 6.58, Math.sin(a) * 0], q, [1, 1, 1],
    13.5 + i * .055, 18.5 + i * .055, offset, [rand() * 2, a, rand()]
  ));
  for (let j = 0; j < 2; j++) {
    const aa = a + j * TAU / 96;
    const qq = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -aa, j ? .65 : 0));
    friezeData.push(instanceDatum(
      [Math.cos(aa) * 7.24, 6.74 + j * .18, Math.sin(aa) * 7.24], qq,
      [j ? .28 : .42, .055, .045], 15 + i * .05, 20.5 + i * .04,
      [Math.cos(aa) * 11, 7 + j * 3, Math.sin(aa) * 11], [aa, aa, aa]
    ));
  }
}
makeInstanced(annularSector(6.15, 7.25, .56, TAU / 48 * 1.04), materials.ivory, entablatureData);
makeInstanced(new THREE.BoxGeometry(1, 1, 1), materials.gold, friezeData, false);

const lowerCornice = new THREE.Mesh(new THREE.TorusGeometry(6.82, .18, 10, 160).rotateX(Math.PI / 2), materials.stoneDark);
lowerCornice.position.y = 6.38;
lowerCornice.castShadow = lowerCornice.receiveShadow = true;
registerPart(lowerCornice, 14, 19, [0, 10, 0], [0, 1.2, 0], .3);
const upperCornice = new THREE.Mesh(new THREE.TorusGeometry(7.1, .13, 10, 160).rotateX(Math.PI / 2), materials.goldDark);
upperCornice.position.y = 7.16;
upperCornice.castShadow = true;
registerPart(upperCornice, 16, 21, [0, 12, 0], [0, -1.4, 0], .25);

// Twenty-four shell wedges close into the dome; every fifth wedge carries a wider gold seam.
const domeSegments = [];
for (let i = 0; i < 24; i++) {
  const a = i / 24 * TAU;
  const wedgeAngle = TAU / 24;
  const geometry = new THREE.SphereGeometry(6.72, 7, 12, -wedgeAngle * .485, wedgeAngle * .97, .19, Math.PI / 2 - .19);
  const wedge = new THREE.Mesh(geometry, materials.ivory);
  wedge.position.y = 7.06;
  wedge.rotation.y = a;
  wedge.castShadow = wedge.receiveShadow = true;
  registerPart(wedge, 18.5 + i * .07, 25 + i * .055,
    [Math.cos(a) * (11 + rand() * 5), 7 + rand() * 7, Math.sin(a) * (11 + rand() * 5)],
    [rand() * 2, -a + rand(), rand() * 2], .18);
  domeSegments.push(wedge);
}

// Coffers are tangent to the dome, not billboarded: local Y is the exact surface normal.
const cofferGoldData = [];
const cofferDarkData = [];
for (let band = 0; band < 5; band++) {
  const theta = .38 + band * .215;
  for (let i = 0; i < 48; i++) {
    const phi = i / 48 * TAU + (band % 2) * TAU / 96;
    const normal = new THREE.Vector3(Math.sin(theta) * Math.cos(phi), Math.cos(theta), Math.sin(theta) * Math.sin(phi));
    const tangent = new THREE.Vector3(-Math.sin(phi), 0, Math.cos(phi));
    const down = new THREE.Vector3().crossVectors(tangent, normal).normalize();
    const basis = new THREE.Matrix4().makeBasis(tangent, normal, down);
    const q = new THREE.Quaternion().setFromRotationMatrix(basis);
    const p = normal.clone().multiplyScalar(6.76).add(new THREE.Vector3(0, 7.06, 0));
    const w = .49 + band * .105;
    const h = .47 + band * .045;
    const start = 20 + band * .55 + i * .018;
    const end = 25.2 + band * .4 + i * .014;
    const offset = [normal.x * (10 + rand() * 6), 6 + rand() * 6, normal.z * (10 + rand() * 6)];
    cofferGoldData.push(instanceDatum(p.toArray(), q, [w, .055, h], start, end, offset, [phi, theta, phi * .5]));
    const front = p.clone().addScaledVector(normal, .045);
    cofferDarkData.push(instanceDatum(front.toArray(), q, [w * .78, .065, h * .72], start + .08, end + .12, offset, [phi, theta, phi * .5]));
  }
}
makeInstanced(new THREE.BoxGeometry(1, 1, 1), materials.goldDark, cofferGoldData, false);
makeInstanced(new THREE.BoxGeometry(1, 1, 1), materials.coffer, cofferDarkData, false);

const ribGeometries = [];
for (let i = 0; i < 48; i++) {
  const phi = i / 48 * TAU;
  const points = [];
  for (let j = 0; j <= 24; j++) {
    const theta = .19 + (Math.PI / 2 - .19) * j / 24;
    points.push(new THREE.Vector3(
      Math.sin(theta) * Math.cos(phi) * 6.79,
      7.06 + Math.cos(theta) * 6.79,
      Math.sin(theta) * Math.sin(phi) * 6.79
    ));
  }
  ribGeometries.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 28, i % 4 === 0 ? .036 : .019, 5, false));
}
const ribs = new THREE.Mesh(mergeGeometries(ribGeometries), materials.gold);
ribs.castShadow = true;
registerPart(ribs, 20.5, 26.2, [0, 9, 0], [0, Math.PI, 0], .15);
ribGeometries.forEach(g => g.dispose());

const oculus = new THREE.Mesh(new THREE.TorusGeometry(1.29, .12, 12, 96).rotateX(Math.PI / 2), materials.gold);
oculus.position.y = 13.66;
oculus.castShadow = true;
registerPart(oculus, 24, 27, [0, 10, 0], [1, 1, 0], .1);

// An outer armillary cage completes the celestial-instrument silhouette.
const armillary = new THREE.Group();
armillary.position.y = 7.1;
const outerRings = [];
for (let i = 0; i < 3; i++) {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(8.35 + i * .42, .022 + i * .006, 6, 192), i === 1 ? materials.goldDark : materials.gold);
  ring.rotation.set(Math.PI / 2 + i * .43, i * .37, i * .58);
  ring.castShadow = true;
  armillary.add(ring);
  outerRings.push(ring);
}
registerPart(armillary, 24.2, 29.2, [0, 10, 0], [.7, 1.5, .3], .04);
const armillaryTicks = [];
for (let i = 0; i < 120; i++) {
  const a = i / 120 * TAU;
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -a, 0));
  armillaryTicks.push(instanceDatum(
    [Math.cos(a) * 9.19, 7.1, Math.sin(a) * 9.19], q,
    [i % 5 === 0 ? .045 : .022, i % 5 === 0 ? .28 : .13, .025],
    25 + i * .006, 29.4 + i * .003,
    [Math.cos(a) * 8, 7 + (i % 9), Math.sin(a) * 8], [a, a, 0]
  ));
}
makeInstanced(new THREE.BoxGeometry(1, 1, 1), materials.gold, armillaryTicks, false);

// Coarse silhouettes beyond the fog prevent the world from reading as an empty stage.
const distant = new THREE.Group();
for (let i = 0; i < 28; i++) {
  const a = i / 28 * TAU + rand() * .08;
  const r = 48 + rand() * 40;
  const h = 5 + rand() * 17;
  const monolith = new THREE.Mesh(new THREE.BoxGeometry(1.2 + rand() * 3, h, 1.2 + rand() * 2), materials.stoneDark);
  monolith.position.set(Math.cos(a) * r, h / 2 - .2, Math.sin(a) * r);
  monolith.rotation.y = rand() * Math.PI;
  distant.add(monolith);
}
scene.add(distant);

// Merge the reusable Ionic master into one normalized geometry, then instance it around the peristyle.
async function buildColumns() {
  const assetModulePath = '/herald/assets/column/asset.mjs';
  const { createAsset } = await import(/* @vite-ignore */ assetModulePath);
  const root = await createAsset(THREE, { states: 'lazy', sharedResources: true });
  root.updateMatrixWorld(true);
  const geometries = [];
  root.traverse(object => {
    if (!object.isMesh || !object.visible) return;
    const geometry = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone();
    geometry.applyMatrix4(object.matrixWorld);
    for (const name of Object.keys(geometry.attributes)) {
      if (!['position', 'normal', 'uv'].includes(name)) geometry.deleteAttribute(name);
    }
    if (!geometry.attributes.normal) geometry.computeVertexNormals();
    if (!geometry.attributes.uv) geometry.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(geometry.attributes.position.count * 2), 2));
    geometry.clearGroups();
    geometries.push(geometry);
  });
  const geometry = mergeGeometries(geometries, false);
  geometries.forEach(g => g.dispose());
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  geometry.translate(-center.x, -box.min.y, -center.z);
  const normalize = 5.12 / size.y;
  geometry.scale(normalize, normalize, normalize);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();

  const data = [];
  const collarData = [];
  const horizontalQ = new THREE.Quaternion();
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * TAU;
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -a + Math.PI / 2, 0));
    const radialOffset = [Math.cos(a) * (8 + rand() * 7), 4 + rand() * 10, Math.sin(a) * (8 + rand() * 7)];
    data.push(instanceDatum(
      [Math.cos(a) * 6.35, 1.15, Math.sin(a) * 6.35], q, [1, 1, 1],
      7 + i * .23, 12.7 + i * .18, radialOffset,
      [rand() * 2, a * 2, rand() * 2]
    ));
    collarData.push(instanceDatum(
      [Math.cos(a) * 6.35, 1.44, Math.sin(a) * 6.35], horizontalQ, [1, 1, 1],
      8 + i * .23, 13 + i * .18, radialOffset, [a, a, a]
    ));
  }
  makeInstanced(geometry, materials.ivory, data);
  makeInstanced(new THREE.TorusGeometry(.47, .032, 6, 40).rotateX(Math.PI / 2), materials.gold, collarData, false);
  await root.dispose();
}

const pedestal = latheProfile([[0, 0], [1.3, 0], [1.42, .12], [1.15, .26], [.92, .42], [.75, 1.1], [1.0, 1.25], [0, 1.25]], materials.stoneDark, 96);
pedestal.position.y = 1.15;
registerPart(pedestal, 21.5, 25.5, [0, -6, 0], [0, 1, 0], .25);
const pedestalRing = new THREE.Mesh(new THREE.TorusGeometry(1.03, .045, 8, 80).rotateX(Math.PI / 2), materials.gold);
pedestalRing.position.y = 2.39;
registerPart(pedestalRing, 23, 26.5, [0, -5, 0], [0, 0, 0], .1);

const seed = new THREE.Group();
seed.position.set(0, 4.25, 0);
const core = new THREE.Mesh(new THREE.IcosahedronGeometry(.62, 4), materials.glow);
core.castShadow = true;
seed.add(core);
const coreShell = new THREE.Mesh(new THREE.IcosahedronGeometry(.88, 2), new THREE.MeshStandardMaterial({ color: GOLD, wireframe: true, transparent: true, opacity: .5, emissive: GOLD, emissiveIntensity: .6 }));
seed.add(coreShell);
const astroRings = [];
for (let i = 0; i < 4; i++) {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.35 + i * .32, .022 + (i % 2) * .012, 6, 128), i === 3 ? materials.goldDark : materials.gold);
  ring.rotation.set(.35 + i * .47, i * .63, .2 + i * .31);
  seed.add(ring);
  astroRings.push(ring);
}
registerPart(seed, 24.5, 28.5, [0, 9, 0], [1.2, 2, .5], .05);

const beamMaterial = new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: .065, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
const beam = new THREE.Mesh(new THREE.CylinderGeometry(.55, 1.3, 10, 48, 1, true), beamMaterial);
beam.position.y = 16.8;
registerPart(beam, 26, 29, [0, 8, 0], [0, 0, 0], .01);

function glyphTexture(character) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 128, 128);
  ctx.shadowColor = 'rgba(212,175,55,.55)';
  ctx.shadowBlur = 12;
  ctx.fillStyle = '#e3c660';
  ctx.font = '400 82px "Cormorant Garamond", Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(character, 64, 66);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const characters = [...'ΩΨΑΛΜΝΞΠΣΦΔΘĀḒṆṢÆᚠᛟ𒀭𒈹अक्षोभ्य天照'];
const glyphs = [];
for (let i = 0; i < 56; i++) {
  const character = characters[i % characters.length];
  const material = new THREE.SpriteMaterial({ map: glyphTexture(character), color: 0xe1c157, transparent: true, opacity: .7, depthWrite: false, blending: THREE.AdditiveBlending });
  const sprite = new THREE.Sprite(material);
  const a = i / 56 * TAU + rand() * .35;
  const r = 8 + rand() * 14;
  const y = .8 + rand() * 15;
  const scatter = new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
  const finalA = i / 56 * TAU * 3;
  const final = new THREE.Vector3(Math.cos(finalA) * (2.1 + (i % 4) * .25), 3.8 + Math.sin(i * 1.7) * 1.5, Math.sin(finalA) * (2.1 + (i % 4) * .25));
  sprite.position.copy(scatter);
  const scale = .28 + rand() * .5;
  sprite.scale.setScalar(scale);
  scene.add(sprite);
  glyphs.push({ sprite, scatter, final, scale, phase: rand() * TAU });
}

const centralGlyphMaterial = new THREE.SpriteMaterial({ map: glyphTexture('Ω'), color: 0xffe9a0, transparent: true, opacity: .95, depthWrite: false, blending: THREE.AdditiveBlending });
const centralGlyph = new THREE.Sprite(centralGlyphMaterial);
centralGlyph.position.set(0, 0, .7);
centralGlyph.scale.setScalar(1.35);
seed.add(centralGlyph);

const dustGeometry = new THREE.BufferGeometry();
const dustPositions = new Float32Array(900 * 3);
for (let i = 0; i < 900; i++) {
  const a = rand() * TAU;
  const r = 5 + Math.pow(rand(), .6) * 34;
  dustPositions[i * 3] = Math.cos(a) * r;
  dustPositions[i * 3 + 1] = .3 + rand() * 21;
  dustPositions[i * 3 + 2] = Math.sin(a) * r;
}
dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
const dust = new THREE.Points(dustGeometry, new THREE.PointsMaterial({ color: 0xc7a849, size: .035, transparent: true, opacity: .38, depthWrite: false, blending: THREE.AdditiveBlending }));
scene.add(dust);

function updatePart(part, t) {
  const raw = clamp01((t - part.start) / (part.end - part.start));
  const p = life(t, part.start, part.end);
  const eased = easeOutBack(raw) * (1 - smoother((t - 32) / 4));
  part.object.position.lerpVectors(part.scatterP, part.finalP, eased);
  part.object.quaternion.slerpQuaternions(part.scatterQ, part.finalQ, smoother(p));
  part.object.scale.lerpVectors(part.scatterS, part.finalS, smoother(p));
  part.object.visible = p > .0001;
}

function updateInstances(system, t) {
  for (let i = 0; i < system.data.length; i++) {
    const d = system.data[i];
    const raw = clamp01((t - d.start) / (d.end - d.start));
    const p = life(t, d.start, d.end);
    const eased = easeOutBack(raw) * (1 - smoother((t - 32) / 4));
    tmp.p.lerpVectors(d.scatterP, d.finalP, eased);
    tmp.q.slerpQuaternions(d.scatterQ, d.finalQ, smoother(p));
    tmp.s.lerpVectors(d.scatterS, d.finalS, smoother(p));
    tmp.m.compose(tmp.p, tmp.q, tmp.s);
    system.mesh.setMatrixAt(i, tmp.m);
  }
  system.mesh.instanceMatrix.needsUpdate = true;
}

const chapters = [
  { at: 0, name: 'The scattered realm', numeral: 'I' },
  { at: 3, name: 'The foundation remembers', numeral: 'II' },
  { at: 7, name: 'The order rises', numeral: 'III' },
  { at: 14, name: 'The measure of all things', numeral: 'IV' },
  { at: 19, name: 'The heavens close', numeral: 'V' },
  { at: 25, name: 'The first character', numeral: 'VI' },
  { at: 29, name: 'The Pantheon revealed', numeral: 'VII' },
  { at: 32, name: 'The eternal restoration', numeral: 'VIII' }
];
const ui = {
  chapter: document.getElementById('chapter'), count: document.getElementById('chapter-count'),
  elapsed: document.getElementById('elapsed'), timeline: document.getElementById('timeline'),
  play: document.getElementById('play'), playLabel: document.getElementById('play-label'),
  playIcon: document.getElementById('play-icon'), camera: document.getElementById('camera'),
  cameraLabel: document.getElementById('camera-label')
};
let autoCamera = true;
let paused = false;
let simT = 0;
let lastChapter = -1;

function updateUI(t) {
  let index = 0;
  for (let i = 0; i < chapters.length; i++) if (t >= chapters[i].at) index = i;
  if (index !== lastChapter) {
    ui.chapter.textContent = chapters[index].name;
    ui.count.textContent = `${chapters[index].numeral} / VIII`;
    lastChapter = index;
  }
  ui.elapsed.textContent = `00:${String(Math.floor(t)).padStart(2, '0')}`;
  ui.timeline.value = t;
  ui.timeline.style.setProperty('--progress', `${t / DURATION * 100}%`);
}

function updatePlayUI() {
  ui.playLabel.textContent = paused ? 'PLAY' : 'PAUSE';
  ui.play.setAttribute('aria-label', paused ? 'Play animation' : 'Pause animation');
  ui.playIcon.innerHTML = paused ? '<path d="M7 4v16l13-8z"/>' : '<path d="M6 4h4v16H6zm8 0h4v16h-4z"/>';
}

function sample(time) {
  const t = ((time % DURATION) + DURATION) % DURATION;
  const phase = t / DURATION * TAU;
  const returning = smoother((t - 32) / 4);
  for (const part of parts) updatePart(part, t);
  for (const system of instanceSystems) updateInstances(system, t);

  const seedProgress = life(t, 24.5, 28.5);
  heartLight.intensity = 62 * seedProgress;
  heartLight.position.y = 4.5 + seedProgress * 1.5;
  core.rotation.set(phase * .5, phase, phase * .25);
  coreShell.rotation.set(-phase * .25, -phase, phase * .5);
  coreShell.material.opacity = .18 + seedProgress * .45;
  for (let i = 0; i < astroRings.length; i++) {
    const ring = astroRings[i];
    ring.rotation.set(
      .35 + i * .47 + Math.sin(phase) * .12,
      i * .63 + phase * (1 + i % 2),
      .2 + i * .31 + phase * (i % 2 ? -1 : 1)
    );
  }
  for (let i = 0; i < outerRings.length; i++) {
    outerRings[i].rotation.set(Math.PI / 2 + i * .43 + Math.sin(phase) * .08, i * .37 + phase * (i + 1), i * .58 + phase * (i % 2 ? 1 : -1));
  }
  beamMaterial.opacity = .003 + seedProgress * .024;
  dust.rotation.y = phase;
  dust.position.y = Math.sin(phase) * .15;

  for (const glyph of glyphs) {
    const gather = smoother((t - 1.2) / 24.5) * (1 - returning);
    glyph.sprite.position.lerpVectors(glyph.scatter, glyph.final, gather);
    const drift = (1 - gather) * .3;
    glyph.sprite.position.y += Math.sin(phase + glyph.phase) * drift;
    const scale = glyph.scale * (1 - gather * .58);
    glyph.sprite.scale.setScalar(scale);
    glyph.sprite.material.opacity = .28 + (1 - gather) * .55;
    glyph.sprite.material.rotation = Math.sin(phase + glyph.phase) * .12;
  }

  if (autoCamera) {
    const angle = .58 + phase;
    const mobileFrame = camera.aspect < .8 ? 1.43 : 1;
    const radius = (30 - Math.sin(t / DURATION * Math.PI) * 3) * mobileFrame;
    const height = 10.8 + Math.sin(t / DURATION * Math.PI) * 2.5;
    camera.position.set(Math.cos(angle) * radius, height, Math.sin(angle) * radius);
    controls.target.set(0, 4.25 + seedProgress * 1.2, 0);
    camera.lookAt(controls.target);
  }
  finishingPass.uniforms.uPhase.value = phase;
  updateUI(t);
}

function draw() {
  controls.update();
  renderer.info.reset();
  composer.render();
}

const clock = new THREE.Clock();
let frameEMA = 16;
let frameCount = 0;
function animate() {
  const dt = Math.min(clock.getDelta(), .08);
  if (!paused) {
    simT = (simT + dt) % DURATION;
    sample(simT);
  }
  const start = performance.now();
  draw();
  frameEMA = frameEMA * .96 + (performance.now() - start) * .04;
  frameCount++;
  if (frameCount === 150 && frameEMA > 25 && renderer.getPixelRatio() > 1) {
    renderer.setPixelRatio(1);
    composer.setPixelRatio(1);
    renderer.setSize(innerWidth, innerHeight);
    composer.setSize(innerWidth, innerHeight);
  }
}

window.__seek = value => {
  const numeric = Number(value);
  simT = Number.isFinite(numeric) ? Math.max(0, numeric) : 0;
  paused = true;
  updatePlayUI();
  sample(simT);
  draw();
};
window.__play = () => { paused = false; updatePlayUI(); clock.getDelta(); };
window.__SCENE_STATS__ = () => ({
  calls: renderer.info.render.calls, triangles: renderer.info.render.triangles,
  geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures,
  pixelRatio: renderer.getPixelRatio(), frameEMA: Number(frameEMA.toFixed(2))
});

ui.play.addEventListener('click', () => {
  paused = !paused;
  updatePlayUI();
  clock.getDelta();
});
document.getElementById('restart').addEventListener('click', () => {
  simT = 0;
  paused = false;
  sample(simT);
  updatePlayUI();
  clock.getDelta();
});
ui.timeline.addEventListener('input', event => window.__seek(event.target.value));
ui.camera.addEventListener('click', () => {
  autoCamera = !autoCamera;
  controls.enabled = !autoCamera;
  renderer.domElement.style.touchAction = autoCamera ? 'pan-y' : 'none';
  ui.camera.setAttribute('aria-pressed', String(!autoCamera));
  ui.cameraLabel.textContent = autoCamera ? 'ORBIT' : 'CINEMATIC';
  if (!autoCamera) {
    controls.target.set(0, 4.8, 0);
    controls.update();
  }
});
addEventListener('keydown', event => {
  if (event.code === 'Space' && !['INPUT', 'BUTTON'].includes(document.activeElement?.tagName)) {
    event.preventDefault();
    paused = !paused;
    updatePlayUI();
    clock.getDelta();
  }
});

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.fov = camera.aspect < .8 ? 55 : 42;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
  if (paused) draw();
});

async function init() {
  try {
    await document.fonts.ready;
    await buildColumns();
    if (reducedMotion && !CAPTURE) { simT = 30; paused = true; }
    sample(simT);
    updatePlayUI();
    draw();
    document.getElementById('boot').classList.add('hidden');
    setTimeout(() => document.getElementById('boot')?.remove(), 700);
    if (CAPTURE) window.__seek(params.get('t'));
    else renderer.setAnimationLoop(animate);
    window.__SCENE_READY__ = true;
  } catch (error) {
    showFallback(error);
  }
}

init();
