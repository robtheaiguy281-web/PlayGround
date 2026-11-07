import * as THREE from 'three';
import './style.css';

const el = (id) => document.getElementById(id);
const ui = {
  clock: el('clock'), home: el('home-score'), away: el('away-score'), distance: el('distance'),
  possession: el('possession-label'), stamina: el('stamina-fill'), staminaN: el('stamina-number'),
  power: el('power-fill'), powerN: el('power-number'), banner: el('phase-banner'),
  bannerTitle: el('banner-title'), bannerSubtitle: el('banner-subtitle'), toast: el('event-toast'),
  replay: el('replay-screen'), replayTitle: el('replay-title'), replaySub: el('replay-sub'),
  start: el('start-screen'), result: el('result-screen')
};
const scene = new THREE.Scene();
scene.background = new THREE.Color('#91b8bd');
scene.fog = new THREE.Fog('#91b8bd', 70, 155);
const camera = new THREE.PerspectiveCamera(54, innerWidth / innerHeight, .1, 240);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 700 ? 1.35 : 1.65));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
el('game').appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight('#e5f4ff', '#334329', 2.2));
const sun = new THREE.DirectionalLight('#fff1d2', 3.2);
sun.position.set(-24, 38, 17); sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -65; sun.shadow.camera.right = 65; sun.shadow.camera.top = 70; sun.shadow.camera.bottom = -70;
sun.shadow.bias = -.00035; scene.add(sun);

const mat = (color, roughness = .78, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
const turf = mat('#3c774a');
const stripeMat = new THREE.MeshBasicMaterial({ color: '#e8edcf', transparent: true, opacity: .43 });
const field = new THREE.Mesh(new THREE.PlaneGeometry(44, 104), turf);
field.rotation.x = -Math.PI / 2; field.position.y = -.035; field.receiveShadow = true; scene.add(field);
const markings = new THREE.Group(); scene.add(markings);
function fieldLine(x, z, width, length, material = stripeMat) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, length), material);
  mesh.rotation.x = -Math.PI / 2; mesh.position.set(x, .012, z); markings.add(mesh);
}
for (const z of [-49, -40, -30, -20, -10, 0, 10, 20, 30, 40, 49]) fieldLine(0, z, 42, z === 0 ? .22 : .11);
for (const x of [-21, 21]) fieldLine(x, 0, .14, 100);
// End-zone accents and twenty-metre arcs give both ends a clear target.
for (const z of [-44.5, 44.5]) fieldLine(0, z, 42, 9, new THREE.MeshBasicMaterial({ color: '#598a43', transparent: true, opacity: .42 }));
for (const x of [-10, 10]) fieldLine(x, 0, .1, 100, new THREE.MeshBasicMaterial({ color: '#dce4c5', transparent: true, opacity: .17 }));

const standMat = mat('#283943');
const standLight = mat('#394c53');
const stadium = new THREE.Group(); scene.add(stadium);
function box(parent, size, material, pos, cast = true) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...pos); mesh.castShadow = cast; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
for (const side of [-1, 1]) {
  box(stadium, [9, 8, 112], standMat, [side * 27, 3.9, 0]);
  for (let row = 0; row < 5; row++) box(stadium, [8.8, .18, 110], standLight, [side * 27, .7 + row * .68, 0], false);
  // Repeating colored crowd dots suggest a packed stand without expensive models.
  const crowdColors = ['#d4b992', '#a8c8bf', '#467c91', '#d2d5cb', '#ca775a', '#d4bd49'];
  for (let i = 0; i < 245; i++) {
    const x = side * (23.3 + Math.random() * 7.1), z = -53 + Math.random() * 106;
    const person = new THREE.Mesh(new THREE.BoxGeometry(.2, .28 + Math.random() * .16, .15), mat(crowdColors[i % crowdColors.length], 1));
    person.position.set(x, 1 + Math.random() * 4.7, z); stadium.add(person);
  }
}
for (const z of [-56, 56]) {
  box(stadium, [57, 8, 6], standMat, [0, 3.9, z]);
  for (let i = -20; i <= 20; i += 2) box(stadium, [.2, 5, .2], mat(i % 4 ? '#b9c5b7' : '#dbbf62'), [i, 1, z], false);
}
// Simple H-shaped posts at each try line.
const postMat = mat('#ebe5cf', .48);
for (const z of [-50.6, 50.6]) {
  const upright1 = new THREE.Mesh(new THREE.CylinderGeometry(.11, .13, 9, 8), postMat);
  const upright2 = upright1.clone(); upright1.position.set(-3.2, 4.5, z); upright2.position.set(3.2, 4.5, z); scene.add(upright1, upright2);
  const cross = new THREE.Mesh(new THREE.CylinderGeometry(.1, .1, 6.5, 8), postMat); cross.rotation.z = Math.PI / 2; cross.position.set(0, 6.7, z); scene.add(cross);
}

const ball = new THREE.Group();
const ballSkin = new THREE.Mesh(new THREE.SphereGeometry(.32, 18, 12), mat('#bd7040', .42));
ballSkin.scale.set(.72, .72, 1.3); ball.add(ballSkin);
const ballSeam = new THREE.Mesh(new THREE.TorusGeometry(.205, .012, 5, 20), mat('#f3e7d2'));
ballSeam.rotation.y = Math.PI / 2; ball.add(ballSeam); scene.add(ball);

const homeTeam = [], awayTeam = [];
const game = {
  started: false, ended: false, mode: 'attack', home: 0, away: 0, seconds: 240,
  stamina: 100, power: 100, active: null, ballCarrier: null, holding: { sprint: false },
  actionCooldown: 0, phaseCooldown: 0, scoreCooldown: 0, bannerTimer: 0, toastTimer: 0,
  replay: false, replayTimer: 0, replayKind: '', replayWas: false, highlights: [], highlightIndex: -1, invulnerable: 0
};
const replayHistory = [];
let replaySampleTime = 0;
let replayFrames = [];
let replayCursor = 0;
let replayReturnFrame = null;
let muted = false;
let audioContext = null;

function playSound(kind = 'ui') {
  if (muted) return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  audioContext ??= new AudioContext();
  if (audioContext.state === 'suspended') audioContext.resume();
  const sounds = {
    ui: [520, 0.07], pass: [680, 0.12], tackle: [115, 0.2], try: [880, 0.3],
    foul: [240, 0.24], skill: [440, 0.1], kickoff: [600, 0.18]
  };
  const [frequency, duration] = sounds[kind] || sounds.ui;
  const now = audioContext.currentTime;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = kind === 'tackle' ? 'triangle' : 'sine';
  oscillator.frequency.setValueAtTime(frequency, now);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(55, frequency * 0.62), now + duration);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(kind === 'tackle' ? 0.15 : 0.07, now + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  oscillator.connect(gain); gain.connect(audioContext.destination);
  oscillator.start(now); oscillator.stop(now + duration);
}
const cameraTarget = new THREE.Vector3();
const desiredCamera = new THREE.Vector3();
const clock = new THREE.Clock();
let xrayLines = null;
const xrayMaterial = new THREE.LineBasicMaterial({ color: '#94f5ff', transparent: true, opacity: .9, depthTest: false });

function makePlayer(team, number) {
  const root = new THREE.Group(); root.userData = { team, number, pose: Math.random() * 6, fallen: false, stun: 0, spin: 0, hasBall: false, formation: number };
  const jerseyColor = team === 'home' ? '#1679ad' : '#d7a348';
  const skinTone = ['#c48762', '#e0b28f', '#895b45', '#d39b76'][number % 4];
  const jersey = mat(jerseyColor, .68); root.userData.jersey = jersey;
  const skin = mat(skinTone); const shorts = mat(team === 'home' ? '#123954' : '#32323a'); const socks = mat('#e9e9dc');
  const body = new THREE.Group(); body.position.y = .92; root.userData.body = body; root.add(body);
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(.29, .48, 5, 9), jersey); torso.castShadow = true; torso.scale.set(1.13, 1, .72); body.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.205, 14, 11), skin); head.position.y = .63; head.castShadow = true; body.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(.21, 12, 8, 0, Math.PI * 2, 0, Math.PI * .48), mat(number % 2 ? '#392c25' : '#49372c'));
  hair.position.y = .68; body.add(hair);
  const shortsMesh = new THREE.Mesh(new THREE.BoxGeometry(.43, .23, .3), shorts); shortsMesh.position.y = -.37; shortsMesh.castShadow = true; body.add(shortsMesh);
  const makeLimb = (width, length, material, x, y, z) => {
    const pivot = new THREE.Group(); pivot.position.set(x, y, z);
    const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(width, length, 4, 7), material); mesh.position.y = -length * .25; mesh.castShadow = true; pivot.add(mesh); body.add(pivot); return pivot;
  };
  for (const [side, sign] of [['L', -1], ['R', 1]]) {
    root.userData['arm' + side] = makeLimb(.09, .42, jersey, sign * .35, .39, 0);
    root.userData['leg' + side] = makeLimb(.115, .45, shorts, sign * .145, -.45, 0);
    root.userData['knee' + side] = new THREE.Group();
    const boot = new THREE.Mesh(new THREE.BoxGeometry(.15, .12, .29), mat('#eee9dc')); boot.position.set(sign * .145, -.99, -.065); boot.castShadow = true; body.add(boot);
  }
  root.userData.jersey = jersey; root.position.set(0, 0, 0); scene.add(root);
  (team === 'home' ? homeTeam : awayTeam).push(root); return root;
}
for (let i = 0; i < 6; i++) { makePlayer('home', i); makePlayer('away', i); }
const player = homeTeam[0];
const defenders = awayTeam;

function banner(title, subtitle, seconds = 2) {
  ui.bannerTitle.textContent = title; ui.bannerSubtitle.textContent = subtitle;
  ui.banner.classList.add('visible'); game.bannerTimer = seconds;
}
function toast(text, seconds = 1.5) {
  ui.toast.textContent = text; ui.toast.classList.add('show'); game.toastTimer = seconds;
  const sound = /TRY|SCORE/i.test(text) ? 'try' : /PENALTY|ILLEGAL/i.test(text) ? 'foul'
    : /TACKLE|HIT|CHARGE/i.test(text) ? 'tackle' : /PASS/i.test(text) ? 'pass' : 'ui';
  playSound(sound);
}
function updateHUD() {
  ui.home.textContent = String(game.home).padStart(2, '0'); ui.away.textContent = String(game.away).padStart(2, '0');
  const mins = Math.floor(game.seconds / 60), secs = Math.floor(game.seconds % 60);
  ui.clock.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  const meters = game.mode === 'attack' ? Math.max(0, Math.ceil(game.ballCarrier.position.z + 49)) : Math.max(0, Math.ceil(49 - game.ballCarrier.position.z));
  ui.distance.innerHTML = `${meters}<span>m</span>`;
  ui.possession.textContent = game.mode === 'attack' ? 'HARBOR IN POSSESSION' : 'IRONWOOD IN POSSESSION';
  ui.stamina.style.width = `${game.stamina}%`; ui.staminaN.textContent = Math.round(game.stamina);
  ui.power.style.width = `${game.power}%`; ui.powerN.textContent = Math.round(game.power);
}
function setCarrier(actor) {
  if (game.ballCarrier) game.ballCarrier.userData.hasBall = false;
  game.ballCarrier = actor; actor.userData.hasBall = true;
}
function ballLocal() {
  const carrier = game.ballCarrier;
  const offset = new THREE.Vector3(.37, 1.15, -.08).applyAxisAngle(new THREE.Vector3(0, 1, 0), carrier.rotation.y);
  return carrier.position.clone().add(offset);
}
function placeReset() {
  homeTeam.forEach((a, i) => { a.position.set((i - 2.5) * 2.4, 0, 18 + Math.floor(i / 3) * 2); a.rotation.set(0, 0, 0); a.userData.fallen = false; a.userData.stun = 0; });
  awayTeam.forEach((a, i) => { a.position.set((i - 2.5) * 2.5, 0, -4 - Math.floor(i / 3) * 3); a.rotation.set(0, Math.PI, 0); a.userData.fallen = false; a.userData.stun = 0; });
  if (game.mode === 'attack') { game.active = player; setCarrier(player); }
  else { game.active = null; setCarrier(awayTeam[2]); game.ballCarrier.position.set(0, 0, -18); }
  game.phaseCooldown = 2.2; game.actionCooldown = 0; game.stamina = Math.max(game.stamina, 74); game.power = Math.max(game.power, 72);
  ball.position.copy(ballLocal());
}

function captureReplayFrame() {
  return {
    players: [...homeTeam, ...awayTeam].map((actor) => [
      actor.position.x, actor.position.y, actor.position.z, actor.rotation.y,
      actor.userData.fallen ? 1 : 0, actor.userData.body.rotation.z
    ]),
    ball: [ball.position.x, ball.position.y, ball.position.z]
  };
}
function applyReplayFrame(frame) {
  [...homeTeam, ...awayTeam].forEach((actor, index) => {
    const [x, y, z, rotation, fallen, lean] = frame.players[index];
    actor.position.set(x, y, z); actor.rotation.y = rotation;
    actor.userData.fallen = Boolean(fallen); actor.userData.body.rotation.z = lean;
  });
  ball.position.set(...frame.ball);
}
function rememberReplayFrame(dt) {
  replaySampleTime += dt;
  if (replaySampleTime < .075) return;
  replaySampleTime = 0;
  replayHistory.push(captureReplayFrame());
  if (replayHistory.length > 40) replayHistory.shift();
}

function makeXray(actor) {
  removeXray(); const group = new THREE.Group(); scene.add(group);
  const segments = [[0,.1,0,0,.75,0],[0,.75,0,0,1.3,0],[0,1.12,0,-.3,1,0],[-.3,1,0,-.35,.67,0],[0,1.12,0,.3,1,0],[.3,1,0,.35,.67,0],[0,.1,0,-.16,-.3,0],[-.16,-.3,0,-.2,-.8,0],[0,.1,0,.16,-.3,0],[.16,-.3,0,.2,-.8,0]];
  const points = []; for (const s of segments) points.push(...s);
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  const line = new THREE.LineSegments(geometry, xrayMaterial); line.frustumCulled = false; group.add(line);
  xrayLines = { group, line, actor };
}
function removeXray() { if (xrayLines) { scene.remove(xrayLines.group); xrayLines.line.geometry.dispose(); xrayLines = null; } }
function refreshXray() {
  if (!xrayLines) return;
  xrayLines.group.position.copy(xrayLines.actor.position); xrayLines.group.rotation.y = xrayLines.actor.rotation.y;
  xrayLines.group.visible = game.replay && game.replayKind === 'ILLEGAL';
}

function startReplay(kind, record = true, recordedFrames = null, xrayActor = game.ballCarrier) {
  const frames = recordedFrames || [...replayHistory, captureReplayFrame()].slice(-36);
  if (record && game.ballCarrier) {
    game.highlights.push({ kind, frames });
    if (game.highlights.length > 8) game.highlights.shift();
    game.highlightIndex = -1;
  }
  replayReturnFrame = captureReplayFrame(); replayFrames = frames; replayCursor = 0;
  game.replay = true; game.replayTimer = Math.max(1.2, frames.length * .075 / .65); game.replayKind = kind;
  const titles = { 'TRY!': 'TRY!', HIT: 'WHAT A HIT.', ILLEGAL: 'X-RAY IMPACT', SPIN: 'LEFT THEM BEHIND.' };
  ui.replayTitle.textContent = titles[kind] || kind;
  ui.replaySub.textContent = kind === 'ILLEGAL' ? 'ILLEGAL TACKLE — X-RAY REPLAY' : 'THE CROWD FELT THAT ONE.';
  ui.replay.classList.add('active'); ui.replay.setAttribute('aria-hidden', 'false');
  if (kind === 'ILLEGAL') makeXray(xrayActor); else removeXray();
}
function stopReplay() {
  if (game.replay && replayReturnFrame) applyReplayFrame(replayReturnFrame);
  game.replay = false; game.replayTimer = 0; replayFrames = []; replayCursor = 0; replayReturnFrame = null;
  ui.replay.classList.remove('active'); ui.replay.setAttribute('aria-hidden', 'true');
  ui.replay.classList.remove('xray'); removeXray();
}

function changePossession(reason) {
  if (game.phaseCooldown > 0) return;
  game.mode = game.mode === 'attack' ? 'defend' : 'attack';
  game.stamina = Math.max(45, game.stamina - (reason === 'PENALTY' ? 8 : 13));
  game.power = Math.max(40, game.power - 10); game.phaseCooldown = 2.4;
  if (game.mode === 'attack') {
    game.active = player; setCarrier(player);
    homeTeam.forEach((a, i) => { if (a !== player) a.userData.fallen = false; });
    player.position.z = Math.min(20, game.ballCarrier.position.z + 3);
  } else {
    game.active = null; const runner = defenders[Math.floor(Math.random() * defenders.length)];
    setCarrier(runner); runner.position.x = THREE.MathUtils.clamp(player.position.x * .55, -12, 12);
    runner.position.z = Math.max(-35, Math.min(25, player.position.z - 5)); runner.rotation.y = Math.PI;
    defenders.forEach(a => { a.userData.fallen = false; });
  }
  toast(game.mode === 'attack' ? 'TURNOVER! YOUR BALL.' : reason === 'PENALTY' ? 'PENALTY TO IRONWOOD.' : 'TURNOVER! DEFEND.', 1.4);
  updateHUD();
}
function makeTry() {
  if (game.scoreCooldown > 0) return;
  game.scoreCooldown = 4; game.phaseCooldown = 4;
  const homeTry = game.mode === 'attack'; if (homeTry) game.home += 4; else game.away += 4;
  updateHUD(); toast(homeTry ? 'TRY! +4' : 'IRONWOOD TRY! +4', 2); startReplay('TRY!');
  const resetDelay = Math.max(2300, game.replayTimer * 1000 + 250);
  window.setTimeout(() => {
    if (game.ended) return;
    game.mode = homeTry ? 'defend' : 'attack'; placeReset();
    banner(homeTry ? 'THEY KICK OFF' : 'YOUR BALL', homeTry ? 'Read the runner. Make the hit.' : 'Find a gap. Make it count.', 2.2);
  }, resetDelay);
}

function animateActor(a, dt, speed = 0) {
  const u = a.userData; u.pose += dt * (3.4 + speed * 7.8);
  const swing = Math.sin(u.pose) * Math.min(.9, .18 + speed * .22);
  a.position.y += ((u.fallen ? -.13 : 0) - a.position.y) * Math.min(1, dt * 7);
  u.body.rotation.z += ((u.fallen ? -.78 : 0) - u.body.rotation.z) * Math.min(1, dt * 6);
  for (const side of ['L', 'R']) {
    const sign = side === 'L' ? 1 : -1;
    u['arm' + side].rotation.x = u.hasBall && side === 'R' ? -1.02 : swing * sign * .8;
    u['leg' + side].rotation.x = u.fallen ? 0 : swing * sign;
  }
  if (u.spin > 0) { u.spin -= dt; a.rotation.y += dt * 5.5; }
  if (u.stun > 0) u.stun = Math.max(0, u.stun - dt);
  if (u.jumpTimer > 0) { u.jumpTimer -= dt; a.position.y = Math.sin(Math.max(0, u.jumpTimer) / .62 * Math.PI) * .85; }
}

const keys = new Set();
const axis = { x: 0, y: 0 };
const joy = { pointer: null, centerX: 0, centerY: 0 };
function inputAxis() {
  const keyboardX = (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0);
  const keyboardY = (keys.has('s') || keys.has('arrowdown') ? 1 : 0) - (keys.has('w') || keys.has('arrowup') ? 1 : 0);
  const x = keyboardX || axis.x, y = keyboardY || axis.y;
  const length = Math.hypot(x, y); return length > 1 ? { x: x / length, y: y / length } : { x, y };
}
function performPass() {
  if (!game.started || game.ended || game.replay || game.mode !== 'attack' || game.actionCooldown > 0) return;
  const carrier = game.ballCarrier;
  const receiver = homeTeam.filter(a => a !== carrier && !a.userData.fallen)
    .sort((a, b) => a.position.distanceToSquared(carrier.position) - b.position.distanceToSquared(carrier.position))[0];
  if (!receiver) return;
  receiver.userData.fallen = false; receiver.userData.stun = 0;
  const side = Math.sign(receiver.position.x - carrier.position.x) || 1;
  receiver.position.x = THREE.MathUtils.clamp(carrier.position.x + side * 4.5, -17, 17);
  receiver.position.z = carrier.position.z - 4.2;
  receiver.rotation.y = 0; game.active = receiver; setCarrier(receiver); game.actionCooldown = .75;
  game.power = Math.max(0, game.power - 7); toast('PASS COMPLETE', .8);
}
function performSkill() {
  if (!game.started || game.ended || game.replay || game.actionCooldown > 0) return;
  const actor = game.mode === 'attack' ? game.active : player;
  if (game.power < 8) { toast('CATCH YOUR BREATH', .8); return; }
  const move = inputAxis();
  actor.userData.stun = 0;
  if (Math.abs(move.x) > Math.abs(move.y) && Math.abs(move.x) > .18) {
    actor.position.x = THREE.MathUtils.clamp(actor.position.x + Math.sign(move.x) * 3.2, -18, 18);
    actor.userData.spin = .28; game.invulnerable = .48;
    toast('DODGE!', .8);
  } else if (Math.abs(move.y) > .18) {
    const direction = game.mode === 'attack' ? -1 : 1;
    actor.position.z = THREE.MathUtils.clamp(actor.position.z + direction * 2.6, -48, 48);
    actor.userData.spin = .24; game.invulnerable = .45;
    toast('STEP!', .8);
  } else {
    actor.userData.spin = .72; game.invulnerable = .7;
    startReplay('SPIN');
  }
  game.power = Math.max(0, game.power - 12); game.actionCooldown = .65;
}
function performJump() {
  if (!game.started || game.ended || game.replay || game.actionCooldown > 0) return;
  const actor = game.mode === 'attack' ? game.active : player;
  if (game.power < 5) return;
  actor.userData.jumpTimer = .62; game.power = Math.max(0, game.power - 6); game.actionCooldown = .45;
}
function doTackle(charge = false) {
  if (game.mode !== 'defend' || game.replay || !game.ballCarrier || game.actionCooldown > 0 || game.phaseCooldown > 0) return;
  const target = game.ballCarrier, distance = player.position.distanceTo(target.position);
  const reach = charge ? 3.7 : 2.5;
  if (distance > reach) { toast('CLOSE THE GAP', .65); return; }
  const flying = charge && player.userData.jumpTimer > 0;
  const foul = Math.random() < (flying ? .16 : charge ? .08 : .045);
  target.userData.fallen = true; target.userData.stun = 1.1;
  game.stamina = Math.max(0, game.stamina - (charge ? 12 : 7));
  game.actionCooldown = .8;
  if (foul) toast('HIGH TACKLE! PENALTY.', 1.2);
  else toast(flying ? 'FLYING HIT!' : charge ? 'SHOULDER CHARGE!' : 'TACKLE!', 1);
  changePossession(foul ? 'PENALTY' : 'TACKLED');
  startReplay(foul ? 'ILLEGAL' : 'HIT', true, null, target);
}
function showHighlight() {
  if (!game.highlights.length) { toast('NO HIGHLIGHTS YET', 1); return; }
  game.highlightIndex = game.highlightIndex < 0
    ? game.highlights.length - 1
    : (game.highlightIndex - 1 + game.highlights.length) % game.highlights.length;
  const item = game.highlights[game.highlightIndex];
  startReplay(item.kind, false, item.frames);
  ui.replaySub.textContent = `HIGHLIGHT ${game.highlightIndex + 1}/${game.highlights.length} — PRESS H FOR PREVIOUS`;
}

addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) event.preventDefault();
  keys.add(key);
  if (event.repeat) return;
  if (key === ' ' || key === 'q') performSkill();
  if (key === 'j') performJump();
  if (key === 'e' || key === 'p') performPass();
  if (key === 'h') showHighlight();
  if (key === 'f') doTackle(true);
  if (key === 'x') doTackle(false);
});
addEventListener('keyup', (event) => keys.delete(event.key.toLowerCase()));
addEventListener('blur', () => { keys.clear(); game.holding.sprint = false; });

const joystick = el('joystick'), joyKnob = el('joy-knob');
if (joystick) {
  joystick.addEventListener('pointerdown', (event) => {
    event.preventDefault(); joy.pointer = event.pointerId; joystick.setPointerCapture(event.pointerId);
    const rect = joystick.querySelector('.joy-ring').getBoundingClientRect(); joy.centerX = rect.left + rect.width / 2; joy.centerY = rect.top + rect.height / 2;
    moveStick(event);
  });
  joystick.addEventListener('pointermove', (event) => { if (joy.pointer === event.pointerId) moveStick(event); });
  const releaseStick = (event) => { if (joy.pointer !== event.pointerId) return; joy.pointer = null; axis.x = 0; axis.y = 0; joyKnob.style.transform = 'translate(0,0)'; };
  joystick.addEventListener('pointerup', releaseStick); joystick.addEventListener('pointercancel', releaseStick);
}
function moveStick(event) {
  const dx = event.clientX - joy.centerX, dy = event.clientY - joy.centerY, radius = 31;
  const length = Math.hypot(dx, dy), scale = length > radius ? radius / length : 1;
  axis.x = dx * scale / radius; axis.y = dy * scale / radius;
  joyKnob.style.transform = `translate(${dx * scale}px,${dy * scale}px)`;
}
for (const button of document.querySelectorAll('.action-button')) {
  const action = button.dataset.action;
  button.addEventListener('pointerdown', (event) => {
    event.preventDefault(); button.setPointerCapture(event.pointerId);
    if (action === 'sprint') game.holding.sprint = true;
    if (action === 'tackle') doTackle(false);
    if (action === 'charge') doTackle(true);
    if (action === 'skill') performSkill();
    if (action === 'pass') performPass();
    if (action === 'jump') performJump();
    if (action === 'replay') showHighlight();
  });
  const release = () => { if (action === 'sprint') game.holding.sprint = false; };
  button.addEventListener('pointerup', release); button.addEventListener('pointercancel', release);
}

function startGame() {
  game.started = true; game.ended = false; game.seconds = 240; game.home = 0; game.away = 0;
  game.mode = 'attack'; game.highlights.length = 0; game.highlightIndex = -1;
  replayHistory.length = 0; replaySampleTime = 0; game.stamina = 100; game.power = 100;
  stopReplay(); ui.start.classList.add('hidden'); ui.result.classList.add('hidden');
  placeReset(); banner('TAKE IT TO THE LINE', 'Run hard, find space, and put it down.', 2.4); updateHUD();
}
function finishGame() {
  game.ended = true; game.started = false; game.holding.sprint = false;
  el('result-home').textContent = game.home; el('result-away').textContent = game.away;
  el('result-title').textContent = game.home === game.away ? 'ALL SQUARE.' : game.home > game.away ? 'HARBOR CITY WIN.' : 'IRONWOOD WIN.';
  el('result-copy').textContent = game.home === game.away ? 'A hard-fought draw under the lights.' : 'The crowd will remember this one.';
  ui.result.classList.remove('hidden'); stopReplay();
}
el('start-button').addEventListener('click', () => { startGame(); playSound('kickoff'); });
el('again-button').addEventListener('click', () => { startGame(); playSound('kickoff'); });
el('replay-skip').addEventListener('click', stopReplay);

el('sound-button').addEventListener('click', () => {
  muted = !muted; el('sound-icon').textContent = muted ? '×' : '♪';
  if (!muted) playSound('ui');
  toast(muted ? 'SOUND OFF' : 'SOUND ON', .8);
});

function moveActor(actor, dx, dz, dt, maxSpeed) {
  const length = Math.hypot(dx, dz);
  if (length > 1) { dx /= length; dz /= length; }
  actor.position.x = THREE.MathUtils.clamp(actor.position.x + dx * maxSpeed * dt, -19, 19);
  actor.position.z = THREE.MathUtils.clamp(actor.position.z + dz * maxSpeed * dt, -49, 49);
  if (Math.hypot(dx, dz) > .08) actor.rotation.y = Math.atan2(-dx, -dz);
}
function steerToward(actor, target, dt, speed, avoid = null) {
  let dx = target.x - actor.position.x, dz = target.z - actor.position.z;
  if (avoid) {
    const ax = actor.position.x - avoid.x, az = actor.position.z - avoid.z, d = Math.hypot(ax, az);
    if (d < 2.5 && d > .01) { dx += ax / d * 1.8; dz += az / d * 1.8; }
  }
  moveActor(actor, dx, dz, dt, speed);
}
function updateGame(dt) {
  if (!game.started || game.ended) return;
  game.seconds = Math.max(0, game.seconds - dt);
  if (game.seconds === 0) { finishGame(); return; }
  if (game.replay) {
    replayCursor += dt * .65 / .075;
    game.replayTimer = Math.max(0, game.replayTimer - dt);
    if (replayCursor >= replayFrames.length && game.replayTimer <= 0) stopReplay();
    else {
      applyReplayFrame(replayFrames[Math.min(replayFrames.length - 1, Math.floor(replayCursor))]);
      refreshXray(); updateHUD(); return;
    }
  }
  game.phaseCooldown = Math.max(0, game.phaseCooldown - dt);
  game.actionCooldown = Math.max(0, game.actionCooldown - dt);
  game.scoreCooldown = Math.max(0, game.scoreCooldown - dt);
  game.invulnerable = Math.max(0, game.invulnerable - dt);
  const actor = game.mode === 'attack' ? game.active : player;
  const move = inputAxis();
  const sprint = (game.holding.sprint || keys.has('shift')) && game.stamina > 1;
  const speed = sprint ? 10.1 : 6.1;
  if (!game.replay && actor && !actor.userData.fallen && actor.userData.stun <= 0) {
    let dx = move.x, dz = move.y;
    if (Math.abs(dx) + Math.abs(dz) < .04) dz = game.mode === 'attack' ? -1 : .35;
    else if (game.mode === 'defend' && Math.abs(move.y) < .08) dz = .2;
    moveActor(actor, dx, dz, dt, speed);
    if (sprint && (Math.abs(move.x) + Math.abs(move.y) > .05)) game.stamina = Math.max(0, game.stamina - dt * 13);
    else game.stamina = Math.min(100, game.stamina + dt * 3.2);
    game.power = Math.min(100, game.power + dt * (sprint ? .7 : 2.5));
  } else {
    game.stamina = Math.min(100, game.stamina + dt * 4.2); game.power = Math.min(100, game.power + dt * 2.5);
  }

  const carrier = game.ballCarrier;
  if (game.mode === 'attack') {
    for (const teammate of homeTeam) {
      if (teammate === carrier || teammate.userData.fallen) continue;
      const lane = teammate.userData.number % 2 ? 1 : -1;
      const target = { x: THREE.MathUtils.clamp(carrier.position.x + lane * (2.5 + teammate.userData.number % 3), -16, 16), z: carrier.position.z + 3 + teammate.userData.number % 2 };
      steerToward(teammate, target, dt, 3.2, carrier.position);
    }
    for (const defender of defenders) {
      if (defender.userData.fallen || defender.userData.stun > 0) continue;
      steerToward(defender, carrier.position, dt, 3.15 + (defender.userData.number % 3) * .17, carrier.position);
    }
    const tackler = defenders.find((defender) => !defender.userData.fallen && defender.position.distanceTo(carrier.position) < 2.15);
    if (tackler && game.phaseCooldown <= 0 && game.actionCooldown <= 0 && game.invulnerable <= 0) {
      carrier.userData.fallen = true; carrier.userData.stun = 1.1;
      game.actionCooldown = .8; game.stamina = Math.max(0, game.stamina - 7);
      toast('TACKLED! TURNOVER.', 1); changePossession('TACKLED'); startReplay('HIT', true, null, carrier);
    }
    if (carrier.position.z <= -47.5) makeTry();
  } else {
    // The opposing runner advances toward the Harbor try line while the user closes in.
    if (!carrier.userData.fallen && carrier.userData.stun <= 0) {
      const sidestep = Math.sin(game.seconds * 1.7 + carrier.userData.number) * .45;
      moveActor(carrier, sidestep, 1, dt, 4.15);
    }
    defenders.forEach((teammate, i) => {
      if (teammate === carrier || teammate.userData.fallen) return;
      steerToward(teammate, { x: carrier.position.x + (i % 2 ? 3 : -3), z: carrier.position.z + 3 }, dt, 2.6);
    });
    const distance = player.position.distanceTo(carrier.position);
    if (distance < 1.65 && game.phaseCooldown <= 0 && game.actionCooldown <= 0 && game.invulnerable <= 0) doTackle(false);
    if (carrier.position.z >= 47.5) makeTry();
  }
  game.power = Math.min(100, game.power + dt * .7);
  const ballPosition = ballLocal(); ball.position.lerp(ballPosition, Math.min(1, dt * 14));
  ball.rotation.x += dt * (sprint ? 8 : 3); ball.rotation.z = Math.sin(game.seconds * 7) * .12;
  for (const a of homeTeam) animateActor(a, dt, a === actor ? (sprint ? 1 : .55) : .24);
  for (const a of awayTeam) animateActor(a, dt, a === carrier ? .7 : .22);
  if (!game.replay) rememberReplayFrame(dt);
  if (game.bannerTimer > 0) { game.bannerTimer -= dt; if (game.bannerTimer <= 0) ui.banner.classList.remove('visible'); }
  if (game.toastTimer > 0) { game.toastTimer -= dt; if (game.toastTimer <= 0) ui.toast.classList.remove('show'); }
  refreshXray(); updateHUD();
}

function updateCamera(dt) {
  const focus = game.started ? (game.mode === 'attack' ? game.active : player) : player;
  if (!focus) return;
  const forwardZ = game.mode === 'attack' ? -1 : 1;
  desiredCamera.set(focus.position.x + 2.5, 4.25 + focus.position.y * .4, focus.position.z - forwardZ * 7.7);
  camera.position.lerp(desiredCamera, Math.min(1, dt * 3.7));
  cameraTarget.set(focus.position.x, focus.position.y + 1.25, focus.position.z + forwardZ * 4.5);
  camera.lookAt(cameraTarget);
}
function renderFrame() {
  requestAnimationFrame(renderFrame);
  const dt = Math.min(clock.getDelta(), .05);
  updateGame(dt); updateCamera(dt); renderer.render(scene, camera);
}
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 700 ? 1.35 : 1.65)); renderer.setSize(innerWidth, innerHeight);
});

placeReset();
for (const a of homeTeam) animateActor(a, 0, 0);
for (const a of awayTeam) animateActor(a, 0, 0);
updateHUD();
renderFrame();
