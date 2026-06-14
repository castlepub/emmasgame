/* ==========================================================================
   The Magical Melody Adventure
   A birthday music quest — HTML Canvas game
   ========================================================================== */

/* ==========================================================================
   1. CANVAS SETUP
   ========================================================================== */

const CANVAS_WIDTH = 1280;
const CANVAS_HEIGHT = 720;

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

const touchControls = document.getElementById('touch-controls');
const riddleInputEl = document.getElementById('riddle-input');

const PLAYER_WIDTH = 120;
const PLAYER_HEIGHT = 180;
const PLAYER_FOOT_PADDING = 36; /* empty space below feet in sprite art */
const NOTE_SIZE = 54;
const ENEMY_WIDTH = 92;
const ENEMY_HEIGHT = 70;
const BOSS_WIDTH = 128;
const BOSS_HEIGHT = 96;
const PROJECTILE_SIZE = 48;

/* Physics & player constants */
const PLAYER_SPEED = 6;
const GRAVITY = 0.55;
const JUMP_STRENGTH = -13.5;
const MAX_FALL_SPEED = 14;
const INVINCIBLE_TIME = 1800; /* ms */
const WALK_ANIM_SPEED = 120; /* ms per frame */

/* Game state */
let gameState = 'start'; /* start | playing | riddle | levelComplete | gameOver | finale */
let currentLevel = 0;
let score = 0;
let hearts = 3;
let muted = false;
let bgm = null;
let bgmReady = false;
let bgmStarted = false;
let cameraX = 0;
let lastTime = 0;
let deltaTime = 0;

/* Decorative background notes */
const bgNotes = [];
for (let i = 0; i < 18; i++) {
  bgNotes.push({
    x: Math.random() * CANVAS_WIDTH,
    y: Math.random() * CANVAS_HEIGHT,
    size: 8 + Math.random() * 14,
    speed: 0.2 + Math.random() * 0.5,
    phase: Math.random() * Math.PI * 2,
    opacity: 0.15 + Math.random() * 0.25
  });
}

/* Particles & confetti */
const particles = [];
const confetti = [];

/* Level data reference */
let level = null;
let player = null;
let notes = [];
let goldenNotes = [];
let enemies = [];
let boss = null;
let projectiles = [];
let platforms = [];
let magicRecorder = null;

/* Riddle state */
let riddleInput = '';
let riddleHint = '';
let riddleShake = 0;
let jumpHeld = false;
let melodyStep = 0;

/* UI button hit areas (canvas coords) */
let uiButtons = [];

/* Asset store */
const images = {};

/*
 * Asset paths — each key tries multiple locations/filenames (first match wins).
 * Files live in birthday-music-game/assets/ OR the shared ../assets/ folder.
 */
const ASSET_PATHS = {
  girl_idle: [
    'assets/characters/girl_idle.png',
    '../assets/characters/girl_idle.png'
  ],
  girl_walk_1: [
    'assets/characters/girl_walk_1.png',
    '../assets/characters/girl_walk_1.png'
  ],
  girl_walk_2: [
    'assets/characters/girl_walk_2.png',
    '../assets/characters/girl_walk_2.png'
  ],
  girl_jump: [
    'assets/characters/girl_jump.png',
    'assets/characters/Girl_jump.png',
    '../assets/characters/girl_jump.png',
    '../assets/characters/Girl_jump.png'
  ],
  girl_happy: [
    'assets/characters/girl_happy.png',
    '../assets/characters/girl_happy.png'
  ],
  girl_play_recorder: [
    'assets/characters/girl_play_recorder.png',
    'assets/characters/girl_play_flute.png',
    '../assets/characters/girl_play_recorder.png',
    '../assets/characters/girl_play_flute.png'
  ],
  girl_surprised: [
    'assets/characters/girl_surprised.png',
    '../assets/characters/girl_surprised.png'
  ],
  music_note: [
    'assets/items/music_note.png',
    '../assets/items/music_note.png'
  ],
  golden_note: [
    'assets/items/golden_note.png',
    '../assets/items/golden_note.png'
  ],
  magic_flute: [
    'assets/items/magic_flute.png',
    '../assets/items/magic_flute.png'
  ],
  silence_cloud: [
    'assets/enemies/silence_cloud.png',
    'assets/enemy/silence_cloud.png',
    '../assets/enemies/silence_cloud.png',
    '../assets/enemy/silence_cloud.png'
  ],
  silence_cloud_boss: [
    'assets/enemy/silence_cloud_boss.png',
    'assets/enemies/silence_cloud_boss.png',
    '../assets/enemy/silence_cloud_boss.png',
    '../assets/enemies/silence_cloud_boss.png'
  ],
  lightning: [
    'assets/music/lighting.png',
    'assets/items/lighting.png',
    '../assets/music/lighting.png',
    '../assets/items/lighting.png'
  ],
  heart: [
    'assets/ui/heart.png',
    '../assets/ui/heart.png'
  ],
  forest_background: [
    'assets/backgrounds/forest_background.png',
    'assets/backgrounds/magical_woodland_glade_with_musical_notes.png',
    '../assets/backgrounds/forest_background.png',
    '../assets/backgrounds/magical_woodland_glade_with_musical_notes.png'
  ],
  cloud_background: [
    'assets/backgrounds/cloud_background.png',
    'assets/backgrounds/magical_cloud_world_with_floating_islands.png',
    '../assets/backgrounds/cloud_background.png',
    '../assets/backgrounds/magical_cloud_world_with_floating_islands.png'
  ],
  finale_background: [
    'assets/backgrounds/finale_background.png',
    'assets/backgrounds/magical_garden_celebration_with_balloons.png',
    '../assets/backgrounds/finale_background.png',
    '../assets/backgrounds/magical_garden_celebration_with_balloons.png'
  ]
};

const SPRITE_IMAGE_KEYS = new Set([
  'girl_idle', 'girl_walk_1', 'girl_walk_2', 'girl_jump',
  'girl_happy', 'girl_play_recorder', 'girl_surprised',
  'music_note', 'golden_note', 'magic_flute', 'silence_cloud', 'silence_cloud_boss',
  'lightning', 'heart'
]);

/* Hebrew UI strings */
const HEBREW_FONT = '"Segoe UI", Arial, "David", "Rubik", sans-serif';

const TEXT = {
  gameTitle: 'הרפתקאת המנגינה הקסומה',
  gameTitleName: 'של אמה',
  subtitle: 'משימת יום הולדת מוזיקלית שנוצרה במיוחד בשבילך',
  instructions1: 'אספי את תווי המוזיקה, הימנעי מענני השתיקה,',
  instructions2: 'והשתמשי בחליל הקסום שלך כדי להחזיר את המוזיקה לעולם.',
  startButton: 'התחלת המסע',
  score: 'ניקוד',
  notes: 'תווים',
  riddleTitle: '✨ חידה מוזיקלית ✨',
  riddlePrompt: 'הקלידי תשובה ולחצי Enter',
  riddleTapHint: '(הקישי על תיבת התשובה כדי להקליד)',
  submit: 'שליחה',
  playRecorderHint: 'לחצי E / ♪ לנגינה!',
  cloudShhh: 'ששש',
  gameOverTitle: 'אוי לא… השתיקה חזקה מדי!',
  gameOverLine1: 'אל דאגה — כל מוזיקאית גדולה',
  gameOverLine2: 'מתאמנת ומנסה שוב!',
  tryAgain: 'נסי שוב',
  finaleTitle: 'יום הולדת שמח לגיל 8!',
  finaleLines: [
    'מצאת את התווים האבודים,',
    'החזרת את המוזיקה לעולם,',
    'והוכחת שכל מנגינה צריכה קצת אומץ,',
    'קצת קסם,',
    'וחיוך גדול.',
    '',
    'תמשיכי לנגן, לחלום,',
    'ולמלא את העולם במוזיקה שלך.'
  ],
  playAgain: 'שחקי שוב'
};

function applyHebrewTextStyle(size, bold, align) {
  ctx.direction = 'rtl';
  ctx.textAlign = align || 'center';
  ctx.font = (bold ? 'bold ' : '') + size + 'px ' + HEBREW_FONT;
}

function resetTextStyle() {
  ctx.direction = 'ltr';
  ctx.textAlign = 'left';
}

const LEVELS = [
  {
    name: 'יער התווים האבודים',
    bgKey: 'forest_background',
    bgGradient: ['#2d5a27', '#5a9a4a', '#8fd48f'],
    worldWidth: 6500,
    notesRequired: 16,
    goldenCount: 0,
    enemyCount: 10,
    enemySpeed: 1.5,
    riddle: {
      question: 'איזה תו בא אחרי דו?',
      answers: ['re', 'Re', 'RE', 'רה'],
      hint: 'חשבי על הצעד הבא בדו-רֵ-מִי… זה מתחרז עם "ראי"!'
    }
  },
  {
    name: 'ענני השתיקה',
    bgKey: 'cloud_background',
    bgGradient: ['#5eb8ff', '#a8d8ff', '#ffe8a0'],
    worldWidth: 7200,
    notesRequired: 18,
    goldenCount: 4,
    enemyCount: 12,
    enemySpeed: 1.65,
    riddle: {
      question: 'באיזה כלי נגינה את כבר מנגנת?',
      answers: ['recorder', 'Recorder', 'RECORDER', 'flute', 'Flute', 'חלילית', 'חליל'],
      hint: 'זה כלי נגינה קטן שמנשפים אליו — יש לך אחד כזה במשחק!'
    }
  },
  {
    name: 'מנגינת יום ההולדת',
    bgKey: 'finale_background',
    bgGradient: ['#4a1a6b', '#9b59b6', '#ffd700'],
    worldWidth: 7800,
    notesRequired: 20,
    goldenCount: 3,
    enemyCount: 11,
    enemySpeed: 1.4,
    riddle: null,
    hasMagicRecorder: true
  }
];

/* ==========================================================================
   2. ASSET LOADING
   ========================================================================== */

/* Detect pixels that are background, not part of the sprite art */
function isBackgroundPixel(r, g, b, a) {
  if (a < 12) return true;
  /* Solid black (AI character exports) */
  if (r < 42 && g < 42 && b < 42) return true;
  /* White checkerboard squares */
  if (r > 232 && g > 232 && b > 232) return true;
  /* Gray checkerboard squares — neutral light grays only */
  if (Math.abs(r - g) < 12 && Math.abs(g - b) < 12 && r > 155 && r < 228) return true;
  return false;
}

/*
 * Remove baked-in backgrounds by flood-filling from image edges.
 * Works for black backgrounds and fake checkerboard "transparency".
 * Keeps interior whites (e.g. dress) that are not connected to the border.
 */
function processSpriteImage(img) {
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  const cctx = c.getContext('2d');
  cctx.drawImage(img, 0, 0);

  let data;
  try {
    data = cctx.getImageData(0, 0, c.width, c.height);
  } catch (err) {
    return img;
  }

  const px = data.data;
  const w = c.width;
  const h = c.height;
  const visited = new Uint8Array(w * h);
  const queue = [];

  function pixelIndex(x, y) {
    return (y * w + x) * 4;
  }

  function tryQueue(x, y) {
    if (x < 0 || x >= w || y < 0 || y >= h) return;
    const cell = y * w + x;
    if (visited[cell]) return;
    const i = pixelIndex(x, y);
    if (!isBackgroundPixel(px[i], px[i + 1], px[i + 2], px[i + 3])) return;
    visited[cell] = 1;
    queue.push([x, y]);
  }

  for (let x = 0; x < w; x++) {
    tryQueue(x, 0);
    tryQueue(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    tryQueue(0, y);
    tryQueue(w - 1, y);
  }

  while (queue.length) {
    const [x, y] = queue.pop();
    px[pixelIndex(x, y) + 3] = 0;
    tryQueue(x + 1, y);
    tryQueue(x - 1, y);
    tryQueue(x, y + 1);
    tryQueue(x, y - 1);
  }

  cctx.putImageData(data, 0, 0);
  return c;
}

function tryLoadImage(path) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = path;
  });
}

async function loadAsset(key, paths) {
  const pathList = Array.isArray(paths) ? paths : [paths];
  for (const path of pathList) {
    const img = await tryLoadImage(path);
    if (!img) continue;
    try {
      images[key] = SPRITE_IMAGE_KEYS.has(key)
        ? processSpriteImage(img)
        : img;
    } catch (err) {
      images[key] = img;
    }
    return true;
  }
  images[key] = null;
  return false;
}

async function loadAllAssets() {
  await Promise.all(
    Object.entries(ASSET_PATHS).map(([key, paths]) => loadAsset(key, paths))
  );
}

function isDrawable(image) {
  if (!image) return false;
  const w = image.naturalWidth || image.width || 0;
  const h = image.naturalHeight || image.height || 0;
  return w > 0 && h > 0;
}

function getImage(key) {
  const img = images[key];
  return isDrawable(img) ? img : null;
}

function imageLoaded(key) {
  return isDrawable(images[key]);
}

/* ==========================================================================
   3. INPUT HANDLING
   ========================================================================== */

const keys = {};
const touchInput = { left: false, right: false, jump: false, play: false };

document.addEventListener('keydown', (e) => {
  if (gameState === 'playing') {
    keys[e.code] = true;
  }
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
    if (gameState === 'playing') e.preventDefault();
  }
  if (gameState === 'riddle' && e.code === 'Enter') {
    e.preventDefault();
    submitRiddle();
  }
});

if (riddleInputEl) {
  riddleInputEl.addEventListener('input', () => {
    if (gameState === 'riddle') {
      riddleInput = riddleInputEl.value;
    }
  });
  riddleInputEl.addEventListener('keydown', (e) => {
    if (gameState !== 'riddle') return;
    e.stopPropagation();
    if (e.code === 'Enter') {
      e.preventDefault();
      submitRiddle();
    }
  });
}

const riddleSubmitBtn = document.getElementById('riddle-submit-btn');
if (riddleSubmitBtn) {
  riddleSubmitBtn.addEventListener('click', (e) => {
    e.preventDefault();
    submitRiddle();
  });
}

document.addEventListener('keyup', (e) => {
  keys[e.code] = false;
});

function clearAllInput() {
  Object.keys(keys).forEach((code) => { keys[code] = false; });
  touchInput.left = false;
  touchInput.right = false;
  touchInput.jump = false;
  touchInput.play = false;
  jumpHeld = false;
  ['btn-left', 'btn-right', 'btn-jump', 'btn-play'].forEach((id) => {
    document.getElementById(id)?.classList.remove('active');
  });
}

function isMobile() {
  return window.innerWidth < 900 || 'ontouchstart' in window;
}

function setupTouchControls() {
  const bind = (id, key) => {
    const el = document.getElementById(id);
    if (!el) return;
    const down = (e) => {
      e.preventDefault();
      touchInput[key] = true;
      el.classList.add('active');
    };
    const up = (e) => {
      e.preventDefault();
      touchInput[key] = false;
      el.classList.remove('active');
    };
    el.addEventListener('touchstart', down, { passive: false });
    el.addEventListener('touchend', up, { passive: false });
    el.addEventListener('touchcancel', up, { passive: false });
    el.addEventListener('mousedown', down);
    el.addEventListener('mouseup', up);
    el.addEventListener('mouseleave', up);
  };
  bind('btn-left', 'left');
  bind('btn-right', 'right');
  bind('btn-jump', 'jump');
  bind('btn-play', 'play');
}

function inputLeft() {
  return keys['ArrowLeft'] || keys['KeyA'] || touchInput.left;
}

function inputRight() {
  return keys['ArrowRight'] || keys['KeyD'] || touchInput.right;
}

function inputJump() {
  return keys['Space'] || keys['ArrowUp'] || keys['KeyW'] || touchInput.jump;
}

function inputPlay() {
  return keys['KeyE'] || touchInput.play;
}

function getCanvasMousePos(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = CANVAS_WIDTH / rect.width;
  const scaleY = CANVAS_HEIGHT / rect.height;
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY
  };
}

canvas.addEventListener('click', (e) => {
  const pos = getCanvasMousePos(e);
  handleCanvasClick(pos.x, pos.y);
});

canvas.addEventListener('touchstart', (e) => {
  if (e.target !== canvas) return;
  e.preventDefault();
  const touch = e.touches[0];
  const rect = canvas.getBoundingClientRect();
  const scaleX = CANVAS_WIDTH / rect.width;
  const scaleY = CANVAS_HEIGHT / rect.height;
  const x = (touch.clientX - rect.left) * scaleX;
  const y = (touch.clientY - rect.top) * scaleY;
  handleCanvasClick(x, y);
}, { passive: false });

function handleCanvasClick(x, y) {
  if (gameState === 'start') {
    tryStartBackgroundMusic();
  }
  for (const btn of uiButtons) {
    if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
      btn.action();
      return;
    }
  }
}

/* ==========================================================================
   4. GAME OBJECTS
   ========================================================================== */

function createPlayer(x, y) {
  return {
    x,
    y,
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
    vx: 0,
    vy: 0,
    onGround: false,
    facing: 1,
    walkFrame: 0,
    walkTimer: 0,
    playingRecorder: false,
    playTimer: 0,
    invincibleUntil: 0,
    surprisedUntil: 0,
    collectedThisLevel: 0
  };
}

function createNote(x, y, golden = false) {
  return {
    x,
    y,
    width: NOTE_SIZE,
    height: NOTE_SIZE,
    golden,
    collected: false,
    bobPhase: Math.random() * Math.PI * 2,
    value: golden ? 3 : 1
  };
}

function createEnemy(x, y, range, speed) {
  return {
    x,
    y,
    startX: x,
    range,
    speed,
    direction: 1,
    width: ENEMY_WIDTH,
    height: ENEMY_HEIGHT
  };
}

function createBoss(x, y) {
  return {
    x,
    y,
    startX: x,
    range: 95,
    speed: 1.15 + currentLevel * 0.12,
    direction: 1,
    width: BOSS_WIDTH,
    height: BOSS_HEIGHT,
    shootTimer: 900,
    shootCooldown: Math.max(1400, 2400 - currentLevel * 280)
  };
}

function createProjectile(x, y, vx, vy) {
  return {
    x,
    y,
    vx,
    vy,
    width: PROJECTILE_SIZE,
    height: PROJECTILE_SIZE,
    rotation: Math.atan2(vy, vx)
  };
}

function createPlatform(x, y, w, h) {
  return { x, y, width: w, height: h };
}

function createMagicRecorder(x, y) {
  return { x, y, width: 64, height: 64, glowPhase: 0 };
}

function getPlayerFeetY(p) {
  return p.y + p.height - PLAYER_FOOT_PADDING;
}

function resolvePlatformCollision(p) {
  p.onGround = false;
  const prevFeet = getPlayerFeetY(p) - p.vy;

  for (const plat of platforms) {
    const overlapX = p.x + p.width > plat.x + 4 && p.x < plat.x + plat.width - 4;
    if (!overlapX || p.vy < 0) continue;

    const feet = getPlayerFeetY(p);
    const platTop = plat.y;

    if (feet >= platTop && prevFeet <= platTop + plat.height + 8) {
      p.y = platTop - p.height + PLAYER_FOOT_PADDING;
      p.vy = 0;
      p.onGround = true;
    }
  }
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x &&
         a.y < b.y + b.height && a.y + a.height > b.y;
}

/* Tighter hitboxes — only count real body / cloud contact, not full sprite boxes */
function getPlayerBodyHitbox(p) {
  return {
    x: p.x + p.width * 0.22,
    y: p.y + p.height * 0.12,
    width: p.width * 0.56,
    height: p.height - PLAYER_FOOT_PADDING - p.height * 0.14
  };
}

function getEnemyHitbox(enemy) {
  return {
    x: enemy.x + enemy.width * 0.24,
    y: enemy.y + enemy.height * 0.22,
    width: enemy.width * 0.52,
    height: enemy.height * 0.52
  };
}

function getBossHitbox(b) {
  return {
    x: b.x + b.width * 0.2,
    y: b.y + b.height * 0.18,
    width: b.width * 0.6,
    height: b.height * 0.55
  };
}

function getProjectileHitbox(proj) {
  return {
    x: proj.x + proj.width * 0.22,
    y: proj.y + proj.height * 0.22,
    width: proj.width * 0.56,
    height: proj.height * 0.56
  };
}

function spawnSparkles(x, y, color = '#ffe066') {
  for (let i = 0; i < 10; i++) {
    const angle = (Math.PI * 2 * i) / 10 + Math.random() * 0.5;
    const speed = 2 + Math.random() * 4;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      life: 400 + Math.random() * 300,
      maxLife: 700,
      color,
      size: 3 + Math.random() * 4,
      type: 'sparkle'
    });
  }
}

function spawnConfetti(count = 80) {
  const colors = ['#ff6b9d', '#ffd700', '#6bffb8', '#7eb8ff', '#ff9ff3', '#fff'];
  for (let i = 0; i < count; i++) {
    confetti.push({
      x: Math.random() * CANVAS_WIDTH,
      y: -20 - Math.random() * 200,
      vx: (Math.random() - 0.5) * 4,
      vy: 2 + Math.random() * 4,
      w: 6 + Math.random() * 8,
      h: 8 + Math.random() * 10,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.15,
      color: colors[Math.floor(Math.random() * colors.length)],
      life: 8000
    });
  }
}

/* ==========================================================================
   5. LEVEL SETUP
   ========================================================================== */

function buildLevel(levelIndex) {
  const cfg = LEVELS[levelIndex];
  level = cfg;
  currentLevel = levelIndex;

  const groundY = CANVAS_HEIGHT - 80;
  platforms = [];
  notes = [];
  goldenNotes = [];
  enemies = [];
  boss = null;
  projectiles = [];
  magicRecorder = null;

  /* Ground segments with gaps — falling through a gap is dangerous */
  buildGroundWithGaps(groundY, cfg.worldWidth, 6 + levelIndex * 2);

  /* Level-specific platforms & note placement */
  if (levelIndex === 0) {
    addForestLevel(groundY);
  } else if (levelIndex === 1) {
    addCloudLevel(groundY);
  } else {
    addFinaleLevel(groundY);
  }

  /* Spawn enemies across the longer level */
  const enemyPositions = generateEnemyPositions(cfg);
  for (const pos of enemyPositions) {
    enemies.push(createEnemy(pos.x, pos.y, pos.range, pos.speed));
  }

  const bossY = groundY - BOSS_HEIGHT - 170 - levelIndex * 24;
  boss = createBoss(cfg.worldWidth - 480, bossY);

  if (cfg.hasMagicRecorder) {
    magicRecorder = createMagicRecorder(cfg.worldWidth - 220, groundY - 90);
  }

  player = createPlayer(80, groundY - PLAYER_HEIGHT + PLAYER_FOOT_PADDING);
  player.vx = 0;
  player.vy = 0;
  cameraX = 0;
  riddleInput = '';
  riddleHint = '';
  clearAllInput();
}

function generateEnemyPositions(cfg) {
  const groundY = CANVAS_HEIGHT - 80;
  const positions = [];
  const step = cfg.worldWidth / (cfg.enemyCount + 1);

  for (let i = 0; i < cfg.enemyCount; i++) {
    /* Mix: some on ground, many floating above at different heights */
    const layer = i % 5;
    let y;
    if (layer === 0) {
      y = groundY - ENEMY_HEIGHT - 4;
    } else if (layer === 1) {
      y = groundY - 130;
    } else if (layer === 2) {
      y = groundY - 210;
    } else if (layer === 3) {
      y = groundY - 290;
    } else {
      y = groundY - 370;
    }

    positions.push({
      x: step * (i + 1) - ENEMY_WIDTH * 0.5,
      y,
      range: 75 + (i % 6) * 28,
      speed: cfg.enemySpeed * (0.9 + (i % 5) * 0.05)
    });
  }
  return positions;
}

function buildGroundWithGaps(groundY, worldWidth, gapCount) {
  const gapWidth = 110 + (gapCount % 3) * 15;
  const segments = gapCount + 1;
  const totalGap = gapCount * gapWidth;
  const segmentWidth = (worldWidth - totalGap) / segments;
  let x = 0;
  for (let i = 0; i < segments; i++) {
    platforms.push(createPlatform(x, groundY, segmentWidth, 80));
    x += segmentWidth + gapWidth;
  }
}

function buildJumpChallengeLevel(groundY, worldWidth, noteCount, goldenCount) {
  let notesPlaced = 0;
  let goldenLeft = goldenCount;
  const startX = 120;
  const endX = worldWidth - 320;
  const chainSpacing = (endX - startX) / Math.max(1, noteCount - 1);
  const stepX = Math.min(102, chainSpacing * 0.42);
  const stepY = 68;

  for (let c = 0; c < noteCount; c++) {
    const steps = 3 + (c % 2);
    let px = startX + c * chainSpacing;
    let py = groundY - 58;

    for (let s = 0; s < steps; s++) {
      if (px > worldWidth - 180) break;

      const platW = 96 + (s % 2) * 14;
      platforms.push(createPlatform(px, py, platW, 22));

      if (s === steps - 1) {
        const isGolden = goldenLeft > 0 && c % 4 === 2;
        if (isGolden) goldenLeft--;
        const note = createNote(
          px + platW / 2 - NOTE_SIZE / 2,
          py - NOTE_SIZE - 10,
          isGolden
        );
        notes.push(note);
        if (isGolden) goldenNotes.push(note);
        notesPlaced++;
      }

      if (s < steps - 1) {
        px += stepX + (s % 2) * 12;
        py -= stepY + (s % 2) * 8;
      }
    }
  }

  /* Safety net — always spawn exactly noteCount reachable notes */
  while (notesPlaced < noteCount) {
    const x = startX + notesPlaced * ((endX - startX) / Math.max(1, noteCount - 1));
    const py = groundY - 105 - (notesPlaced % 4) * 48;
    platforms.push(createPlatform(x, py + NOTE_SIZE + 14, 100, 22));
    const isGolden = goldenLeft > 0;
    if (isGolden) goldenLeft--;
    const note = createNote(x + 23, py, isGolden);
    notes.push(note);
    if (isGolden) goldenNotes.push(note);
    notesPlaced++;
  }
}

function addForestLevel(groundY) {
  buildJumpChallengeLevel(groundY, level.worldWidth, level.notesRequired, 0);
}

function addCloudLevel(groundY) {
  buildJumpChallengeLevel(groundY, level.worldWidth, level.notesRequired, level.goldenCount);
}

function addFinaleLevel(groundY) {
  buildJumpChallengeLevel(groundY, level.worldWidth, level.notesRequired, level.goldenCount);
}

/* ==========================================================================
   6. UPDATE LOOP
   ========================================================================== */

function updatePlaying(dt) {
  if (!player || !level) return;

  const now = performance.now();
  const p = player;

  /* Recorder play action */
  if (inputPlay() && p.onGround) {
    if (level.hasMagicRecorder && p.collectedThisLevel >= level.notesRequired && magicRecorder) {
      const dist = Math.abs(p.x + p.width / 2 - (magicRecorder.x + magicRecorder.width / 2));
      if (dist < 100) {
        p.playingRecorder = true;
        p.playTimer = 2500;
        playFinalArpeggio();
        setTimeout(() => {
          gameState = 'finale';
          spawnConfetti(100);
        }, 2200);
      }
    } else if (!level.hasMagicRecorder) {
      p.playingRecorder = true;
      p.playTimer = 600;
    }
  }

  if (p.playTimer > 0) {
    p.playTimer -= dt;
    if (p.playTimer <= 0) p.playingRecorder = false;
  }

  /* Horizontal movement */
  if (!p.playingRecorder) {
    if (inputLeft()) {
      p.vx = -PLAYER_SPEED;
      p.facing = -1;
    } else if (inputRight()) {
      p.vx = PLAYER_SPEED;
      p.facing = 1;
    } else {
      p.vx = 0;
    }

    /* Jump (one press per landing) */
    const jumpNow = inputJump();
    if (jumpNow && !jumpHeld && p.onGround) {
      p.vy = JUMP_STRENGTH;
      p.onGround = false;
    }
    jumpHeld = jumpNow;
  } else {
    p.vx *= 0.8;
  }

  /* Gravity */
  p.vy += GRAVITY;
  if (p.vy > MAX_FALL_SPEED) p.vy = MAX_FALL_SPEED;

  p.x += p.vx;
  p.y += p.vy;

  /* Walk animation */
  if (Math.abs(p.vx) > 0.5 && p.onGround && !p.playingRecorder) {
    p.walkTimer += dt;
    if (p.walkTimer >= WALK_ANIM_SPEED) {
      p.walkTimer = 0;
      p.walkFrame = 1 - p.walkFrame;
    }
  } else {
    p.walkFrame = 0;
    p.walkTimer = 0;
  }

  /* Platform collision — feet aligned to platform tops */
  resolvePlatformCollision(p);

  /* World bounds */
  if (p.x < 0) p.x = 0;
  if (p.x + p.width > level.worldWidth) p.x = level.worldWidth - p.width;
  if (p.y > CANVAS_HEIGHT + 50) {
    takeDamage();
    p.x = Math.max(0, cameraX + 50);
    p.y = CANVAS_HEIGHT - 200;
    p.vy = 0;
  }

  /* Camera follow */
  const targetCam = p.x - CANVAS_WIDTH * 0.35;
  cameraX += (targetCam - cameraX) * 0.08;
  if (cameraX < 0) cameraX = 0;
  if (cameraX > level.worldWidth - CANVAS_WIDTH) cameraX = level.worldWidth - CANVAS_WIDTH;

  /* Collect notes */
  for (const note of notes) {
    if (note.collected) continue;
    const noteBox = {
      x: note.x,
      y: note.y + Math.sin(note.bobPhase) * 4,
      width: note.width,
      height: note.height
    };
    if (rectsOverlap(p, noteBox)) {
      note.collected = true;
      p.collectedThisLevel++;
      score += note.value;
      spawnSparkles(note.x + note.width / 2, note.y + note.height / 2, note.golden ? '#ffd700' : '#ffe066');
      playCollectSound(note.golden);
    }
    note.bobPhase += dt * 0.003;
  }

  /* Enemies */
  for (const enemy of enemies) {
    enemy.x += enemy.speed * enemy.direction;
    if (enemy.x > enemy.startX + enemy.range) enemy.direction = -1;
    if (enemy.x < enemy.startX - enemy.range) enemy.direction = 1;

    if (now < p.invincibleUntil) continue;

    if (rectsOverlap(getPlayerBodyHitbox(p), getEnemyHitbox(enemy))) {
      takeDamage();
    }
  }

  updateBoss(dt, now);
  updateProjectiles(dt, now);

  /* Magic recorder glow */
  if (magicRecorder) {
    magicRecorder.glowPhase += dt * 0.004;
  }

  /* Check level complete */
  if (p.collectedThisLevel >= level.notesRequired) {
    if (level.hasMagicRecorder) {
      /* Wait for recorder interaction — hint shown in draw */
    } else if (level.riddle && gameState === 'playing') {
      enterRiddleState();
    }
  }

  updateParticles(dt);
  updateBgNotes(dt);
}

function shootBossProjectile(b) {
  if (!player) return;

  const bx = b.x + b.width / 2;
  const by = b.y + b.height * 0.55;
  const px = player.x + player.width / 2;
  const py = player.y + player.height * 0.35;
  const dx = px - bx;
  const dy = py - by;
  const len = Math.hypot(dx, dy) || 1;
  const speed = 4.8 + currentLevel * 0.45;

  projectiles.push(createProjectile(
    bx - PROJECTILE_SIZE / 2,
    by - PROJECTILE_SIZE / 2,
    (dx / len) * speed,
    (dy / len) * speed
  ));
  playShootSound();
}

function updateBoss(dt, now) {
  if (!boss || !player) return;

  boss.x += boss.speed * boss.direction;
  if (boss.x > boss.startX + boss.range) boss.direction = -1;
  if (boss.x < boss.startX - boss.range) boss.direction = 1;

  boss.shootTimer -= dt;
  const distX = Math.abs(player.x - boss.x);
  if (boss.shootTimer <= 0 && distX < 950) {
    shootBossProjectile(boss);
    boss.shootTimer = boss.shootCooldown;
  }

  if (now < player.invincibleUntil) return;
  if (rectsOverlap(getPlayerBodyHitbox(player), getBossHitbox(boss))) {
    takeDamage();
  }
}

function updateProjectiles(dt, now) {
  if (!player || !level) return;

  for (let i = projectiles.length - 1; i >= 0; i--) {
    const proj = projectiles[i];
    proj.x += proj.vx;
    proj.y += proj.vy;

    if (proj.x < -200 || proj.x > level.worldWidth + 200 ||
        proj.y < -200 || proj.y > CANVAS_HEIGHT + 200) {
      projectiles.splice(i, 1);
      continue;
    }

    if (now < player.invincibleUntil) continue;
    if (rectsOverlap(getPlayerBodyHitbox(player), getProjectileHitbox(proj))) {
      takeDamage();
      projectiles.splice(i, 1);
    }
  }
}

function takeDamage() {
  const now = performance.now();
  if (now < player.invincibleUntil) return;

  hearts--;
  player.invincibleUntil = now + INVINCIBLE_TIME;
  player.surprisedUntil = now + 800;
  playHitSound();

  if (hearts <= 0) {
    gameState = 'gameOver';
    touchControls.classList.add('hidden');
  }
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.08;
    p.life -= dt;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

function updateConfetti(dt) {
  for (let i = confetti.length - 1; i >= 0; i--) {
    const c = confetti[i];
    c.x += c.vx;
    c.y += c.vy;
    c.vy += 0.05;
    c.rotation += c.rotSpeed;
    c.life -= dt;
    if (c.life <= 0 || c.y > CANVAS_HEIGHT + 50) confetti.splice(i, 1);
  }
}

function updateBgNotes(dt) {
  for (const n of bgNotes) {
    n.y -= n.speed;
    n.x += Math.sin(n.phase) * 0.3;
    n.phase += dt * 0.001;
    if (n.y < -20) {
      n.y = CANVAS_HEIGHT + 20;
      n.x = Math.random() * CANVAS_WIDTH;
    }
  }
}

function update(dt) {
  deltaTime = dt;

  if (gameState === 'playing') {
    updatePlaying(dt);
  } else if (gameState === 'finale') {
    updateConfetti(dt);
    updateBgNotes(dt);
  } else   if (gameState === 'start' || gameState === 'gameOver' || gameState === 'riddle') {
    updateBgNotes(dt);
  }

  if (gameState === 'riddle') {
    const panel = document.getElementById('riddle-panel');
    if (panel) panel.classList.toggle('shake', riddleShake > 0);
  }

  if (riddleShake > 0) riddleShake -= dt;
}

/* ==========================================================================
   7. DRAWING
   ========================================================================== */

function drawGradientBackground(cfg) {
  const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
  const colors = cfg.bgGradient || ['#2d5a27', '#5a9a4a', '#8fd48f'];
  grad.addColorStop(0, colors[0]);
  grad.addColorStop(0.5, colors[1]);
  grad.addColorStop(1, colors[2]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

/* Cover-fit background (like CSS background-size: cover) */
function drawImageCover(img, parallaxX) {
  const destW = CANVAS_WIDTH;
  const destH = CANVAS_HEIGHT;
  const imgRatio = img.width / img.height;
  const destRatio = destW / destH;
  let sx;
  let sy;
  let sWidth;
  let sHeight;

  if (imgRatio > destRatio) {
    sHeight = img.height;
    sWidth = img.height * destRatio;
    sy = 0;
    sx = (img.width - sWidth) / 2;
  } else {
    sWidth = img.width;
    sHeight = img.width / destRatio;
    sx = 0;
    sy = (img.height - sHeight) / 2;
  }

  if (parallaxX && img.width > sWidth + 1) {
    const maxShift = img.width - sWidth;
    sx = (sx + parallaxX * 0.12) % maxShift;
    if (sx < 0) sx += maxShift;
  }

  ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, destW, destH);
}

function drawGameplayReadabilityOverlay() {
  const grad = ctx.createLinearGradient(0, CANVAS_HEIGHT - 260, 0, CANVAS_HEIGHT);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
  grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.08)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0.28)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, CANVAS_HEIGHT - 260, CANVAS_WIDTH, 260);
}

function drawBackground() {
  const cfg = level || LEVELS[0];
  const bgImg = getImage(cfg.bgKey);

  if (isDrawable(bgImg)) {
    const parallax = gameState === 'playing' ? cameraX : 0;
    drawImageCover(bgImg, parallax);
    drawGameplayReadabilityOverlay();
  } else {
    drawGradientBackground(cfg);
  }

  /* Floating decorative notes */
  for (const n of bgNotes) {
    ctx.globalAlpha = n.opacity;
    drawNoteShape(n.x, n.y, n.size, '#ffffff');
    ctx.globalAlpha = 1;
  }
}

function drawNoteShape(x, y, size, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, size * 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(x + size * 0.15, y - size * 0.9, size * 0.12, size * 0.9);
}

function drawPlatforms() {
  for (const plat of platforms) {
    const sx = plat.x - cameraX;
    if (sx + plat.width < 0 || sx > CANVAS_WIDTH) continue;

    const grad = ctx.createLinearGradient(sx, plat.y, sx, plat.y + plat.height);
    grad.addColorStop(0, '#6b4c9a');
    grad.addColorStop(1, '#4a3070');
    ctx.fillStyle = grad;
    roundRect(sx, plat.y, plat.width, plat.height, 8);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 2;
    roundRect(sx, plat.y, plat.width, plat.height, 8);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    roundRect(sx + 4, plat.y + 4, plat.width - 8, 8, 4);
    ctx.fill();
  }
}

function drawCollectibles() {
  for (const note of notes) {
    if (note.collected) continue;
    const sx = note.x - cameraX;
    if (sx + note.width < 0 || sx > CANVAS_WIDTH) continue;

    const bob = Math.sin(note.bobPhase) * 4;
    const imgKey = note.golden ? 'golden_note' : 'music_note';
    const img = getImage(imgKey);

    if (img) {
      ctx.drawImage(img, sx, note.y + bob, note.width, note.height);
    } else {
      ctx.fillStyle = note.golden ? '#ffd700' : '#ffe066';
      ctx.beginPath();
      ctx.arc(sx + note.width / 2, note.y + bob + note.height / 2, note.width / 2, 0, Math.PI * 2);
      ctx.fill();
      if (note.golden) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  }
}

function drawEnemies() {
  for (const enemy of enemies) {
    const sx = enemy.x - cameraX;
    if (sx + enemy.width < 0 || sx > CANVAS_WIDTH) continue;

    const img = getImage('silence_cloud');
    if (img) {
      ctx.drawImage(img, sx, enemy.y, enemy.width, enemy.height);
    } else {
      drawCloudPlaceholder(sx, enemy.y, enemy.width, enemy.height);
    }
  }
}

function drawBoss() {
  if (!boss) return;

  const sx = boss.x - cameraX;
  if (sx + boss.width < 0 || sx > CANVAS_WIDTH) return;

  const img = getImage('silence_cloud_boss');
  if (img) {
    ctx.drawImage(img, sx, boss.y, boss.width, boss.height);
  } else {
    drawCloudPlaceholder(sx, boss.y, boss.width, boss.height);
    ctx.fillStyle = '#5a3080';
    applyHebrewTextStyle(16, true, 'center');
    ctx.fillText('בוס', sx + boss.width / 2, boss.y + boss.height * 0.55);
    resetTextStyle();
  }
}

function drawProjectiles() {
  const img = getImage('lightning');

  for (const proj of projectiles) {
    const sx = proj.x - cameraX;
    if (sx + proj.width < 0 || sx > CANVAS_WIDTH) continue;

    const cx = sx + proj.width / 2;
    const cy = proj.y + proj.height / 2;

    ctx.save();
    ctx.translate(cx, cy);
    if (proj.rotation != null) ctx.rotate(proj.rotation);

    if (img) {
      ctx.drawImage(img, -proj.width / 2, -proj.height / 2, proj.width, proj.height);
    } else {
      ctx.fillStyle = '#ffe066';
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(proj.width * 0.15, -proj.height * 0.35);
      ctx.lineTo(-proj.width * 0.05, 0);
      ctx.lineTo(proj.width * 0.1, 0);
      ctx.lineTo(-proj.width * 0.15, proj.height * 0.35);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }
}

function drawCloudPlaceholder(x, y, w, h) {
  ctx.fillStyle = '#9a9a9a';
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.arc(x + w * 0.3, y + h * 0.5, h * 0.4, 0, Math.PI * 2);
  ctx.arc(x + w * 0.55, y + h * 0.4, h * 0.45, 0, Math.PI * 2);
  ctx.arc(x + w * 0.75, y + h * 0.55, h * 0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#666';
  applyHebrewTextStyle(10, false, 'center');
  ctx.fillText(TEXT.cloudShhh, x + w * 0.5, y + h * 0.6);
}

function drawMagicRecorder() {
  if (!magicRecorder) return;
  const sx = magicRecorder.x - cameraX;
  if (sx + magicRecorder.width < 0 || sx > CANVAS_WIDTH) return;

  const glow = 0.5 + Math.sin(magicRecorder.glowPhase) * 0.3;
  ctx.shadowColor = '#ffd700';
  ctx.shadowBlur = 20 * glow;

  const img = getImage('magic_flute');
  if (img) {
    ctx.drawImage(img, sx, magicRecorder.y, magicRecorder.width, magicRecorder.height);
  } else {
    ctx.fillStyle = '#ffd700';
    roundRect(sx, magicRecorder.y, magicRecorder.width, magicRecorder.height, 8);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '20px sans-serif';
    ctx.fillText('♪', sx + 14, magicRecorder.y + 32);
  }
  ctx.shadowBlur = 0;

  if (player && player.collectedThisLevel >= level.notesRequired) {
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    applyHebrewTextStyle(14, true, 'center');
    ctx.fillText(TEXT.playRecorderHint, sx + magicRecorder.width / 2, magicRecorder.y - 12);
  }
}

function drawPlayer() {
  if (!player) return;
  const p = player;
  const sx = p.x - cameraX;
  const now = performance.now();

  /* Invincibility blink */
  if (now < p.invincibleUntil && Math.floor(now / 100) % 2 === 0) {
    ctx.globalAlpha = 0.4;
  }

  let imgKey = 'girl_idle';
  if (p.playingRecorder) {
    imgKey = 'girl_play_recorder';
  } else if (now < p.surprisedUntil) {
    imgKey = 'girl_surprised';
  } else if (!p.onGround) {
    imgKey = 'girl_jump';
  } else if (Math.abs(p.vx) > 0.5) {
    imgKey = p.walkFrame === 0 ? 'girl_walk_1' : 'girl_walk_2';
  }

  const img = getImage(imgKey);
  if (img) {
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    if (p.facing === -1) {
      ctx.translate(sx + p.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(img, 0, p.y, p.width, p.height);
    } else {
      ctx.drawImage(img, sx, p.y, p.width, p.height);
    }
    ctx.restore();
  } else {
    drawCharacterPlaceholder(sx, p.y, p.width, p.height, p.facing);
  }

  ctx.globalAlpha = 1;
}

function drawCharacterPlaceholder(x, y, w, h, facing) {
  ctx.save();
  if (facing === -1) {
    ctx.translate(x + w, 0);
    ctx.scale(-1, 1);
    x = 0;
  }
  ctx.fillStyle = '#9b59b6';
  roundRect(x + 4, y + 8, w - 8, h - 12, 12);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(x + w * 0.35, y + h * 0.28, 5, 0, Math.PI * 2);
  ctx.arc(x + w * 0.65, y + h * 0.28, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#333';
  ctx.beginPath();
  ctx.arc(x + w * 0.35, y + h * 0.28, 2, 0, Math.PI * 2);
  ctx.arc(x + w * 0.65, y + h * 0.28, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawParticlesLayer() {
  for (const p of particles) {
    const alpha = p.life / p.maxLife;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x - cameraX, p.y, p.size * alpha, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawConfettiLayer() {
  for (const c of confetti) {
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(c.rotation);
    ctx.fillStyle = c.color;
    ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
    ctx.restore();
  }
}

function drawGameWorld() {
  drawBackground();
  drawPlatforms();
  drawCollectibles();
  drawMagicRecorder();
  drawEnemies();
  drawBoss();
  drawProjectiles();
  drawPlayer();
  drawParticlesLayer();
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/* ==========================================================================
   8. UI / MODAL HANDLING
   ========================================================================== */

function drawHUD() {
  uiButtons = [];

  /* Top bar panel */
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  roundRect(16, 12, CANVAS_WIDTH - 32, 52, 16);
  ctx.fill();

  /* Hearts */
  for (let i = 0; i < 3; i++) {
    const hx = 32 + i * 36;
    const hy = 24;
    const heartImg = getImage('heart');
    if (heartImg && i < hearts) {
      ctx.drawImage(heartImg, hx, hy, 28, 28);
    } else if (heartImg && i >= hearts) {
      ctx.globalAlpha = 0.25;
      ctx.drawImage(heartImg, hx, hy, 28, 28);
      ctx.globalAlpha = 1;
    } else {
      drawHeartPlaceholder(hx + 14, hy + 14, i < hearts);
    }
  }

  /* Score */
  ctx.fillStyle = '#5a3080';
  applyHebrewTextStyle(22, true, 'right');
  ctx.fillText(TEXT.score + ': ' + score, 310, 42);

  /* Level name */
  const lvlName = level ? level.name : '';
  applyHebrewTextStyle(22, true, 'center');
  ctx.fillText(lvlName, CANVAS_WIDTH / 2, 42);

  /* Notes progress */
  if (level && player) {
    applyHebrewTextStyle(18, false, 'left');
    ctx.fillText(TEXT.notes + ': ' + player.collectedThisLevel + ' / ' + level.notesRequired, CANVAS_WIDTH - 240, 42);
  }

  /* Mute button */
  const muteBtn = { x: CANVAS_WIDTH - 56, y: 16, w: 40, h: 40 };
  ctx.fillStyle = muted ? '#ccc' : '#e8d4ff';
  roundRect(muteBtn.x, muteBtn.y, muteBtn.w, muteBtn.h, 10);
  ctx.fill();
  ctx.fillStyle = '#5a3080';
  applyHebrewTextStyle(18, false, 'center');
  ctx.fillText(muted ? '🔇' : '🔊', muteBtn.x + muteBtn.w / 2, muteBtn.y + 28);
  resetTextStyle();
  uiButtons.push({
    ...muteBtn,
    action: () => {
      muted = !muted;
      syncBackgroundMusic();
    }
  });
}

function drawHeartPlaceholder(cx, cy, filled) {
  ctx.fillStyle = filled ? '#ff4d6d' : '#ffccd5';
  ctx.beginPath();
  ctx.arc(cx - 5, cy - 3, 6, 0, Math.PI * 2);
  ctx.arc(cx + 5, cy - 3, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx - 11, cy);
  ctx.lineTo(cx, cy + 12);
  ctx.lineTo(cx + 11, cy);
  ctx.fill();
}

function drawOverlayPanel(x, y, w, h) {
  ctx.fillStyle = 'rgba(90, 48, 128, 0.92)';
  roundRect(x, y, w, h, 24);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 3;
  roundRect(x, y, w, h, 24);
  ctx.stroke();
}

function drawButton(x, y, w, h, label, id) {
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0, '#ff9ff3');
  grad.addColorStop(1, '#f368e0');
  ctx.fillStyle = grad;
  roundRect(x, y, w, h, 16);
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  roundRect(x, y, w, h, 16);
  ctx.stroke();
  ctx.fillStyle = '#fff';
  applyHebrewTextStyle(22, true, 'center');
  ctx.fillText(label, x + w / 2, y + h / 2 + 8);
  resetTextStyle();
  uiButtons.push({
    x, y, w, h,
    action: () => handleButton(id)
  });
}

function handleButton(id) {
  if (id === 'start') {
    tryStartBackgroundMusic();
    startGame();
  } else if (id === 'retry') {
    restartLevel();
  } else if (id === 'playAgain') {
    resetGame();
    startGame();
  }
}

function drawStartScreen() {
  drawBackground();
  uiButtons = [];

  /* Title — two lines for the full name */
  ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
  ctx.shadowBlur = 8;
  ctx.fillStyle = '#fff';
  applyHebrewTextStyle(40, true, 'center');
  ctx.fillText(TEXT.gameTitle, CANVAS_WIDTH / 2, 88);
  ctx.shadowColor = '#ffd700';
  ctx.shadowBlur = 18;
  applyHebrewTextStyle(44, true, 'center');
  ctx.fillText(TEXT.gameTitleName, CANVAS_WIDTH / 2, 132);
  ctx.shadowBlur = 0;

  /* Subtitle on dark pill so it stays readable on any background */
  const subW = 680;
  const subH = 46;
  const subX = (CANVAS_WIDTH - subW) / 2;
  const subY = 152;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.62)';
  roundRect(subX, subY, subW, subH, 16);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 2;
  roundRect(subX, subY, subW, subH, 16);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
  ctx.shadowBlur = 6;
  applyHebrewTextStyle(22, false, 'center');
  ctx.fillText(TEXT.subtitle, CANVAS_WIDTH / 2, subY + 30);
  ctx.shadowBlur = 0;

  /* Emma playing the flute — large hero image */
  const heroW = 240;
  const heroH = 360;
  const heroX = CANVAS_WIDTH / 2 - heroW / 2;
  const heroY = 200;
  const previewImg = getImage('girl_play_recorder') || getImage('girl_happy') || getImage('girl_idle');
  if (previewImg) {
    ctx.save();
    ctx.shadowColor = 'rgba(255, 215, 0, 0.45)';
    ctx.shadowBlur = 28;
    ctx.drawImage(previewImg, heroX, heroY, heroW, heroH);
    ctx.restore();
  } else {
    drawCharacterPlaceholder(heroX, heroY, heroW, heroH, 1);
  }

  drawOverlayPanel(CANVAS_WIDTH / 2 - 340, 568, 680, 72);
  ctx.fillStyle = '#fff';
  applyHebrewTextStyle(18, false, 'center');
  ctx.fillText(TEXT.instructions1, CANVAS_WIDTH / 2, 602);
  ctx.fillText(TEXT.instructions2, CANVAS_WIDTH / 2, 628);

  drawButton(CANVAS_WIDTH / 2 - 150, 652, 300, 50, TEXT.startButton, 'start');

  resetTextStyle();
}

function drawRiddleModal() {
  /* Game frozen behind the HTML riddle panel */
  drawGameWorld();
  drawHUD();
}

function drawGameOverScreen() {
  drawGameWorld();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  uiButtons = [];
  drawOverlayPanel(CANVAS_WIDTH / 2 - 300, 120, 600, 480);

  ctx.fillStyle = '#fff';
  applyHebrewTextStyle(34, true, 'center');
  ctx.fillText(TEXT.gameOverTitle, CANVAS_WIDTH / 2, 175);

  applyHebrewTextStyle(21, false, 'center');
  ctx.fillStyle = '#ffe8ff';
  ctx.fillText(TEXT.gameOverLine1, CANVAS_WIDTH / 2, 220);
  ctx.fillText(TEXT.gameOverLine2, CANVAS_WIDTH / 2, 252);

  const sadImg = getImage('girl_surprised') || getImage('girl_idle');
  const heroW = 150;
  const heroH = 225;
  if (sadImg) {
    ctx.drawImage(sadImg, CANVAS_WIDTH / 2 - heroW / 2, 275, heroW, heroH);
  } else {
    drawCharacterPlaceholder(CANVAS_WIDTH / 2 - heroW / 2, 275, heroW, heroH, 1);
  }

  drawButton(CANVAS_WIDTH / 2 - 100, 530, 200, 52, TEXT.tryAgain, 'retry');
  resetTextStyle();
}

function drawFinaleScreen() {
  drawBackground();
  drawConfettiLayer();
  uiButtons = [];

  ctx.shadowColor = '#ffd700';
  ctx.shadowBlur = 25;
  ctx.fillStyle = '#fff';
  applyHebrewTextStyle(44, true, 'center');
  ctx.fillText(TEXT.finaleTitle, CANVAS_WIDTH / 2, 100);
  ctx.shadowBlur = 0;

  drawOverlayPanel(140, 130, CANVAS_WIDTH - 280, 420);

  ctx.fillStyle = '#fff';
  applyHebrewTextStyle(20, false, 'center');
  let ly = 175;
  for (const line of TEXT.finaleLines) {
    ctx.fillText(line, CANVAS_WIDTH / 2, ly);
    ly += line === '' ? 16 : 32;
  }

  const happyImg = getImage('girl_happy');
  if (happyImg) {
    ctx.drawImage(happyImg, CANVAS_WIDTH / 2 - 55, 385, 110, 165);
  } else {
    drawCharacterPlaceholder(CANVAS_WIDTH / 2 - 50, 400, 100, 120, 1);
  }

  drawButton(CANVAS_WIDTH / 2 - 100, 540, 200, 50, TEXT.playAgain, 'playAgain');
  resetTextStyle();
}

function syncRiddleInputEl() {
  if (riddleInputEl) riddleInputEl.value = riddleInput;
}

function enterRiddleState() {
  gameState = 'riddle';
  clearAllInput();
  touchControls.classList.add('hidden');

  if (player) {
    player.surprisedUntil = performance.now() + 800;
    player.vx = 0;
    player.vy = 0;
  }

  const overlay = document.getElementById('riddle-overlay');
  if (overlay) {
    overlay.classList.remove('hidden');
    overlay.setAttribute('aria-hidden', 'false');
  }

  showRiddleInput();
  updateRiddlePanel();
}

function updateRiddlePanel() {
  const questionEl = document.getElementById('riddle-question');
  const hintEl = document.getElementById('riddle-hint-text');
  const titleEl = document.getElementById('riddle-title');

  if (titleEl) titleEl.textContent = TEXT.riddleTitle;
  if (questionEl && level && level.riddle) {
    questionEl.textContent = level.riddle.question;
  }
  if (hintEl) {
    hintEl.textContent = riddleHint || '';
  }
}

function updateRiddleHintDisplay() {
  updateRiddlePanel();
}

function exitRiddleState() {
  hideRiddleInput();
  const overlay = document.getElementById('riddle-overlay');
  if (overlay) {
    overlay.classList.add('hidden');
    overlay.setAttribute('aria-hidden', 'true');
  }
  if (isMobile()) touchControls.classList.remove('hidden');
}

function showRiddleInput() {
  if (!riddleInputEl) return;
  riddleInputEl.value = riddleInput;
  requestAnimationFrame(() => {
    riddleInputEl.focus({ preventScroll: true });
  });
}

function hideRiddleInput() {
  if (!riddleInputEl) return;
  riddleInputEl.blur();
  riddleInputEl.value = '';
  riddleInput = '';
}

function submitRiddle() {
  if (!level || !level.riddle) return;
  if (riddleInputEl) riddleInput = riddleInputEl.value;
  const normalized = riddleInput.trim();
  const correct = level.riddle.answers.some((a) =>
    a.toLowerCase() === normalized.toLowerCase() || a === normalized
  );

  if (correct) {
    playRiddleCorrectSound();
    riddleHint = '';
    updateRiddleHintDisplay();
    exitRiddleState();
    if (currentLevel < LEVELS.length - 1) {
      buildLevel(currentLevel + 1);
      gameState = 'playing';
      if (isMobile()) touchControls.classList.remove('hidden');
    }
  } else {
    riddleHint = level.riddle.hint;
    riddleShake = 300;
    updateRiddleHintDisplay();
    showRiddleInput();
  }
}

/* ==========================================================================
   9. AUDIO HELPERS (Web Audio API + background music)
   ========================================================================== */

const BGM_PATHS = [
  'assets/music/Celestial Breath.mp3',
  '../assets/music/Celestial Breath.mp3'
];

let audioCtx = null;
let bgmPathIndex = 0;

function initBackgroundMusic() {
  if (bgm) return;
  bgm = new Audio();
  bgm.loop = true;
  bgm.volume = 0.38;
  bgm.preload = 'auto';
  bgm.addEventListener('canplaythrough', () => { bgmReady = true; });
  bgm.addEventListener('error', () => {
    bgmPathIndex += 1;
    if (bgmPathIndex < BGM_PATHS.length) {
      bgm.src = BGM_PATHS[bgmPathIndex];
      bgm.load();
    }
  });
  bgm.src = BGM_PATHS[0];
  bgm.load();
}

function tryStartBackgroundMusic() {
  if (!bgm || bgmStarted || muted) return;
  bgmStarted = true;
  bgm.play().catch(() => {
    bgmStarted = false;
  });
}

function syncBackgroundMusic() {
  if (!bgm) return;
  if (muted) {
    bgm.pause();
    return;
  }
  if (bgmStarted) {
    bgm.play().catch(() => {});
  }
}

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

function playTone(freq, duration, type = 'sine', volume = 0.15, delay = 0) {
  if (muted) return;
  try {
    const ac = getAudioContext();
    if (ac.state === 'suspended') ac.resume();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = volume;
    osc.connect(gain);
    gain.connect(ac.destination);
    const t = ac.currentTime + delay;
    osc.start(t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.stop(t + duration);
  } catch (e) { /* audio optional */ }
}

function playCollectSound(golden = false) {
  /* Do–Re–Mi–Fa–Sol–La–Ti–Do — one step per collected note, cycles every 8 */
  const MELODY_SCALE = [261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88, 523.25];
  const freq = MELODY_SCALE[melodyStep % 8];
  melodyStep += 1;
  playTone(freq, golden ? 0.16 : 0.13, 'sine', golden ? 0.13 : 0.11);
  if (golden) {
    playTone(freq * 1.25, 0.1, 'sine', 0.07, 0.06);
  }
}

function playHitSound() {
  playTone(180, 0.25, 'triangle', 0.1);
  playTone(120, 0.3, 'triangle', 0.08, 0.05);
}

function playShootSound() {
  playTone(740, 0.07, 'square', 0.05);
  playTone(980, 0.09, 'sawtooth', 0.04, 0.04);
}

function playRiddleCorrectSound() {
  playTone(523, 0.15, 'sine', 0.12);
  playTone(659, 0.2, 'sine', 0.12, 0.15);
  playTone(784, 0.25, 'sine', 0.1, 0.3);
}

function playFinalArpeggio() {
  const notes = [523, 659, 784, 1047, 1319];
  notes.forEach((freq, i) => playTone(freq, 0.3, 'sine', 0.1, i * 0.12));
}

/* ==========================================================================
   10. RESTART / RESET
   ========================================================================== */

function startGame() {
  score = 0;
  hearts = 3;
  melodyStep = 0;
  buildLevel(0);
  gameState = 'playing';
  touchControls.classList.remove('hidden');
  if (isMobile()) touchControls.classList.remove('hidden');
  resizeCanvas();
}

function restartLevel() {
  hearts = 3;
  buildLevel(currentLevel);
  gameState = 'playing';
  if (isMobile()) touchControls.classList.remove('hidden');
  resizeCanvas();
}

function resetGame() {
  score = 0;
  hearts = 3;
  currentLevel = 0;
  melodyStep = 0;
  particles.length = 0;
  confetti.length = 0;
  jumpHeld = false;
  exitRiddleState();
  gameState = 'start';
  touchControls.classList.add('hidden');
}

/* ==========================================================================
   MAIN LOOP & RESIZE
   ========================================================================== */

function resizeCanvas() {
  const wrapper = document.getElementById('game-wrapper');
  const ww = wrapper.clientWidth - 16;
  const wh = wrapper.clientHeight - 140;
  const scale = Math.min(ww / CANVAS_WIDTH, wh / CANVAS_HEIGHT, 1);
  canvas.style.width = CANVAS_WIDTH * scale + 'px';
  canvas.style.height = CANVAS_HEIGHT * scale + 'px';
  if (touchControls) {
    touchControls.style.maxWidth = canvas.style.width;
  }
}

function render() {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  uiButtons = [];

  switch (gameState) {
    case 'start':
      drawStartScreen();
      break;
    case 'playing':
      drawGameWorld();
      drawHUD();
      break;
    case 'riddle':
      drawRiddleModal();
      break;
    case 'gameOver':
      drawGameOverScreen();
      break;
    case 'finale':
      drawFinaleScreen();
      break;
    default:
      drawStartScreen();
  }
}

function gameLoop(timestamp) {
  if (!lastTime) lastTime = timestamp;
  deltaTime = Math.min(timestamp - lastTime, 50);
  lastTime = timestamp;

  update(deltaTime);
  render();

  requestAnimationFrame(gameLoop);
}

/* ==========================================================================
   INIT
   ========================================================================== */

async function init() {
  setupTouchControls();
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  await loadAllAssets();
  initBackgroundMusic();

  canvas.setAttribute('tabindex', '0');

  gameState = 'start';
  requestAnimationFrame(gameLoop);
}

init();
