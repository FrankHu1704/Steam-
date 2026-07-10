import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const LANE_WIDTH = 3.2;
const LANE_X = [-LANE_WIDTH, 0, LANE_WIDTH];
const ROAD_WIDTH = LANE_WIDTH * 3 + 2;
const SPAWN_Z = -160; // where obstacles/scenery appear (far ahead)
const DESPAWN_Z = 8; // where they get recycled (passed the player)
const PLAYER_Z = 0;
const BASE_SPEED = 16; // units/sec
const MAX_SPEED = 42;
const SPEED_RAMP = 0.0035; // speed gain per meter traveled
const ACCEL = 9; // units/sec^2 toward target speed
const NITRO_MULTIPLIER = 1.7;
const NITRO_DRAIN_PER_SEC = 34; // gauge units/sec while boosting
const NITRO_REGEN_PER_SEC = 4; // passive regen
const NITRO_PICKUP_AMOUNT = 28;
const KMH_SCALE = 11.2; // converts internal speed units -> displayed km/h
const TRAFFIC_POOL_SIZE = 7;
const NITRO_POOL_SIZE = 4;
const SCENERY_POOL_SIZE = 26;

// Steering physics: lateral position behaves like a damped spring toward the
// target lane, which gives a bit of natural overshoot/settle instead of a
// robotic snap, plus a body-roll bank angle derived from lateral velocity.
const STEER_STIFFNESS = 46; // spring constant
const STEER_DAMPING = 11; // damping constant
const MAX_BANK = 0.24; // radians

// ---------------------------------------------------------------------------
// DOM
// ---------------------------------------------------------------------------
const canvas = document.getElementById("game-canvas");
const hud = document.getElementById("hud");
const touchControls = document.getElementById("touch-controls");
const overlayStart = document.getElementById("overlay-start");
const overlayGameover = document.getElementById("overlay-gameover");
const hudDistance = document.getElementById("hud-distance");
const hudSpeed = document.getElementById("hud-speed");
const hudNitroFill = document.getElementById("hud-nitro-fill");
const nitroBarEl = hudNitroFill.parentElement;
const finalDistanceEl = document.getElementById("final-distance");

// ---------------------------------------------------------------------------
// Renderer / scene / camera
// ---------------------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.95;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x03050b, 0.016);

const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 300);
camera.position.set(0, 5, 8.5);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.4, 0.4, 0.72);
composer.addPass(bloomPass);
composer.addPass(new OutputPass());

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h);
  composer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", resize);
resize();

// ---------------------------------------------------------------------------
// Sky (gradient backdrop + stars + moon, cheap 2D-texture trick)
// ---------------------------------------------------------------------------
function makeSkyTexture() {
  const c = document.createElement("canvas");
  c.width = 24;
  c.height = 256;
  const ctx = c.getContext("2d");
  const grad = ctx.createLinearGradient(0, 0, 0, c.height);
  grad.addColorStop(0, "#050813");
  grad.addColorStop(0.45, "#060810");
  grad.addColorStop(1, "#020207");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, c.width, c.height);
  for (let i = 0; i < 90; i++) {
    const y = Math.random() * c.height * 0.55;
    ctx.fillStyle = `rgba(255,255,255,${0.1 + Math.random() * 0.35})`;
    ctx.fillRect(Math.random() * c.width, y, 1, 1);
  }
  const moonGrad = ctx.createRadialGradient(18, 34, 1, 18, 34, 20);
  moonGrad.addColorStop(0, "rgba(200,215,255,0.55)");
  moonGrad.addColorStop(1, "rgba(200,215,255,0)");
  ctx.fillStyle = moonGrad;
  ctx.fillRect(0, 0, c.width, 80);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
scene.background = makeSkyTexture();

// ---------------------------------------------------------------------------
// Lights
// ---------------------------------------------------------------------------
scene.add(new THREE.HemisphereLight(0x3b4d7a, 0x08080f, 0.32));
const moon = new THREE.DirectionalLight(0xaec2ff, 0.55);
moon.position.set(-14, 22, 8);
moon.castShadow = true;
moon.shadow.mapSize.set(1024, 1024);
moon.shadow.camera.left = -20;
moon.shadow.camera.right = 20;
moon.shadow.camera.top = 20;
moon.shadow.camera.bottom = -20;
moon.shadow.camera.near = 1;
moon.shadow.camera.far = 60;
moon.shadow.bias = -0.0015;
scene.add(moon);
scene.add(moon.target);

// ---------------------------------------------------------------------------
// Road (single long plane, scrolling texture = cheap "infinite" road)
// ---------------------------------------------------------------------------
function makeRoadTexture() {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 512;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#1b2030";
  ctx.fillRect(0, 0, c.width, c.height);
  // subtle asphalt speckle for texture detail
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.035})`;
    ctx.fillRect(Math.random() * c.width, Math.random() * c.height, 2, 2);
  }
  ctx.fillStyle = "#242b42";
  ctx.fillRect(0, 0, 14, c.height);
  ctx.fillRect(c.width - 14, 0, 14, c.height);
  ctx.strokeStyle = "#e7ecff";
  ctx.lineWidth = 5;
  ctx.setLineDash([34, 30]);
  ctx.beginPath();
  ctx.moveTo(c.width / 3, 0);
  ctx.lineTo(c.width / 3, c.height);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo((c.width / 3) * 2, 0);
  ctx.lineTo((c.width / 3) * 2, c.height);
  ctx.stroke();
  // faint wet-asphalt highlight down the middle
  const shine = ctx.createLinearGradient(c.width / 2 - 30, 0, c.width / 2 + 30, 0);
  shine.addColorStop(0, "rgba(140,180,255,0)");
  shine.addColorStop(0.5, "rgba(140,180,255,0.08)");
  shine.addColorStop(1, "rgba(140,180,255,0)");
  ctx.fillStyle = shine;
  ctx.fillRect(c.width / 2 - 30, 0, 60, c.height);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 40);
  return tex;
}

const roadTexture = makeRoadTexture();
const roadGeo = new THREE.PlaneGeometry(ROAD_WIDTH, 400);
const roadMat = new THREE.MeshStandardMaterial({ map: roadTexture, roughness: 0.65, metalness: 0.1 });
const road = new THREE.Mesh(roadGeo, roadMat);
road.rotation.x = -Math.PI / 2;
road.position.z = -140;
road.receiveShadow = true;
scene.add(road);

// ground either side of the road
const groundGeo = new THREE.PlaneGeometry(400, 400);
const groundMat = new THREE.MeshStandardMaterial({ color: 0x0b0e16, roughness: 1 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.02;
ground.receiveShadow = true;
scene.add(ground);

// ---------------------------------------------------------------------------
// Cars (PBR paint, glass, headlights/taillights)
// ---------------------------------------------------------------------------
function buildCar(color, { isPlayer = false } = {}) {
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.32,
    metalness: 0.55,
    clearcoat: 1,
    clearcoatRoughness: 0.12,
  });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.5, 3.4), bodyMat);
  body.position.y = 0.5;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.22, 1.05), bodyMat);
  hood.position.set(0, 0.68, -1.35);
  hood.castShadow = true;
  group.add(hood);

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x0d1826,
    roughness: 0.05,
    metalness: 0.1,
    transparent: true,
    opacity: 0.75,
  });
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.42, 1.6), glassMat);
  cabin.position.set(0, 0.86, -0.1);
  cabin.castShadow = true;
  group.add(cabin);

  const mirrorMat = new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 0.4, metalness: 0.6 });
  for (const side of [-1, 1]) {
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.22), mirrorMat);
    mirror.position.set(side * 0.9, 0.78, -0.55);
    group.add(mirror);
  }

  const wheelGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.32, 16);
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x0c0d10, roughness: 0.95 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xb9c2d6, roughness: 0.3, metalness: 0.9 });
  const wheelPositions = [
    [-0.85, 0.34, 1.15],
    [0.85, 0.34, 1.15],
    [-0.85, 0.34, -1.15],
    [0.85, 0.34, -1.15],
  ];
  for (const [x, y, z] of wheelPositions) {
    const wheel = new THREE.Mesh(wheelGeo, tireMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, y, z);
    wheel.castShadow = true;
    group.add(wheel);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.34, 12), rimMat);
    rim.rotation.z = Math.PI / 2;
    rim.position.set(x, y, z);
    group.add(rim);
  }

  const tailLightMat = new THREE.MeshStandardMaterial({ color: 0xff2d2d, emissive: 0xff2d2d, emissiveIntensity: 2 });
  const tailLight = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.14, 0.08), tailLightMat);
  tailLight.position.set(0, 0.55, 1.72);
  group.add(tailLight);

  const headLightMat = new THREE.MeshStandardMaterial({ color: 0xfff4d6, emissive: 0xfff4d6, emissiveIntensity: 2.4 });
  for (const side of [-1, 1]) {
    const headLight = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.13, 0.06), headLightMat);
    headLight.position.set(side * 0.55, 0.52, -1.86);
    group.add(headLight);
  }

  if (isPlayer) {
    const spoiler = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 0.32), bodyMat);
    spoiler.position.set(0, 0.98, 1.55);
    spoiler.castShadow = true;
    group.add(spoiler);
    for (const side of [-1, 1]) {
      const strut = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.28, 0.08), tireMat);
      strut.position.set(side * 0.65, 0.84, 1.55);
      group.add(strut);
    }

    for (const side of [-1, 1]) {
      const lamp = new THREE.SpotLight(0xfff2d0, 6, 22, Math.PI / 6, 0.5, 1.2);
      lamp.position.set(side * 0.55, 0.55, -1.9);
      lamp.target.position.set(side * 0.55, 0, -14);
      group.add(lamp);
      group.add(lamp.target);
    }
  }

  return group;
}

const player = buildCar(0xff5f2e, { isPlayer: true });
player.position.set(LANE_X[1], 0, PLAYER_Z);
scene.add(player);

const nitroGlowMat = new THREE.MeshBasicMaterial({ color: 0x00e0ff, transparent: true, opacity: 0 });
const nitroGlow = new THREE.Mesh(new THREE.ConeGeometry(0.22, 1.1, 10), nitroGlowMat);
nitroGlow.rotation.x = Math.PI / 2;
nitroGlow.position.set(0, 0.42, 2.1);
player.add(nitroGlow);

// ---------------------------------------------------------------------------
// Object pools: traffic cars, nitro pickups, scenery
// ---------------------------------------------------------------------------
const trafficColors = [0x5aa0ff, 0xffe066, 0x9ad14b, 0xc084fc, 0xffffff];
const traffic = [];
for (let i = 0; i < TRAFFIC_POOL_SIZE; i++) {
  const car = buildCar(trafficColors[i % trafficColors.length]);
  car.position.set(LANE_X[i % 3], 0, SPAWN_Z - i * 24);
  scene.add(car);
  traffic.push({ mesh: car, lane: i % 3 });
}

function resetTraffic(item, minZ) {
  item.lane = Math.floor(Math.random() * 3);
  item.mesh.position.x = LANE_X[item.lane];
  item.mesh.position.z = minZ - (60 + Math.random() * 60);
}

const nitroItems = [];
const nitroPickupGeo = new THREE.OctahedronGeometry(0.42);
const nitroPickupMat = new THREE.MeshStandardMaterial({
  color: 0x00e0ff,
  emissive: 0x00e0ff,
  emissiveIntensity: 1.6,
  roughness: 0.2,
});
for (let i = 0; i < NITRO_POOL_SIZE; i++) {
  const mesh = new THREE.Mesh(nitroPickupGeo, nitroPickupMat);
  const lane = Math.floor(Math.random() * 3);
  mesh.position.set(LANE_X[lane], 0.6, SPAWN_Z - i * 45 - 20);
  scene.add(mesh);
  nitroItems.push({ mesh, lane });
}

function resetNitroItem(item, minZ) {
  item.lane = Math.floor(Math.random() * 3);
  item.mesh.position.x = LANE_X[item.lane];
  item.mesh.position.z = minZ - (70 + Math.random() * 90);
}

// Roadside buildings with lit-window texture + a few glowing street lamps
function makeWindowTexture(seed) {
  const c = document.createElement("canvas");
  c.width = 32;
  c.height = 64;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#0c0f1a";
  ctx.fillRect(0, 0, c.width, c.height);
  let s = seed;
  const rand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  for (let y = 3; y < c.height; y += 6) {
    for (let x = 2; x < c.width; x += 5) {
      if (rand() > 0.55) {
        ctx.fillStyle = rand() > 0.5 ? "rgba(255,214,140,0.9)" : "rgba(150,210,255,0.75)";
        ctx.fillRect(x, y, 3, 4);
      }
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const scenery = [];
const buildingBaseColors = [0x171b30, 0x1c1730, 0x11201f, 0x241722];
for (let i = 0; i < SCENERY_POOL_SIZE; i++) {
  const side = i % 2 === 0 ? -1 : 1;
  const height = 4 + Math.random() * 14;
  const geo = new THREE.BoxGeometry(4 + Math.random() * 4, height, 4 + Math.random() * 4);
  const mat = new THREE.MeshStandardMaterial({
    color: buildingBaseColors[i % buildingBaseColors.length],
    roughness: 0.9,
    emissiveMap: makeWindowTexture(i * 17 + 3),
    emissive: 0xffffff,
    emissiveIntensity: 0.9,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.position.set(side * (ROAD_WIDTH / 2 + 5 + Math.random() * 8), height / 2, -i * 16 - Math.random() * 10);
  scene.add(mesh);
  scenery.push({ mesh, side });
}

function resetScenery(item, minZ) {
  const height = 4 + Math.random() * 14;
  item.mesh.geometry.dispose();
  item.mesh.geometry = new THREE.BoxGeometry(4 + Math.random() * 4, height, 4 + Math.random() * 4);
  item.mesh.position.y = height / 2;
  item.mesh.position.x = item.side * (ROAD_WIDTH / 2 + 5 + Math.random() * 8);
  item.mesh.position.z = minZ - (200 + Math.random() * 120);
}

// Street lamps: emissive heads only (no per-lamp dynamic light, keeps perf sane)
const lamps = [];
const lampPoleMat = new THREE.MeshStandardMaterial({ color: 0x14161f, roughness: 0.6, metalness: 0.6 });
const lampHeadMat = new THREE.MeshStandardMaterial({ color: 0xfff0c2, emissive: 0xffdf9e, emissiveIntensity: 3 });
for (let i = 0; i < 14; i++) {
  const side = i % 2 === 0 ? -1 : 1;
  const group = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 4.2, 6), lampPoleMat);
  pole.position.y = 2.1;
  group.add(pole);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), lampHeadMat);
  head.position.set(side * -0.5, 4.15, 0);
  group.add(head);
  group.position.set(side * (ROAD_WIDTH / 2 + 0.6), 0, -i * 24 - 8);
  scene.add(group);
  lamps.push({ group, side });
}

function resetLamp(item, minZ) {
  item.group.position.z = minZ - (150 + Math.random() * 80);
}

// ---------------------------------------------------------------------------
// Game state
// ---------------------------------------------------------------------------
const state = {
  mode: "idle", // idle | playing | crashing | gameover
  laneIndex: 1,
  playerX: LANE_X[1],
  lateralVel: 0,
  speed: BASE_SPEED,
  distance: 0,
  nitroGauge: 60,
  nitroActive: false,
  crashTimer: 0,
  spin: 0,
  spinVel: 0,
};

function resetGame() {
  state.mode = "playing";
  state.laneIndex = 1;
  state.playerX = LANE_X[1];
  state.lateralVel = 0;
  state.speed = BASE_SPEED;
  state.distance = 0;
  state.nitroGauge = 60;
  state.nitroActive = false;
  state.crashTimer = 0;
  state.spin = 0;
  state.spinVel = 0;
  player.position.x = LANE_X[1];
  player.position.z = PLAYER_Z;
  player.rotation.set(0, 0, 0);

  traffic.forEach((t, i) => resetTraffic(t, SPAWN_Z - i * 10));
  nitroItems.forEach((n, i) => resetNitroItem(n, SPAWN_Z - i * 20));
  scenery.forEach((s, i) => (s.mesh.position.z = -i * 16 - Math.random() * 10));
  lamps.forEach((l, i) => (l.group.position.z = -i * 24 - 8));

  hud.hidden = false;
  if (window.matchMedia("(pointer: coarse)").matches) touchControls.hidden = false;
  overlayGameover.hidden = true;
}

function beginCrash() {
  if (state.mode !== "playing") return;
  state.mode = "crashing";
  state.crashTimer = 0;
  state.spinVel = (Math.random() > 0.5 ? 1 : -1) * (5 + Math.random() * 2);
  touchControls.hidden = true;
}

function gameOver() {
  state.mode = "gameover";
  hud.hidden = true;
  finalDistanceEl.textContent = `${Math.round(state.distance)} m`;
  overlayGameover.hidden = false;
}

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------
function moveLane(dir) {
  if (state.mode !== "playing") return;
  state.laneIndex = Math.min(2, Math.max(0, state.laneIndex + dir));
}

window.addEventListener("keydown", (e) => {
  if (e.repeat) return;
  if (["ArrowLeft", "KeyA"].includes(e.code)) moveLane(-1);
  if (["ArrowRight", "KeyD"].includes(e.code)) moveLane(1);
  if (e.code === "Space") {
    state.nitroActive = true;
    e.preventDefault();
  }
});
window.addEventListener("keyup", (e) => {
  if (e.code === "Space") state.nitroActive = false;
});

document.getElementById("btn-left").addEventListener("click", () => moveLane(-1));
document.getElementById("btn-right").addEventListener("click", () => moveLane(1));
const nitroBtn = document.getElementById("btn-nitro");
["pointerdown", "touchstart"].forEach((ev) =>
  nitroBtn.addEventListener(ev, (e) => {
    e.preventDefault();
    state.nitroActive = true;
  })
);
["pointerup", "pointerleave", "touchend", "touchcancel"].forEach((ev) =>
  nitroBtn.addEventListener(ev, () => {
    state.nitroActive = false;
  })
);

document.getElementById("btn-start").addEventListener("click", () => {
  overlayStart.hidden = true;
  resetGame();
});
document.getElementById("btn-retry").addEventListener("click", () => {
  resetGame();
});

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------
const clock = new THREE.Clock();
let bob = 0;
let camShake = 0;

function updatePlaying(dt) {
  // speed: accelerate toward a target using a real accel rate, not a snap-lerp
  const targetBase = Math.min(MAX_SPEED, BASE_SPEED + state.distance * SPEED_RAMP);
  const boosting = state.nitroActive && state.nitroGauge > 0;
  const targetSpeed = boosting ? targetBase * NITRO_MULTIPLIER : targetBase;
  const accel = boosting ? ACCEL * 1.8 : ACCEL;
  const diff = targetSpeed - state.speed;
  state.speed += Math.sign(diff) * Math.min(Math.abs(diff), accel * dt);

  if (boosting) {
    state.nitroGauge = Math.max(0, state.nitroGauge - NITRO_DRAIN_PER_SEC * dt);
  } else {
    state.nitroGauge = Math.min(100, state.nitroGauge + NITRO_REGEN_PER_SEC * dt);
  }
  nitroGlowMat.opacity = boosting ? 0.85 : 0;
  nitroBarEl.classList.toggle("is-active", boosting);
  camera.fov += ((boosting ? 68 : 62) - camera.fov) * Math.min(1, dt * 4);
  camera.updateProjectionMatrix();

  state.distance += state.speed * dt;

  // lateral steering: critically-damped spring toward the target lane, which
  // produces a natural bit of overshoot/settle and lets us derive a bank angle.
  const targetX = LANE_X[state.laneIndex];
  const springForce = (targetX - state.playerX) * STEER_STIFFNESS - state.lateralVel * STEER_DAMPING;
  state.lateralVel += springForce * dt;
  state.playerX += state.lateralVel * dt;
  player.position.x = state.playerX;
  const bank = THREE.MathUtils.clamp(-state.lateralVel * 0.045, -MAX_BANK, MAX_BANK);
  player.rotation.z = bank;
  player.rotation.y = THREE.MathUtils.clamp(-state.lateralVel * 0.02, -0.18, 0.18);
  bob += dt * 10;
  player.position.y = Math.sin(bob) * 0.015;

  // scroll road texture
  roadTexture.offset.y -= (state.speed * dt) / 4;

  // advance traffic
  for (const t of traffic) {
    t.mesh.position.z += state.speed * dt;
    if (t.mesh.position.z > DESPAWN_Z) {
      resetTraffic(t, SPAWN_Z);
      continue;
    }
    const dz = Math.abs(t.mesh.position.z - PLAYER_Z);
    const dx = Math.abs(LANE_X[t.lane] - state.playerX);
    if (dz < 1.9 && dx < 1.5) {
      beginCrash();
    }
  }

  // advance nitro pickups
  for (const n of nitroItems) {
    n.mesh.position.z += state.speed * dt;
    n.mesh.rotation.y += dt * 3;
    n.mesh.position.y = 0.6 + Math.sin(bob * 0.6 + n.mesh.position.x) * 0.08;
    if (n.mesh.position.z > DESPAWN_Z) {
      resetNitroItem(n, SPAWN_Z);
      continue;
    }
    const dz = Math.abs(n.mesh.position.z - PLAYER_Z);
    const dx = Math.abs(LANE_X[n.lane] - state.playerX);
    if (dz < 1.6 && dx < 1.4) {
      state.nitroGauge = Math.min(100, state.nitroGauge + NITRO_PICKUP_AMOUNT);
      resetNitroItem(n, SPAWN_Z);
    }
  }

  // advance scenery + lamps
  for (const s of scenery) {
    s.mesh.position.z += state.speed * dt;
    if (s.mesh.position.z > DESPAWN_Z + 20) resetScenery(s, SPAWN_Z);
  }
  for (const l of lamps) {
    l.group.position.z += state.speed * dt;
    if (l.group.position.z > DESPAWN_Z + 20) resetLamp(l, SPAWN_Z);
  }

  // camera follows player laterally
  camera.position.x += (state.playerX * 0.6 - camera.position.x) * Math.min(1, dt * 4);
  camera.position.y = 5 + Math.sin(bob * 0.3) * 0.02;
  camera.lookAt(state.playerX * 0.3, 0.6, -14);

  // HUD
  hudDistance.textContent = `${Math.round(state.distance)} m`;
  hudSpeed.textContent = `${Math.round(state.speed * KMH_SCALE)}`;
  hudNitroFill.style.width = `${state.nitroGauge}%`;
}

function updateCrashing(dt) {
  state.crashTimer += dt;
  state.speed = Math.max(0, state.speed - 26 * dt);
  state.distance += state.speed * dt;
  state.spin += state.spinVel * dt;
  state.spinVel *= 0.985;
  player.rotation.y = state.spin;
  player.rotation.x = Math.sin(state.crashTimer * 14) * 0.05 * Math.max(0, 1 - state.crashTimer);
  camShake = Math.max(0, 0.35 - state.crashTimer * 0.6);
  camera.position.x += (Math.random() - 0.5) * camShake;
  camera.position.y = 5 + (Math.random() - 0.5) * camShake;
  roadTexture.offset.y -= (state.speed * dt) / 4;

  hudSpeed.textContent = `${Math.round(state.speed * KMH_SCALE)}`;
  hudDistance.textContent = `${Math.round(state.distance)} m`;

  if (state.crashTimer > 0.9) {
    gameOver();
  }
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(0.05, clock.getDelta());
  if (state.mode === "playing") {
    updatePlaying(dt);
  } else if (state.mode === "crashing") {
    updateCrashing(dt);
  } else {
    // idle ambient drift so the scene behind the start overlay feels alive
    roadTexture.offset.y -= dt * 1.2;
    camera.lookAt(0, 0.6, -14);
  }
  composer.render();
}

camera.lookAt(0, 0.6, -14);
animate();
