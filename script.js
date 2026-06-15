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
const COYOTE_TIME_MS = 140; /* grace period to jump after leaving a ledge */
const MAX_HEARTS = 3;
const MAX_LIVES = 3;
const PLAYER_NAME_STORAGE_KEY = 'emmasgame_player_name';
const PLAYER_NAME_READY_KEY = 'emmasgame_name_ready';

/* Game state */
let gameState = 'start'; /* start | story | playing | riddle | levelFade | gameOver | finale */
let currentLevel = 0;
let score = 0;
let hearts = MAX_HEARTS;
let maxHearts = MAX_HEARTS;
let lives = MAX_LIVES;
let playerName = '';
let lifeLostFlashUntil = 0;
let leaderboardCache = [];
let difficultyMode = 'easy';
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
let groundGaps = [];
let lastSafeX = 80;
let lastSafeY = 0;
let magicRecorder = null;

/* Riddle state */
let riddleInput = '';
let riddleHint = '';
let riddleFeedback = '';
let activeRiddleKey = null;
let riddleLocked = false;
let levelRiddleTriggered = false;
let levelRiddleStep = 0;
let finaleRiddlesComplete = false;
let fadeAlpha = 0;
let fadeMode = null; /* 'out-to-riddle' | 'in-from-black' */
let pendingRiddleKey = null;
let storySlideIndex = 0;
let storyFadeAlpha = 0;
let storyFadeMode = null; /* null | 'out' | 'in' | 'exit' */
let screenFadeAlpha = 0;
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
  ],
  end_game_photo: [
    'assets/backgrounds/end_game_photo.png',
    'assets/backgrounds/end_game_photo.jpg',
    'assets/backgrounds/end_game_photo.jpeg',
    'assets/end_game_photo.png',
    'assets/end_game_photo.jpg',
    '../assets/backgrounds/end_game_photo.png',
    '../assets/backgrounds/end_game_photo.jpg',
    '../assets/backgrounds/end_game_photo.jpeg',
    '../assets/end_game_photo.png'
  ],
  story_1: [
    'assets/story/story 1.png',
    'assets/story/Story 1.png',
    '../assets/story/story 1.png',
    '../assets/story/Story 1.png'
  ],
  story_2: [
    'assets/story/Story 2.png',
    'assets/story/story 2.png',
    '../assets/story/Story 2.png',
    '../assets/story/story 2.png'
  ],
  story_3: [
    'assets/story/Story 3.png',
    'assets/story/story 3.png',
    '../assets/story/Story 3.png',
    '../assets/story/story 3.png'
  ],
  story_4: [
    'assets/story/Story 4.png',
    'assets/story/story 4.png',
    '../assets/story/Story 4.png',
    '../assets/story/story 4.png'
  ]
};

const STORY_SLIDE_KEYS = ['story_1', 'story_2', 'story_3', 'story_4'];

const SPRITE_IMAGE_KEYS = new Set([
  'girl_idle', 'girl_walk_1', 'girl_walk_2', 'girl_jump',
  'girl_happy', 'girl_play_recorder', 'girl_surprised',
  'music_note', 'golden_note', 'magic_flute', 'silence_cloud', 'silence_cloud_boss',
  'lightning', 'heart'
]);

/* Hebrew UI strings */
const HEBREW_FONT = 'Arial, "Noto Sans Hebrew", sans-serif';

const TEXT = {
  gameTitle: 'הרפתקאת המנגינה הקסומה',
  gameTitleName: 'של אמה',
  subtitle: 'משימת יום הולדת מוזיקלית שנוצרה במיוחד בשבילך',
  instructions1: 'אספי את תווי המוזיקה, הימנעי מענני השקט,',
  instructions2: 'והשתמשי בחליל הקסום שלך כדי להחזיר את המוזיקה לעולם.',
  startButton: 'התחלת המסע',
  storyButton: 'הסיפור',
  storyContinueHint: 'רווח, Enter או לחיצה — המשך',
  storyEndHint: 'לחצי שוב כדי לחזור לתפריט',
  storyClose: 'סגירה',
  chooseDifficulty: 'בחרי רמת קושי:',
  easyMode: 'מצב קל',
  hardMode: 'מצב קשה',
  score: 'ניקוד',
  notes: 'תווים',
  lives: 'חיים',
  playerLabel: 'מנגנת',
  nameSaveHint: 'לחצי Enter או אישור — השדה ייעלם ואפשר להתחיל לשחק',
  nameConfirm: 'אישור',
  editName: 'שני שם',
  playerNameReady: 'מנגנת:',
  namePlaceholder: 'השם שלך…',
  leaderboardTitle: '🏆 טבלת המובילים',
  leaderboardEmpty: 'עדיין אין ניקוד — היו הראשונות!',
  lifeLostTitle: 'איבדת את כל הלבבות!',
  lifeLostLine: 'מתחילים שוב מההתחלה — הניקוד נשמר!',
  lifeLostScoreKept: 'ניקוד מצטבר:',
  lifeLostRemaining: 'נותרו',
  lifeLostSuffix: 'חיים',
  riddlePrompt: 'הקלידי תשובה ולחצי שליחה',
  riddlePromptMobile: 'קראי את החידה, ואז לחצי על השדה כדי להקליד',
  submit: 'שליחה',
  playRecorderHint: 'לחצי ♪ לנגינה בחליל!',
  playRecorderRiddleHint: 'עני על החידות בסוף השלב כדי לפתוח את החליל!',
  allNotesGoToFinish: '✨ אספת את כל התווים! רוצי לסוף השלב ✨',
  levelFinishHint: 'סוף השלב',
  cloudShhh: 'ששש',
  gameOverTitle: 'אוי לא… נגמרו החיים!',
  gameOverLine1: 'אל דאגה — כל מוזיקאית גדולה',
  gameOverLine2: 'מתאמנת ומנסה שוב!',
  tryAgain: 'נסי שוב',
  homeButton: 'בית',
  playFluteHint: '♪ — אמה מנגנת בחליל!',
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

const RIDDLES = {
  forest: {
    title: '✨ חידה ביער ✨',
    question:
      'תו קטן הלך לאיבוד ביער.\nהוא שומע: דו, רה, מי…\nאיזה תו מגיע אחר כך?',
    answers: ['פה', 'פא', 'fa', 'Fa', 'FA'],
    hint: 'שירי לאט את הסולם: דו, רה, מי…',
    correctMessage: 'נכון! מצאת את התו הבא והיער התחיל לשיר שוב.',
    wrongMessage: 'כמעט! תקשיבי למנגינה ותנסי שוב.'
  },
  cloud: {
    title: '✨ ענני השקט ✨',
    question:
      'ענני השקט גנבו את המוזיקה.\nאיזה כלי קסום יכול להחזיר את הצלילים?',
    answers: ['חליל', 'חלילית', 'חליל צד', 'מוזיקה', 'מנגינה'],
    hint: 'זה כלי שאפשר לנשוף בו ולנגן איתו מנגינות.',
    correctMessage: 'מעולה! הצלילים חזרו לרקוד בין העננים.',
    wrongMessage: 'לא נורא. תחשבי על כלי נשיפה קטן וקסום.'
  },
  boss: {
    title: '✨ ענן הסערה ✨',
    question:
      'ענן הסערה יורה ברקים כשהמנגינה נעצרת.\nמה מוזיקאית אמיצה עושה כששיר נהיה קשה?',
    answers: [
      'ממשיכה', 'מנסה שוב', 'מתאמנת', 'לא מוותרת',
      'ממשיכים', 'לנסות שוב', 'להתאמן', 'לא לוותר'
    ],
    hint: 'אף אחד לא מנגן מושלם בפעם הראשונה.',
    correctMessage: 'נכון! האומץ שלך החליש את ענן הסערה.',
    wrongMessage: 'כמעט. מוזיקה טובה צריכה סבלנות ואומץ.'
  },
  finale: {
    title: '✨ מנגינת יום ההולדת ✨',
    question: 'מנגינה לא עשויה רק מתווים.\nמה עוד היא צריכה?',
    answers: ['לב', 'אהבה', 'רגש', 'קסם', 'דמיון', 'שמחה', 'חיוך'],
    hint: 'המוזיקה הכי יפה מגיעה מבפנים.',
    correctMessage: 'יפה מאוד! עכשיו המנגינה באמת קסומה.',
    wrongMessage: 'נסי שוב. תחשבי מה מרגישים כששומעים שיר יפה.'
  },
  birthday: {
    title: '✨ שאלת הסיום ✨',
    question: 'היום הוא יום מיוחד במיוחד.\nבת כמה מוזיקאית יום ההולדת?',
    answers: ['8', 'שמונה', 'בת שמונה', 'בת 8'],
    hint: 'תספרי את הנרות על העוגה.',
    correctMessage: 'נכון! יום הולדת 8 שמח!',
    wrongMessage: 'כמעט. תנסי לחשוב על מספר הנרות.'
  }
};

function normalizeRiddleAnswer(str) {
  return str.trim().replace(/\s+/g, ' ').toLowerCase();
}

function isRiddleAnswerCorrect(riddle, input) {
  const normalized = normalizeRiddleAnswer(input);
  return riddle.answers.some((a) => normalizeRiddleAnswer(a) === normalized);
}

function getActiveRiddle() {
  return activeRiddleKey ? RIDDLES[activeRiddleKey] : null;
}

/*
 * Riddle flow (end of level only):
 * 1. Collect every note on the level.
 * 2. Walk to the finish line on the right (golden marker appears).
 * 3. Screen fades to black → question appears.
 * Level 0: forest → Level 1
 * Level 1: cloud, then boss → Level 2
 * Level 2: finale, then birthday → magic flute unlocks
 */
const LEVEL_FINISH_MARGIN = 420;
const FINISH_TRIGGER_TOLERANCE = 96;
const FADE_SPEED = 0.0024;
const LEVEL_RIDDLE_QUEUE = [
  ['forest'],
  ['cloud', 'boss'],
  ['finale', 'birthday']
];

function getFinishLineX() {
  return level ? level.worldWidth - LEVEL_FINISH_MARGIN : 0;
}

function isAtLevelFinish(p) {
  if (!level || !p) return false;
  const center = p.x + p.width * 0.5;
  return center >= getFinishLineX() - FINISH_TRIGGER_TOLERANCE;
}

function isOverlappingFinishZone(p) {
  if (!level || !p) return false;
  const finishX = getFinishLineX();
  const zone = {
    x: finishX - 48,
    y: getGroundY() - 180,
    width: 120,
    height: 220
  };
  return rectsOverlap(p, zone);
}

function tryStartLevelEndTransition() {
  if (!player || !level || levelRiddleTriggered || gameState !== 'playing') return false;
  if (!hasAllLevelNotes(player)) return false;
  if (!isAtLevelFinish(player) && !isOverlappingFinishZone(player)) return false;

  const nextKey = getPendingRiddleKey();
  if (!nextKey) return false;

  levelRiddleTriggered = true;
  startRiddleTransition(nextKey);
  return true;
}

function stabilizePlayerNearFinish(p) {
  if (!level || !p || !hasAllLevelNotes(p)) return;

  const center = p.x + p.width * 0.5;
  if (center < getFinishLineX() - 320) return;

  const feetY = getPlayerFeetY(p);
  const groundY = getGroundY();
  if (feetY > groundY + 28 || feetY < groundY - 36) return;

  const { center: footCenter, left: footLeft, right: footRight } = getPlayerFootSpan(p);
  if (isHorizontallyOverGap(footCenter)) return;

  for (const plat of platforms) {
    if (!plat.isGround) continue;
    if (!platformOverlapX(p, plat, footLeft, footRight)) continue;
    snapPlayerToPlatformTop(p, plat.y);
    return;
  }

  snapPlayerToPlatformTop(p, groundY);
}

function hasAllLevelNotes(p) {
  return p && level && p.collectedThisLevel >= level.notesRequired;
}

function getPendingRiddleKey() {
  if (currentLevel === 2 && finaleRiddlesComplete) return null;
  const queue = LEVEL_RIDDLE_QUEUE[currentLevel];
  if (!queue || levelRiddleStep >= queue.length) return null;
  return queue[levelRiddleStep];
}

function resetFadeState() {
  fadeAlpha = 0;
  fadeMode = null;
  pendingRiddleKey = null;
}

function startCelebrationTransition() {
  fadeMode = 'out-to-celebration';
  fadeAlpha = 0;
  gameState = 'levelFade';
  touchControls.classList.add('hidden');
  if (player) {
    player.vx = 0;
    player.vy = 0;
  }
  afterGameStateChange();
}

function startRiddleTransition(riddleKey) {
  pendingRiddleKey = riddleKey;
  fadeMode = 'out-to-riddle';
  fadeAlpha = 0;
  gameState = 'levelFade';
  touchControls.classList.add('hidden');
  if (player) {
    player.vx = 0;
    player.vy = 0;
  }
  afterGameStateChange();
}

function startLevelFadeIn() {
  fadeAlpha = 1;
  fadeMode = 'in-from-black';
  gameState = 'levelFade';
  afterGameStateChange();
}

function updateLevelFade(dt) {
  if (fadeMode === 'out-to-riddle') {
    fadeAlpha = Math.min(1, fadeAlpha + dt * FADE_SPEED);
    if (fadeAlpha >= 1) {
      const key = pendingRiddleKey;
      pendingRiddleKey = null;
      fadeMode = null;
      fadeAlpha = 0;
      enterRiddleState(key);
    }
  } else if (fadeMode === 'in-from-black') {
    fadeAlpha = Math.max(0, fadeAlpha - dt * FADE_SPEED);
    if (fadeAlpha <= 0) {
      fadeAlpha = 0;
      fadeMode = null;
      gameState = 'playing';
      if (isMobile()) touchControls.classList.remove('hidden');
      afterGameStateChange();
    }
  } else if (fadeMode === 'out-to-celebration') {
    fadeAlpha = Math.min(1, fadeAlpha + dt * FADE_SPEED);
    if (fadeAlpha >= 1) {
      fadeMode = null;
      fadeAlpha = 0;
      enterFinaleCelebration();
    }
  }
}

function drawFadeOverlay() {
  if (fadeAlpha <= 0) return;
  ctx.fillStyle = 'rgba(0, 0, 0, ' + fadeAlpha + ')';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

function drawLevelFinishMarker() {
  if (!level || !player || !hasAllLevelNotes(player)) return;
  if (currentLevel === 2 && finaleRiddlesComplete) return;
  if (levelRiddleTriggered && gameState === 'playing') return;

  const finishX = getFinishLineX();
  const sx = finishX - cameraX;
  if (sx < -80 || sx > CANVAS_WIDTH + 80) return;

  const groundY = CANVAS_HEIGHT - 80;
  const pulse = 0.5 + Math.sin(performance.now() * 0.004) * 0.5;

  ctx.save();
  ctx.globalAlpha = 0.35 + pulse * 0.35;
  ctx.fillStyle = '#ffd700';
  ctx.shadowColor = '#fff9c4';
  ctx.shadowBlur = 18 + pulse * 12;
  ctx.fillRect(sx - 4, groundY - 140, 8, 140);

  applyHebrewTextStyle(16, true, 'center');
  ctx.fillStyle = '#fff';
  ctx.globalAlpha = 0.85 + pulse * 0.15;
  ctx.fillText('← ' + TEXT.levelFinishHint, sx + 70, groundY - 150);
  ctx.restore();
}

function drawLevelEndHint() {
  if (!level || !player || gameState !== 'playing') return;
  if (!hasAllLevelNotes(player) || isAtLevelFinish(player)) return;
  if (levelRiddleTriggered) return;

  ctx.fillStyle = 'rgba(90, 48, 128, 0.92)';
  roundRect(CANVAS_WIDTH / 2 - 280, 78, 560, 36, 12);
  ctx.fill();
  applyHebrewTextStyle(15, true, 'center');
  ctx.fillStyle = '#fff';
  ctx.fillText(TEXT.allNotesGoToFinish, CANVAS_WIDTH / 2, 100);
}

function openStory() {
  storySlideIndex = 0;
  storyFadeAlpha = 1;
  storyFadeMode = 'in';
  gameState = 'story';
  clearAllInput();
  touchControls.classList.add('hidden');
  syncStartPanel();
}

function beginStoryExit() {
  if (storyFadeMode) return;
  storyFadeMode = 'exit';
  storyFadeAlpha = 0;
}

function finishStoryReturn() {
  storySlideIndex = 0;
  storyFadeAlpha = 0;
  storyFadeMode = null;
  gameState = 'start';
  screenFadeAlpha = 1;
  syncStartPanel();
}

function advanceStory() {
  if (storyFadeMode) return;
  if (storySlideIndex >= STORY_SLIDE_KEYS.length - 1) {
    beginStoryExit();
    return;
  }
  storyFadeMode = 'out';
  storyFadeAlpha = 0;
}

function updateStory(dt) {
  if (storyFadeMode === 'out' || storyFadeMode === 'exit') {
    storyFadeAlpha = Math.min(1, storyFadeAlpha + dt * FADE_SPEED);
    if (storyFadeAlpha >= 1) {
      if (storyFadeMode === 'out') {
        storySlideIndex++;
        storyFadeMode = 'in';
      } else {
        finishStoryReturn();
      }
    }
  } else if (storyFadeMode === 'in') {
    storyFadeAlpha = Math.max(0, storyFadeAlpha - dt * FADE_SPEED);
    if (storyFadeAlpha <= 0) {
      storyFadeAlpha = 0;
      storyFadeMode = null;
    }
  }
}

function updateScreenFade(dt) {
  if (screenFadeAlpha <= 0) return;
  screenFadeAlpha = Math.max(0, screenFadeAlpha - dt * FADE_SPEED);
}

function drawScreenFadeOverlay() {
  if (screenFadeAlpha <= 0) return;
  ctx.fillStyle = 'rgba(0, 0, 0, ' + screenFadeAlpha + ')';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

function drawStoryScreen() {
  uiButtons = [];

  ctx.fillStyle = '#0a0612';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  const img = getImage(STORY_SLIDE_KEYS[storySlideIndex]);
  if (img) {
    const margin = 36;
    const maxW = CANVAS_WIDTH - margin * 2;
    const maxH = CANVAS_HEIGHT - 110;
    const scale = Math.min(maxW / img.width, maxH / img.height, 1);
    const w = img.width * scale;
    const h = img.height * scale;
    const x = (CANVAS_WIDTH - w) / 2;
    const y = (CANVAS_HEIGHT - h) / 2 - 16;
    ctx.drawImage(img, x, y, w, h);
  } else {
    applyHebrewTextStyle(22, true, 'center');
    ctx.fillStyle = '#fff';
    ctx.fillText('…', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
  }

  applyHebrewTextStyle(18, false, 'center');
  ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
  ctx.fillText(
    (storySlideIndex + 1) + ' / ' + STORY_SLIDE_KEYS.length,
    CANVAS_WIDTH / 2,
    CANVAS_HEIGHT - 52
  );

  const hint = storySlideIndex >= STORY_SLIDE_KEYS.length - 1
    ? TEXT.storyEndHint
    : TEXT.storyContinueHint;
  ctx.fillText(hint, CANVAS_WIDTH / 2, CANVAS_HEIGHT - 24);

  drawButton(24, 20, 120, 40, TEXT.storyClose, 'storyClose');

  if (storyFadeAlpha > 0) {
    ctx.fillStyle = 'rgba(0, 0, 0, ' + storyFadeAlpha + ')';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  resetTextStyle();
}

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
    enemySpeed: 1.5
  },
  {
    name: 'ענני השקט',
    bgKey: 'cloud_background',
    bgGradient: ['#5eb8ff', '#a8d8ff', '#ffe8a0'],
    worldWidth: 7200,
    notesRequired: 18,
    goldenCount: 4,
    enemyCount: 12,
    enemySpeed: 1.65
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
    hasMagicRecorder: true
  }
];

const DIFFICULTY = {
  easy: {
    label: 'קל',
    hudLabel: 'מצב קל',
    enemyCountMult: 0.6,
    enemySpeedMult: 0.72,
    gapCountOffset: -2,
    gapWidthMult: 0.82,
    notesOffset: -4,
    goldenCountOffset: 0,
    bossSpeedMult: 0.75,
    bossShootCooldownMult: 2.6,
    projectileSpeedMult: 0.58,
    bossShootRange: 620,
    invincibleMult: 1.35
  },
  hard: {
    label: 'קשה',
    hudLabel: 'מצב קשה',
    enemyCountMult: 1.4,
    enemySpeedMult: 1.28,
    gapCountOffset: 2,
    gapWidthMult: 1.22,
    notesOffset: 2,
    goldenCountOffset: 1,
    bossSpeedMult: 1.28,
    bossShootCooldownMult: 0.58,
    projectileSpeedMult: 1.45,
    bossShootRange: 1100,
    invincibleMult: 0.72
  }
};

function getDifficulty() {
  return DIFFICULTY[difficultyMode] || DIFFICULTY.easy;
}

function buildLevelConfig(baseCfg, levelIndex) {
  const d = getDifficulty();
  const baseGapCount = 6 + levelIndex * 2;

  return {
    ...baseCfg,
    notesRequired: Math.max(10, baseCfg.notesRequired + d.notesOffset),
    goldenCount: Math.max(0, (baseCfg.goldenCount || 0) + d.goldenCountOffset),
    enemyCount: Math.max(4, Math.round(baseCfg.enemyCount * d.enemyCountMult)),
    enemySpeed: baseCfg.enemySpeed * d.enemySpeedMult,
    gapCount: Math.max(2, baseGapCount + d.gapCountOffset),
    gapWidthMult: d.gapWidthMult
  };
}

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
const touchInput = { left: false, right: false, jump: false };
const MOBILE_TOUCH_BAR_HEIGHT = 54;

document.addEventListener('keydown', (e) => {
  if (gameState === 'playing' || gameState === 'finale') {
    keys[e.code] = true;
  }
  if (gameState === 'story') {
    if (['Space', 'Enter', 'ArrowRight', 'ArrowLeft', 'ArrowDown'].includes(e.code)) {
      e.preventDefault();
      advanceStory();
    }
    if (e.code === 'Escape') {
      e.preventDefault();
      beginStoryExit();
    }
    return;
  }
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
    if (gameState === 'playing' || gameState === 'finale') e.preventDefault();
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
  riddleInputEl.addEventListener('focus', () => {
    if (gameState !== 'riddle') return;
    setTimeout(syncRiddleLayout, 80);
    setTimeout(syncRiddleLayout, 320);
  });
  riddleInputEl.addEventListener('blur', () => {
    if (gameState === 'riddle') setTimeout(syncRiddleLayout, 80);
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
  jumpHeld = false;
  ['btn-left', 'btn-right', 'btn-jump'].forEach((id) => {
    document.getElementById(id)?.classList.remove('active');
  });
}

function isMobile() {
  return window.innerWidth < 900 || 'ontouchstart' in window;
}

function isPortraitViewport() {
  return window.innerHeight > window.innerWidth;
}

function usesPlayLayout() {
  return ['playing', 'levelFade', 'riddle', 'gameOver', 'finale'].includes(gameState);
}

function tryMobileFullscreen() {
  if (!isMobile()) return;
  const el = document.documentElement;
  const req = el.requestFullscreen || el.webkitRequestFullscreen;
  if (!req) return;
  try {
    const p = req.call(el);
    if (p && typeof p.catch === 'function') p.catch(() => {});
  } catch (err) {
    /* optional */
  }
}

function afterGameStateChange() {
  syncLayoutMode();
  resizeCanvas();
  requestAnimationFrame(() => {
    syncLayoutMode();
    resizeCanvas();
  });
  setTimeout(() => {
    syncLayoutMode();
    resizeCanvas();
  }, 120);
  setTimeout(() => {
    syncLayoutMode();
    resizeCanvas();
  }, 400);
}

function syncLayoutMode() {
  const wrapper = document.getElementById('game-wrapper');
  const rotateHint = document.getElementById('rotate-hint');
  const playLayout = usesPlayLayout();
  const mobile = isMobile();
  const portrait = isPortraitViewport();

  if (wrapper) {
    wrapper.classList.toggle('play-mode', playLayout && mobile && gameState !== 'riddle');
    wrapper.classList.toggle('riddle-mode', gameState === 'riddle');
    wrapper.classList.toggle('mobile-layout', mobile);
    wrapper.classList.toggle('portrait-mobile', mobile && playLayout && portrait && gameState !== 'riddle');
  }

  if (rotateHint) {
    const showRotate = mobile && playLayout && portrait && gameState !== 'riddle';
    rotateHint.classList.toggle('hidden', !showRotate);
    rotateHint.setAttribute('aria-hidden', showRotate ? 'false' : 'true');
  }

  syncTouchControls();
  syncRiddleLayout();
}

function resetRiddleLayoutStyles() {
  const overlay = document.getElementById('riddle-overlay');
  const panel = document.getElementById('riddle-panel');
  if (overlay) {
    overlay.style.top = '';
    overlay.style.left = '';
    overlay.style.width = '';
    overlay.style.height = '';
  }
  if (panel) panel.style.maxHeight = '';
}

function syncRiddleLayout() {
  const overlay = document.getElementById('riddle-overlay');
  const panel = document.getElementById('riddle-panel');
  if (!overlay || overlay.classList.contains('hidden') || gameState !== 'riddle') {
    resetRiddleLayoutStyles();
    return;
  }

  const vv = window.visualViewport;
  if (!vv) return;

  overlay.style.top = vv.offsetTop + 'px';
  overlay.style.left = vv.offsetLeft + 'px';
  overlay.style.width = vv.width + 'px';
  overlay.style.height = vv.height + 'px';

  if (panel) {
    const inset = 20;
    panel.style.maxHeight = Math.max(140, vv.height - inset) + 'px';
  }
}

function shouldShowTouchControls() {
  return isMobile() && (gameState === 'playing' || gameState === 'levelFade' || gameState === 'finale');
}

function syncTouchControls() {
  if (!touchControls) return;
  touchControls.classList.toggle('hidden', !shouldShowTouchControls());
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
  return keys['KeyE'];
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
  if (gameState === 'start' || gameState === 'story') {
    tryStartBackgroundMusic();
  }
  for (const btn of uiButtons) {
    if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
      btn.action();
      return;
    }
  }
  if (gameState === 'story' && !storyFadeMode) {
    advanceStory();
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
    coyoteMs: 0,
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
  const d = getDifficulty();
  const baseCooldown = Math.max(2200, 3200 - currentLevel * 260);
  const level0Bonus = currentLevel === 0 ? 1.35 : 1;

  return {
    x,
    y,
    startX: x,
    range: 95,
    speed: (1.15 + currentLevel * 0.12) * d.bossSpeedMult,
    direction: 1,
    width: BOSS_WIDTH,
    height: BOSS_HEIGHT,
    shootTimer: 2400 + currentLevel * 400,
    shootCooldown: baseCooldown * d.bossShootCooldownMult * level0Bonus
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

function createPlatform(x, y, w, h, opts = {}) {
  return { x, y, width: w, height: h, isGround: !!opts.isGround };
}

function getGroundY() {
  return CANVAS_HEIGHT - 80;
}

function isHorizontallyOverGap(footCenter) {
  for (const gap of groundGaps) {
    if (footCenter > gap.x + 4 && footCenter < gap.x + gap.width - 4) return true;
  }
  return false;
}

function isFootCenterOverGap(footCenter, feetY) {
  const groundY = getGroundY();
  if (feetY < groundY - 10 || feetY > groundY + 8) return false;
  return isHorizontallyOverGap(footCenter);
}

function getPlayerFootSpan(p) {
  const footCenter = p.x + p.width * 0.5;
  const footHalf = 20;
  return {
    center: footCenter,
    left: footCenter - footHalf,
    right: footCenter + footHalf
  };
}

function platformOverlapX(p, plat, footLeft, footRight) {
  return plat.isGround
    ? footRight > plat.x + 2 && footLeft < plat.x + plat.width - 2
    : p.x + p.width > plat.x + 4 && p.x < plat.x + plat.width - 4;
}

function snapPlayerToPlatformTop(p, platTop) {
  p.y = platTop - p.height + PLAYER_FOOT_PADDING;
  p.vy = 0;
  p.onGround = true;
}

function resolvePlatformCollision(p) {
  p.onGround = false;
  const prevFeet = getPlayerFeetY(p) - p.vy;
  const { center: footCenter, left: footLeft, right: footRight } = getPlayerFootSpan(p);
  let supportTop = null;

  for (const plat of platforms) {
    if (!platformOverlapX(p, plat, footLeft, footRight)) continue;

    const feet = getPlayerFeetY(p);
    const platTop = plat.y;
    const landingDepth = plat.isGround ? 14 : plat.height + 8;

    if (p.vy < 0) continue;

    if (feet >= platTop && prevFeet <= platTop + landingDepth) {
      if (plat.isGround && isFootCenterOverGap(footCenter, platTop)) continue;
      snapPlayerToPlatformTop(p, platTop);
      supportTop = platTop;
    } else if (p.vy >= 0 && feet >= platTop - 3 && feet <= platTop + 12) {
      if (plat.isGround && isFootCenterOverGap(footCenter, platTop)) continue;
      if (supportTop === null || platTop < supportTop) supportTop = platTop;
    }
  }

  if (!p.onGround && supportTop !== null) {
    snapPlayerToPlatformTop(p, supportTop);
  }

  if (p.onGround && isFootCenterOverGap(footCenter, getPlayerFeetY(p))) {
    p.onGround = false;
  }
}

function updateLastSafePosition(p) {
  if (!p.onGround || isFootCenterOverGap(p.x + p.width * 0.5, getPlayerFeetY(p))) return;
  lastSafeX = p.x;
  lastSafeY = p.y;
}

function respawnPlayerAtSafe(p) {
  p.x = lastSafeX;
  p.y = lastSafeY;
  p.vx = 0;
  p.vy = 0;
  p.onGround = false;
  p.coyoteMs = 0;
}

function handlePitFall() {
  takeDamage();
  if (gameState !== 'playing' || !player) return;
  respawnPlayerAtSafe(player);
}

function createMagicRecorder(x, y) {
  return { x, y, width: 64, height: 64, glowPhase: 0 };
}

function getPlayerFeetY(p) {
  return p.y + p.height - PLAYER_FOOT_PADDING;
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
  const cfg = buildLevelConfig(LEVELS[levelIndex], levelIndex);
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
  buildGroundWithGaps(groundY, cfg.worldWidth, cfg.gapCount, cfg.gapWidthMult);

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
  const bossX = cfg.worldWidth - (levelIndex === 0 ? 640 : 480);
  boss = createBoss(bossX, bossY);

  if (cfg.hasMagicRecorder) {
    magicRecorder = createMagicRecorder(cfg.worldWidth - 220, groundY - 90);
  }

  player = createPlayer(80, groundY - PLAYER_HEIGHT + PLAYER_FOOT_PADDING);
  player.vx = 0;
  player.vy = 0;
  lastSafeX = player.x;
  lastSafeY = player.y;
  cameraX = 0;
  riddleInput = '';
  riddleHint = '';
  riddleFeedback = '';
  levelRiddleStep = 0;
  levelRiddleTriggered = false;
  resetFadeState();
  if (levelIndex !== 2) {
    finaleRiddlesComplete = false;
  }
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

function buildGroundWithGaps(groundY, worldWidth, gapCount, gapWidthMult = 1) {
  groundGaps.length = 0;
  const gapWidth = Math.max(130, (110 + (gapCount % 3) * 15) * gapWidthMult);
  const segments = gapCount + 1;
  const totalGap = gapCount * gapWidth;
  const segmentWidth = (worldWidth - totalGap) / segments;
  let x = 0;
  for (let i = 0; i < segments; i++) {
    platforms.push(createPlatform(x, groundY, segmentWidth, 80, { isGround: true }));
    x += segmentWidth;
    if (i < segments - 1) {
      groundGaps.push({ x, width: gapWidth });
      x += gapWidth;
    }
  }
}

function buildJumpChallengeLevel(groundY, worldWidth, noteCount, goldenCount) {
  const skyNoteCount = (currentLevel === 0 && difficultyMode === 'easy') ? 1 : 2;
  const chainNoteCount = Math.max(1, noteCount - skyNoteCount);
  let notesPlaced = 0;
  let goldenLeft = goldenCount;
  const startX = 120;
  const endX = worldWidth - 320;
  const chainSpacing = (endX - startX) / Math.max(1, chainNoteCount - 1);
  const stepX = Math.min(102, chainSpacing * 0.42);
  const forestEasy = currentLevel === 0 && difficultyMode === 'easy';
  const stepY = forestEasy ? 56 : 68;

  for (let c = 0; c < chainNoteCount; c++) {
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

  /* Safety net — always spawn exactly chainNoteCount reachable notes */
  while (notesPlaced < chainNoteCount) {
    const x = startX + notesPlaced * ((endX - startX) / Math.max(1, chainNoteCount - 1));
    const py = groundY - (forestEasy ? 88 : 105) - (notesPlaced % 4) * (forestEasy ? 38 : 48);
    platforms.push(createPlatform(x, py + NOTE_SIZE + 14, forestEasy ? 112 : 100, 22));
    const isGolden = goldenLeft > 0;
    if (isGolden) goldenLeft--;
    const note = createNote(x + 23, py, isGolden);
    notes.push(note);
    if (isGolden) goldenNotes.push(note);
    notesPlaced++;
  }

  addSkyChallengeNotes(groundY, worldWidth, goldenLeft, skyNoteCount);
}

/*
 * Sky-high bonus notes — tall climbs. Level 1 (easy) gets one gentle tower only.
 */
function addSkyChallengeNotes(groundY, worldWidth, goldenLeft, skyNoteCount = 2) {
  const levelIdx = currentLevel;
  const easy = difficultyMode === 'easy';
  const platWBase = easy ? 102 : 74;

  const challenges = [];

  if (levelIdx === 0) {
    /* Forest — wide stepping tower, reachable without huge leaps */
    const px = worldWidth * 0.48;
    let py = groundY - 88;
    const steps = easy ? 3 : 4;
    const platList = [];
    for (let s = 0; s < steps; s++) {
      platList.push({ x: px + s * 48, y: py, w: platWBase });
      py -= easy ? 52 : 64;
    }
    challenges.push({ platforms: platList, golden: false });

    if (skyNoteCount > 1) {
      const px2 = worldWidth * 0.58;
      let py2 = groundY - 100;
      challenges.push({
        platforms: [
          { x: px2, y: py2, w: platWBase },
          { x: px2 + 58, y: py2 - 52, w: platWBase },
          { x: px2 + 108, y: py2 - 104, w: platWBase },
          { x: px2 + 148, y: py2 - 148, w: platWBase }
        ],
        golden: false
      });
    }
  } else {
    challenges.push(
      {
        platforms: (() => {
          const px = worldWidth * (0.32 + levelIdx * 0.04);
          let py = groundY - 95;
          const steps = easy ? 4 : 5;
          const list = [];
          for (let s = 0; s < steps; s++) {
            list.push({ x: px + (s % 2) * 8, y: py, w: platWBase - s * 4 });
            py -= easy ? 64 : 72;
          }
          return list;
        })(),
        golden: goldenLeft > 0 && levelIdx > 0
      },
      {
        platforms: (() => {
          const px = worldWidth * (0.62 + levelIdx * 0.03);
          let py = groundY - 115;
          return [
            { x: px, y: py, w: platWBase },
            { x: px + 70, y: py - 78, w: platWBase - 8 },
            { x: px + 118, y: py - 158, w: platWBase - 14 },
            { x: px + 210, y: py - 248, w: easy ? 82 : 68 }
          ];
        })(),
        golden: false
      }
    );
  }

  const activeChallenges = challenges.slice(0, skyNoteCount);
  for (const challenge of activeChallenges) {
    const plats = challenge.platforms;
    for (const p of plats) {
      platforms.push(createPlatform(p.x, p.y, p.w, 18));
    }

    const top = plats[plats.length - 1];
    const isGolden = challenge.golden;
    if (isGolden) goldenLeft--;

    const note = createNote(
      top.x + top.w / 2 - NOTE_SIZE / 2,
      top.y - NOTE_SIZE - 12,
      isGolden
    );
    notes.push(note);
    if (isGolden) goldenNotes.push(note);
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

function isMobilePortraitPlayBlocked() {
  return isMobile() && usesPlayLayout() && isPortraitViewport();
}

function enterFinaleCelebration() {
  if (gameState === 'finale') return;

  const worldWidth = level ? level.worldWidth : LEVELS[2].worldWidth;
  const groundY = getGroundY();
  const floatingPlatforms = platforms.filter((plat) => !plat.isGround);

  gameState = 'finale';
  groundGaps.length = 0;
  platforms = [
    createPlatform(0, groundY, worldWidth, 80, { isGround: true }),
    ...floatingPlatforms
  ];
  enemies = [];
  boss = null;
  projectiles = [];
  notes = [];
  goldenNotes = [];
  magicRecorder = null;

  level = {
    ...(level || LEVELS[2]),
    name: 'celebration',
    worldWidth,
    bgKey: 'end_game_photo',
    hasMagicRecorder: false
  };

  if (player) {
    player.x = Math.min(Math.max(player.x, 0), worldWidth - player.width);
    player.y = groundY - PLAYER_HEIGHT + PLAYER_FOOT_PADDING;
    player.vx = 0;
    player.vy = 0;
    player.onGround = true;
    player.coyoteMs = COYOTE_TIME_MS;
    player.playingRecorder = false;
    player.playTimer = 0;
    player.walkFrame = 0;
    player.walkTimer = 0;
    player.invincibleUntil = performance.now() + 999999;
  } else {
    player = createPlayer(
      worldWidth / 2 - PLAYER_WIDTH / 2,
      groundY - PLAYER_HEIGHT + PLAYER_FOOT_PADDING
    );
    player.onGround = true;
    player.coyoteMs = COYOTE_TIME_MS;
  }

  const targetCam = player.x - CANVAS_WIDTH * 0.35;
  cameraX = Math.max(0, Math.min(targetCam, worldWidth - CANVAS_WIDTH));

  clearAllInput();
  spawnConfetti(140);
  submitScoreToLeaderboard(true);
  if (isMobile()) touchControls.classList.remove('hidden');
  afterGameStateChange();
}

function updatePlayerLocomotion(dt) {
  const p = player;
  if (!p) return;

  if (inputLeft()) {
    p.vx = -PLAYER_SPEED;
    p.facing = -1;
  } else if (inputRight()) {
    p.vx = PLAYER_SPEED;
    p.facing = 1;
  } else {
    p.vx = 0;
  }

  const jumpNow = inputJump();
  const canJump = p.onGround || p.coyoteMs > 0;
  if (jumpNow && !jumpHeld && canJump) {
    p.vy = JUMP_STRENGTH;
    p.onGround = false;
    p.coyoteMs = 0;
  }
  jumpHeld = jumpNow;

  p.vy += GRAVITY;
  if (p.vy > MAX_FALL_SPEED) p.vy = MAX_FALL_SPEED;

  p.x += p.vx;
  p.y += p.vy;

  resolvePlatformCollision(p);
  stabilizePlayerNearFinish(p);

  if (p.onGround) {
    p.coyoteMs = COYOTE_TIME_MS;
  } else {
    p.coyoteMs = Math.max(0, p.coyoteMs - dt);
  }

  if (Math.abs(p.vx) > 0.5 && p.onGround) {
    p.walkTimer += dt;
    if (p.walkTimer >= WALK_ANIM_SPEED) {
      p.walkTimer = 0;
      p.walkFrame = 1 - p.walkFrame;
    }
  } else {
    p.walkFrame = 0;
    p.walkTimer = 0;
  }
}

function updateFinale(dt) {
  if (!player || !level) return;
  if (isMobilePortraitPlayBlocked()) return;

  updatePlayerLocomotion(dt);

  if (player.x < 0) player.x = 0;
  if (player.x + player.width > level.worldWidth) {
    player.x = level.worldWidth - player.width;
  }

  if (player.y > CANVAS_HEIGHT + 40) {
    player.y = getGroundY() - PLAYER_HEIGHT + PLAYER_FOOT_PADDING;
    player.vx = 0;
    player.vy = 0;
    player.onGround = true;
    player.coyoteMs = COYOTE_TIME_MS;
  }

  const targetCam = player.x - CANVAS_WIDTH * 0.35;
  cameraX += (targetCam - cameraX) * 0.08;
  if (cameraX < 0) cameraX = 0;
  if (cameraX > level.worldWidth - CANVAS_WIDTH) {
    cameraX = Math.max(0, level.worldWidth - CANVAS_WIDTH);
  }

  updateConfetti(dt);
  updateBgNotes(dt);
}

function updatePlaying(dt) {
  if (!player || !level) return;
  if (isMobilePortraitPlayBlocked()) return;

  const now = performance.now();
  const p = player;

  /* Recorder play action */
  if (inputPlay() && p.onGround) {
    if (level.hasMagicRecorder && p.collectedThisLevel >= level.notesRequired &&
        magicRecorder && finaleRiddlesComplete) {
      const dist = Math.abs(p.x + p.width / 2 - (magicRecorder.x + magicRecorder.width / 2));
      if (dist < 100) {
        p.playingRecorder = true;
        p.playTimer = 2500;
        playFinalArpeggio();
        setTimeout(() => {
          enterFinaleCelebration();
        }, 2200);
      }
    } else if (!level.hasMagicRecorder) {
      p.playingRecorder = true;
      p.playTimer = 600;
      playFluteTapSound();
    }
  }

  if (p.playTimer > 0) {
    p.playTimer -= dt;
    if (p.playTimer <= 0) p.playingRecorder = false;
  }

  /* Horizontal movement */
  if (!p.playingRecorder) {
    updatePlayerLocomotion(dt);
  } else {
    p.vx *= 0.8;
    p.vy += GRAVITY;
    if (p.vy > MAX_FALL_SPEED) p.vy = MAX_FALL_SPEED;
    p.x += p.vx;
    p.y += p.vy;
    resolvePlatformCollision(p);
    stabilizePlayerNearFinish(p);
    if (p.onGround) {
      p.coyoteMs = COYOTE_TIME_MS;
    } else {
      p.coyoteMs = Math.max(0, p.coyoteMs - dt);
    }
    p.walkFrame = 0;
    p.walkTimer = 0;
  }

  /* Pit — fall through ground gaps (foot center must be over solid ground) */
  const footCenter = p.x + p.width * 0.5;
  const feetY = getPlayerFeetY(p);
  if (isHorizontallyOverGap(footCenter) && feetY > getGroundY() + 70) {
    handlePitFall();
  } else if (p.y > CANVAS_HEIGHT + 50) {
    handlePitFall();
  } else if (p.onGround) {
    updateLastSafePosition(p);
  }

  /* World bounds */
  if (p.x < 0) p.x = 0;
  if (p.x + p.width > level.worldWidth) p.x = level.worldWidth - p.width;

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
      takeDamage('enemy');
    }
  }

  updateBoss(dt, now);
  updateProjectiles(dt, now);

  /* Magic recorder glow */
  if (magicRecorder) {
    magicRecorder.glowPhase += dt * 0.004;
  }

  /* End of level: all notes + reach finish → fade → riddle */
  tryStartLevelEndTransition();

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
  const speed = (4.8 + currentLevel * 0.45) * getDifficulty().projectileSpeedMult;

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
  if (boss.shootTimer <= 0 && distX < getDifficulty().bossShootRange) {
    shootBossProjectile(boss);
    boss.shootTimer = boss.shootCooldown;
  }

  if (now < player.invincibleUntil) return;
  if (rectsOverlap(getPlayerBodyHitbox(player), getBossHitbox(boss))) {
    takeDamage('boss');
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
      takeDamage('lightning');
      projectiles.splice(i, 1);
    }
  }
}

function takeDamage(source = 'pit') {
  const now = performance.now();
  if (now < player.invincibleUntil) return;

  hearts--;
  player.invincibleUntil = now + INVINCIBLE_TIME * getDifficulty().invincibleMult;
  player.surprisedUntil = now + 800;
  if (source === 'enemy' || source === 'boss' || source === 'lightning') {
    playZapSound();
  } else {
    playHitSound();
  }

  if (hearts <= 0) {
    loseLifeAndRestart();
  }
}

function loseLifeAndRestart() {
  lives--;

  if (lives <= 0) {
    submitScoreToLeaderboard(false);
    gameState = 'gameOver';
    touchControls.classList.add('hidden');
    syncStartPanel();
    syncLayoutMode();
    resizeCanvas();
    return;
  }

  melodyStep = 0;
  const restartLevel = currentLevel;
  levelRiddleTriggered = false;
  levelRiddleStep = 0;
  resetFadeState();
  exitRiddleState();
  clearAllInput();
  applyHearts();
  buildLevel(restartLevel);
  gameState = 'playing';
  lifeLostFlashUntil = performance.now() + 2800;
  afterGameStateChange();
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
  } else if (gameState === 'levelFade') {
    updateLevelFade(dt);
    updateBgNotes(dt);
  } else if (gameState === 'finale') {
    updateFinale(dt);
  } else if (gameState === 'story') {
    updateStory(dt);
  } else if (gameState === 'start' || gameState === 'gameOver' || gameState === 'riddle') {
    updateBgNotes(dt);
  }

  if (gameState === 'start') {
    updateScreenFade(dt);
  }

  if (gameState === 'riddle') {
    updateRiddlePanel();
  }
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
  let bgKey = cfg.bgKey;
  if (gameState === 'finale') {
    bgKey = imageLoaded('end_game_photo') ? 'end_game_photo' : 'finale_background';
  }
  const bgImg = getImage(bgKey);

  if (isDrawable(bgImg)) {
    const parallax = (gameState === 'playing' || gameState === 'finale') ? cameraX : 0;
    drawImageCover(bgImg, parallax);
    if (gameState === 'playing' || gameState === 'levelFade') {
      drawGameplayReadabilityOverlay();
    }
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
    const hint = finaleRiddlesComplete ? TEXT.playRecorderHint : TEXT.playRecorderRiddleHint;
    ctx.fillText(hint, sx + magicRecorder.width / 2, magicRecorder.y - 12);
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

function truncateDisplayName(name, maxLen = 14) {
  if (name.length <= maxLen) return name;
  return name.slice(0, maxLen - 1) + '…';
}

function drawHUD() {
  uiButtons = [];
  const compact = isMobile();
  const barY = compact ? 8 : 12;
  const barH = compact ? 50 : 58;
  const barR = compact ? 12 : 16;
  const heartsStartX = compact ? 24 : 32;
  const heartSize = compact ? 22 : 28;
  const heartStep = compact ? 26 : 36;
  const heartsEndX = heartsStartX + (MAX_HEARTS - 1) * heartStep + heartSize;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  roundRect(16, barY, CANVAS_WIDTH - 32, barH, barR);
  ctx.fill();

  const heartY = barY + (compact ? 13 : 14);
  for (let i = 0; i < MAX_HEARTS; i++) {
    const hx = heartsStartX + i * heartStep;
    const hy = heartY;
    const heartImg = getImage('heart');
    if (heartImg && i < hearts) {
      ctx.drawImage(heartImg, hx, hy, heartSize, heartSize);
    } else if (heartImg && i >= hearts) {
      ctx.globalAlpha = 0.25;
      ctx.drawImage(heartImg, hx, hy, heartSize, heartSize);
      ctx.globalAlpha = 1;
    } else {
      drawHeartPlaceholder(hx + heartSize / 2, hy + heartSize / 2, i < hearts);
    }
  }

  const statsX = heartsEndX + (compact ? 10 : 14);
  const statsMidY = barY + barH / 2 + (compact ? 5 : 6);

  if (compact) {
    applyHebrewTextStyle(14, true, 'left');
    ctx.direction = 'ltr';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#5a3080';
    ctx.fillText(lives + '/' + MAX_LIVES + '  ·  ' + TEXT.score + ' ' + score, statsX, statsMidY);

    const lvlName = level ? level.name : '';
    const diffLabel = getDifficulty().hudLabel;
    const shortLevel = lvlName.length > 14 ? lvlName.slice(0, 13) + '…' : lvlName;
    applyHebrewTextStyle(14, true, 'center');
    ctx.direction = 'rtl';
    ctx.textAlign = 'center';
    ctx.fillText(shortLevel + ' · ' + diffLabel, CANVAS_WIDTH / 2, statsMidY);

    if (level && player) {
      applyHebrewTextStyle(13, false, 'left');
      ctx.direction = 'ltr';
      ctx.textAlign = 'left';
      ctx.fillText(
        TEXT.notes + ' ' + player.collectedThisLevel + '/' + level.notesRequired,
        CANVAS_WIDTH - 248,
        statsMidY
      );
    }
  } else {
    applyHebrewTextStyle(17, true, 'left');
    ctx.direction = 'ltr';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#5a3080';
    ctx.fillText(TEXT.lives + ': ' + lives + '/' + MAX_LIVES, statsX, statsMidY);

    ctx.fillStyle = '#5a3080';
    applyHebrewTextStyle(19, true, 'left');
    ctx.fillText(TEXT.score + ': ' + score, statsX + 118, statsMidY);

    const lvlName = level ? level.name : '';
    const diffLabel = getDifficulty().hudLabel;
    const displayName = truncateDisplayName(playerName || getPlayerName());
    applyHebrewTextStyle(16, true, 'center');
    ctx.direction = 'rtl';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#7a4cb0';
    ctx.fillText(TEXT.playerLabel + ': ' + displayName, CANVAS_WIDTH / 2, barY + 22);
    applyHebrewTextStyle(18, true, 'center');
    ctx.fillStyle = '#5a3080';
    ctx.fillText(lvlName + ' · ' + diffLabel, CANVAS_WIDTH / 2, barY + 42);

    if (level && player) {
      applyHebrewTextStyle(17, false, 'left');
      ctx.direction = 'ltr';
      ctx.textAlign = 'left';
      ctx.fillText(
        TEXT.notes + ': ' + player.collectedThisLevel + '/' + level.notesRequired,
        CANVAS_WIDTH - 300,
        statsMidY
      );
    }
  }

  ctx.direction = 'rtl';

  const homeBtn = {
    x: CANVAS_WIDTH - (compact ? 104 : 118),
    y: barY + (compact ? 6 : 6),
    w: compact ? 52 : 58,
    h: compact ? 36 : 40
  };
  ctx.fillStyle = '#ffe8ff';
  roundRect(homeBtn.x, homeBtn.y, homeBtn.w, homeBtn.h, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(90, 48, 128, 0.35)';
  ctx.lineWidth = 2;
  roundRect(homeBtn.x, homeBtn.y, homeBtn.w, homeBtn.h, 10);
  ctx.stroke();
  ctx.fillStyle = '#5a3080';
  applyHebrewTextStyle(17, true, 'center');
  ctx.fillText(TEXT.homeButton, homeBtn.x + homeBtn.w / 2, homeBtn.y + 27);
  resetTextStyle();
  uiButtons.push({ ...homeBtn, action: goHome });

  /* Mute button */
  const muteBtn = {
    x: CANVAS_WIDTH - (compact ? 48 : 56),
    y: barY + (compact ? 6 : 6),
    w: compact ? 36 : 40,
    h: compact ? 36 : 40
  };
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
  if (id === 'openStory') {
    tryStartBackgroundMusic();
    openStory();
  } else if (id === 'storyClose') {
    beginStoryExit();
  } else if (id === 'startEasy') {
    difficultyMode = 'easy';
    tryStartBackgroundMusic();
    startGame();
  } else if (id === 'startHard') {
    difficultyMode = 'hard';
    tryStartBackgroundMusic();
    startGame();
  } else if (id === 'retry') {
    startGame();
  } else if (id === 'playAgain') {
    resetGame();
  } else if (id === 'home') {
    goHome();
  }
}

function drawStartScreen() {
  drawBackground();
  uiButtons = [];

  const mobile = isMobile();
  const landscape = mobile && !isPortraitViewport();

  if (landscape) {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#fff';
    applyHebrewTextStyle(34, true, 'center');
    ctx.fillText(TEXT.gameTitle, CANVAS_WIDTH / 2, 52);
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 16;
    applyHebrewTextStyle(38, true, 'center');
    ctx.fillText(TEXT.gameTitleName, CANVAS_WIDTH / 2, 88);
    ctx.shadowBlur = 0;

    const subW = 760;
    const subH = 36;
    const subX = (CANVAS_WIDTH - subW) / 2;
    const subY = 100;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.62)';
    roundRect(subX, subY, subW, subH, 12);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    applyHebrewTextStyle(17, false, 'center');
    ctx.fillText(TEXT.subtitle, CANVAS_WIDTH / 2, subY + 24);

    const heroW = 280;
    const heroH = 400;
    const heroX = CANVAS_WIDTH / 2 - heroW / 2;
    const heroY = 118;
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

    ctx.fillStyle = '#ffe8ff';
    applyHebrewTextStyle(22, true, 'center');
    ctx.fillText(TEXT.chooseDifficulty, CANVAS_WIDTH / 2, 548);

    drawButton(CANVAS_WIDTH / 2 - 330, 578, 310, 54, TEXT.easyMode, 'startEasy');
    drawButton(CANVAS_WIDTH / 2 + 20, 578, 310, 54, TEXT.hardMode, 'startHard');
    drawButton(CANVAS_WIDTH - 150, 14, 130, 38, '📖 ' + TEXT.storyButton, 'openStory');
  } else {
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

  /* Emma — slightly smaller so buttons fit comfortably */
  const heroW = 220;
  const heroH = 330;
  const heroX = CANVAS_WIDTH / 2 - heroW / 2;
  const heroY = 188;
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

  drawOverlayPanel(CANVAS_WIDTH / 2 - 340, 500, 680, 72);
  ctx.fillStyle = '#fff';
  applyHebrewTextStyle(18, false, 'center');
  ctx.fillText(TEXT.instructions1, CANVAS_WIDTH / 2, 534);
  ctx.fillText(TEXT.instructions2, CANVAS_WIDTH / 2, 560);

  ctx.fillStyle = '#ffe8ff';
  applyHebrewTextStyle(20, true, 'center');
  ctx.fillText(TEXT.chooseDifficulty, CANVAS_WIDTH / 2, 592);

  drawButton(CANVAS_WIDTH / 2 - 320, 628, 300, 48, TEXT.easyMode, 'startEasy');
  drawButton(CANVAS_WIDTH / 2 + 20, 628, 300, 48, TEXT.hardMode, 'startHard');
  drawButton(CANVAS_WIDTH - 164, 20, 140, 44, '📖 ' + TEXT.storyButton, 'openStory');
  }

  resetTextStyle();
  drawScreenFadeOverlay();
}

function drawLifeLostFlash() {
  if (!lifeLostFlashUntil || performance.now() > lifeLostFlashUntil) return;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  drawOverlayPanel(CANVAS_WIDTH / 2 - 280, 240, 560, 200);
  ctx.fillStyle = '#fff';
  applyHebrewTextStyle(30, true, 'center');
  ctx.fillText(TEXT.lifeLostTitle, CANVAS_WIDTH / 2, 292);
  applyHebrewTextStyle(20, false, 'center');
  ctx.fillStyle = '#ffe8ff';
  ctx.fillText(TEXT.lifeLostLine, CANVAS_WIDTH / 2, 328);
  applyHebrewTextStyle(18, true, 'center');
  ctx.fillStyle = '#fff9c4';
  ctx.fillText(TEXT.lifeLostScoreKept + ' ' + score, CANVAS_WIDTH / 2, 360);
  ctx.fillText(
    TEXT.lifeLostRemaining + ' ' + lives + ' ' + TEXT.lifeLostSuffix,
    CANVAS_WIDTH / 2,
    392
  );
  resetTextStyle();
}

function drawLeaderboardPanel(x, y, w, h) {
  drawOverlayPanel(x, y, w, h);
  ctx.fillStyle = '#ffd700';
  applyHebrewTextStyle(20, true, 'center');
  ctx.fillText(TEXT.leaderboardTitle, x + w / 2, y + 34);
  ctx.fillStyle = '#fff';
  applyHebrewTextStyle(16, false, 'right');

  if (!leaderboardCache.length) {
    ctx.fillText(TEXT.leaderboardEmpty, x + w / 2, y + 72);
    resetTextStyle();
    return;
  }

  let ly = y + 62;
  const maxRows = Math.min(leaderboardCache.length, 6);
  for (let i = 0; i < maxRows; i++) {
    const row = leaderboardCache[i];
    const mode = row.difficulty === 'hard' ? 'קשה' : 'קל';
    const done = row.completed ? ' ✨' : '';
    const line = (i + 1) + '. ' + row.player_name + ' — ' + row.score + ' (' + mode + ')' + done;
    ctx.fillText(line, x + w - 20, ly);
    ly += 26;
  }
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
  drawOverlayPanel(CANVAS_WIDTH / 2 - 300, 100, 600, 580);

  ctx.fillStyle = '#fff';
  applyHebrewTextStyle(34, true, 'center');
  ctx.fillText(TEXT.gameOverTitle, CANVAS_WIDTH / 2, 175);

  applyHebrewTextStyle(21, false, 'center');
  ctx.fillStyle = '#ffe8ff';
  ctx.fillText(TEXT.gameOverLine1, CANVAS_WIDTH / 2, 220);
  ctx.fillText(TEXT.gameOverLine2, CANVAS_WIDTH / 2, 252);

  applyHebrewTextStyle(18, false, 'center');
  ctx.fillStyle = '#fff9c4';
  ctx.fillText(TEXT.score + ': ' + score, CANVAS_WIDTH / 2, 290);

  const sadImg = getImage('girl_surprised') || getImage('girl_idle');
  const heroW = 150;
  const heroH = 225;
  if (sadImg) {
    ctx.drawImage(sadImg, CANVAS_WIDTH / 2 - heroW / 2, 305, heroW, heroH);
  } else {
    drawCharacterPlaceholder(CANVAS_WIDTH / 2 - heroW / 2, 305, heroW, heroH, 1);
  }

  drawLeaderboardPanel(CANVAS_WIDTH / 2 - 250, 430, 500, 200);

  drawButton(CANVAS_WIDTH / 2 - 220, 650, 200, 52, TEXT.tryAgain, 'retry');
  drawButton(CANVAS_WIDTH / 2 + 20, 650, 200, 52, TEXT.homeButton, 'home');
  resetTextStyle();
}

function drawFinaleScreen() {
  drawBackground();
  drawPlatforms();
  drawConfettiLayer();
  drawPlayer();
  uiButtons = [];

  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, 118);

  ctx.shadowColor = '#ffd700';
  ctx.shadowBlur = 20;
  ctx.fillStyle = '#fff';
  applyHebrewTextStyle(40, true, 'center');
  ctx.fillText(TEXT.finaleTitle, CANVAS_WIDTH / 2, 58);
  ctx.shadowBlur = 0;

  applyHebrewTextStyle(18, false, 'center');
  ctx.fillStyle = '#fff9c4';
  ctx.fillText(TEXT.score + ': ' + score, CANVAS_WIDTH / 2, 96);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
  ctx.fillRect(0, CANVAS_HEIGHT - 88, CANVAS_WIDTH, 88);

  drawButton(CANVAS_WIDTH / 2 - 220, CANVAS_HEIGHT - 68, 200, 50, TEXT.playAgain, 'playAgain');
  drawButton(CANVAS_WIDTH / 2 + 20, CANVAS_HEIGHT - 68, 200, 50, TEXT.homeButton, 'home');
  resetTextStyle();
}

function syncRiddleInputEl() {
  if (riddleInputEl) riddleInputEl.value = riddleInput;
}

function enterRiddleState(riddleKey) {
  activeRiddleKey = riddleKey;
  gameState = 'riddle';
  riddleInput = '';
  riddleHint = '';
  riddleFeedback = '';
  riddleLocked = false;
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

  const promptEl = document.getElementById('riddle-prompt');
  if (promptEl) {
    promptEl.textContent = isMobile() ? TEXT.riddlePromptMobile : TEXT.riddlePrompt;
  }

  tryMobileFullscreen();
  afterGameStateChange();
  showRiddleInput();
  updateRiddlePanel();
}

function updateRiddlePanel() {
  const riddle = getActiveRiddle();
  const questionEl = document.getElementById('riddle-question');
  const hintEl = document.getElementById('riddle-hint-text');
  const feedbackEl = document.getElementById('riddle-feedback-text');
  const titleEl = document.getElementById('riddle-title');

  if (titleEl && riddle) titleEl.textContent = riddle.title;
  if (questionEl && riddle) questionEl.textContent = riddle.question;
  if (feedbackEl) feedbackEl.textContent = riddleFeedback || '';
  if (hintEl) hintEl.textContent = riddleHint || '';
}

function exitRiddleState() {
  hideRiddleInput();
  activeRiddleKey = null;
  riddleLocked = false;
  const overlay = document.getElementById('riddle-overlay');
  if (overlay) {
    overlay.classList.add('hidden');
    overlay.setAttribute('aria-hidden', 'true');
  }
  resetRiddleLayoutStyles();
}

function showRiddleInput() {
  if (!riddleInputEl) return;
  riddleInputEl.value = riddleInput;
  syncRiddleLayout();
  if (isMobile()) return;
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
  const riddle = getActiveRiddle();
  if (!riddle || riddleLocked) return;

  if (riddleInputEl) riddleInput = riddleInputEl.value;
  const normalized = riddleInput.trim();

  if (!normalized) {
    riddleFeedback = 'כתבי תשובה קטנה — את יכולה!';
    riddleHint = riddle.hint;
    updateRiddlePanel();
    showRiddleInput();
    return;
  }

  if (isRiddleAnswerCorrect(riddle, normalized)) {
    riddleLocked = true;
    playRiddleCorrectSound();
    riddleFeedback = riddle.correctMessage;
    riddleHint = '';
    updateRiddlePanel();
    hideRiddleInput();
    afterGameStateChange();
    setTimeout(() => handleRiddleSuccess(), 1800);
  } else {
    riddleFeedback = riddle.wrongMessage;
    riddleHint = riddle.hint;
    updateRiddlePanel();
    showRiddleInput();
  }
}

function handleRiddleSuccess() {
  riddleLocked = false;
  riddleFeedback = '';
  riddleHint = '';
  exitRiddleState();
  levelRiddleStep++;

  const queue = LEVEL_RIDDLE_QUEUE[currentLevel] || [];
  if (levelRiddleStep < queue.length) {
    startRiddleTransition(queue[levelRiddleStep]);
    return;
  }

  levelRiddleStep = 0;
  levelRiddleTriggered = false;

  if (currentLevel === 0) {
    buildLevel(1);
    startLevelFadeIn();
  } else if (currentLevel === 1) {
    buildLevel(2);
    startLevelFadeIn();
  } else if (currentLevel === 2) {
    finaleRiddlesComplete = true;
    startCelebrationTransition();
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

function playNoiseBurst(duration = 0.1, volume = 0.09) {
  if (muted) return;
  try {
    const ac = getAudioContext();
    if (ac.state === 'suspended') ac.resume();
    const sampleCount = Math.floor(ac.sampleRate * duration);
    const buffer = ac.createBuffer(1, sampleCount, ac.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < sampleCount; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const source = ac.createBufferSource();
    const gain = ac.createGain();
    const filter = ac.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1800;
    source.buffer = buffer;
    gain.gain.value = volume;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ac.destination);
    const t = ac.currentTime;
    source.start(t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    source.stop(t + duration);
  } catch (e) { /* audio optional */ }
}

function playZapSound() {
  playNoiseBurst(0.09, 0.1);
  playTone(1500, 0.05, 'sawtooth', 0.12);
  playTone(900, 0.07, 'square', 0.1, 0.02);
  playTone(420, 0.14, 'sawtooth', 0.08, 0.05);
  playTone(180, 0.2, 'triangle', 0.06, 0.08);
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

function playFluteTapSound() {
  playTone(659, 0.12, 'sine', 0.09);
  playTone(784, 0.14, 'sine', 0.08, 0.08);
}

function playFinalArpeggio() {
  const notes = [523, 659, 784, 1047, 1319];
  notes.forEach((freq, i) => playTone(freq, 0.3, 'sine', 0.1, i * 0.12));
}

/* ==========================================================================
   10. RESTART / RESET
   ========================================================================== */

function applyHearts() {
  maxHearts = MAX_HEARTS;
  hearts = MAX_HEARTS;
}

function getPlayerName() {
  const el = document.getElementById('player-name-input');
  const name = el ? el.value.trim() : playerName;
  return name || 'אמה';
}

function isNameEntryDismissed() {
  try {
    return localStorage.getItem(PLAYER_NAME_READY_KEY) === '1';
  } catch (err) {
    return false;
  }
}

function dismissNameEntry() {
  const name = getPlayerName();
  playerName = name;
  savePlayerName(name);
  try {
    localStorage.setItem(PLAYER_NAME_READY_KEY, '1');
  } catch (err) {
    /* storage optional */
  }

  const input = document.getElementById('player-name-input');
  if (input) input.blur();

  applyNameBlockVisibility();
  resizeCanvas();
}

function showNameEntry() {
  try {
    localStorage.removeItem(PLAYER_NAME_READY_KEY);
  } catch (err) {
    /* storage optional */
  }

  applyNameBlockVisibility();

  const input = document.getElementById('player-name-input');
  if (input) {
    requestAnimationFrame(() => {
      input.focus({ preventScroll: true });
    });
  }
}

function applyNameBlockVisibility() {
  const dismissed = isNameEntryDismissed();
  const nameBlock = document.querySelector('.start-name-block');
  const collapsedBar = document.getElementById('name-collapsed-bar');
  const nameLabel = document.getElementById('name-display-label');
  const wrapper = document.getElementById('game-wrapper');

  if (nameBlock) nameBlock.classList.toggle('hidden', dismissed);
  if (collapsedBar) {
    collapsedBar.classList.toggle('hidden', !dismissed);
    collapsedBar.setAttribute('aria-hidden', dismissed ? 'false' : 'true');
  }
  if (nameLabel) {
    nameLabel.textContent = TEXT.playerNameReady + ' ' + getPlayerName();
  }
  if (wrapper) wrapper.classList.toggle('name-collapsed', dismissed && gameState === 'start');
}

function setupNameInput() {
  const input = document.getElementById('player-name-input');
  const label = document.querySelector('label[for="player-name-input"]');
  const confirmBtn = document.getElementById('name-confirm-btn');
  const editBtn = document.getElementById('edit-name-btn');
  if (!input) return;

  const focusNameInput = (e) => {
    if (e) {
      e.stopPropagation();
      if (e.cancelable) e.preventDefault();
    }
    input.focus({ preventScroll: true });
  };

  input.addEventListener('pointerdown', focusNameInput);
  input.addEventListener('click', (e) => e.stopPropagation());
  input.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.code === 'Enter') {
      e.preventDefault();
      dismissNameEntry();
    }
  });

  if (label) {
    label.addEventListener('pointerdown', focusNameInput);
  }

  if (confirmBtn) {
    confirmBtn.textContent = TEXT.nameConfirm;
    confirmBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dismissNameEntry();
    });
  }

  if (editBtn) {
    editBtn.textContent = TEXT.editName;
    editBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      showNameEntry();
    });
  }
}

function loadSavedPlayerName() {
  try {
    const saved = localStorage.getItem(PLAYER_NAME_STORAGE_KEY);
    const el = document.getElementById('player-name-input');
    if (saved && el) {
      el.value = saved;
      if (localStorage.getItem(PLAYER_NAME_READY_KEY) !== '1') {
        localStorage.setItem(PLAYER_NAME_READY_KEY, '1');
      }
    }
  } catch (err) {
    /* storage optional */
  }
}

function savePlayerName(name) {
  try {
    localStorage.setItem(PLAYER_NAME_STORAGE_KEY, name);
  } catch (err) {
    /* storage optional */
  }
}

function syncStartPanel() {
  const panel = document.getElementById('start-panel');
  const wrapper = document.getElementById('game-wrapper');
  const hintEl = document.getElementById('name-save-hint');
  const confirmBtn = document.getElementById('name-confirm-btn');
  const show = gameState === 'start';

  if (panel) {
    panel.classList.toggle('hidden', !show);
    panel.setAttribute('aria-hidden', show ? 'false' : 'true');
  }
  if (wrapper) {
    wrapper.classList.toggle('start-mode', show);
    if (!show) wrapper.classList.remove('name-collapsed');
  }
  if (hintEl) hintEl.textContent = TEXT.nameSaveHint;
  if (confirmBtn) confirmBtn.textContent = TEXT.nameConfirm;
  if (show) {
    loadSavedPlayerName();
    applyNameBlockVisibility();
  }

  syncTouchControls();
  resizeCanvas();
}

function renderLeaderboardHtml() {
  const list = document.getElementById('leaderboard-list');
  if (!list) return;
  list.innerHTML = '';

  if (!leaderboardCache.length) {
    const li = document.createElement('li');
    li.className = 'leaderboard-empty';
    li.textContent = TEXT.leaderboardEmpty;
    list.appendChild(li);
    return;
  }

  leaderboardCache.slice(0, 4).forEach((row, i) => {
    const li = document.createElement('li');
    const mode = row.difficulty === 'hard' ? 'קשה' : 'קל';
    const done = row.completed ? ' ✨' : '';
    li.textContent = (i + 1) + '. ' + row.player_name + ' — ' + row.score + ' (' + mode + ')' + done;
    list.appendChild(li);
  });
}

async function loadLeaderboard() {
  try {
    const res = await fetch('/api/scores?limit=8');
    if (!res.ok) return;
    const data = await res.json();
    leaderboardCache = data.scores || [];
    renderLeaderboardHtml();
  } catch (err) {
    /* leaderboard optional */
  }
}

async function submitScoreToLeaderboard(completed) {
  if (score <= 0) return;

  try {
    await fetch('/api/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerName: getPlayerName(),
        score,
        difficulty: difficultyMode,
        completed
      })
    });
    await loadLeaderboard();
  } catch (err) {
    /* saving score is optional */
  }
}

function startGame() {
  playerName = getPlayerName();
  savePlayerName(playerName);
  score = 0;
  lives = MAX_LIVES;
  applyHearts();
  melodyStep = 0;
  lifeLostFlashUntil = 0;
  finaleRiddlesComplete = false;
  levelRiddleTriggered = false;
  levelRiddleStep = 0;
  resetFadeState();
  buildLevel(0);
  gameState = 'playing';
  syncStartPanel();
  tryMobileFullscreen();
  syncTouchControls();
  resizeCanvas();
}

function restartLevel() {
  applyHearts();
  levelRiddleStep = 0;
  resetFadeState();
  buildLevel(currentLevel);
  gameState = 'playing';
  syncStartPanel();
  if (isMobile()) touchControls.classList.remove('hidden');
  resizeCanvas();
}

function resetGame() {
  score = 0;
  lives = MAX_LIVES;
  applyHearts();
  currentLevel = 0;
  melodyStep = 0;
  lifeLostFlashUntil = 0;
  finaleRiddlesComplete = false;
  levelRiddleTriggered = false;
  levelRiddleStep = 0;
  resetFadeState();
  storySlideIndex = 0;
  storyFadeAlpha = 0;
  storyFadeMode = null;
  screenFadeAlpha = 0;
  activeRiddleKey = null;
  riddleFeedback = '';
  riddleHint = '';
  riddleLocked = false;
  particles.length = 0;
  confetti.length = 0;
  jumpHeld = false;
  exitRiddleState();
  gameState = 'start';
  syncStartPanel();
  touchControls.classList.add('hidden');
  player = null;
  level = null;
  loadLeaderboard();
}

function goHome() {
  resetGame();
}

function applyDifficultyHearts() {
  applyHearts();
}

/* ==========================================================================
   MAIN LOOP & RESIZE
   ========================================================================== */

function resizeCanvas() {
  syncLayoutMode();

  const wrapper = document.getElementById('game-wrapper');
  const viewport = document.getElementById('game-viewport');
  const startPanel = document.getElementById('start-panel');
  const mobilePlay = isMobile() && usesPlayLayout();

  const startPanelExtra = (gameState === 'start' && startPanel && !startPanel.classList.contains('hidden'))
    ? startPanel.offsetHeight + 14
    : 0;

  const stage = document.getElementById('game-stage');
  let ww;
  let wh;
  if (mobilePlay) {
    const vv = window.visualViewport;
    const controlsExtra = shouldShowTouchControls() ? MOBILE_TOUCH_BAR_HEIGHT : 0;
    ww = stage ? stage.clientWidth : (vv ? vv.width : wrapper.clientWidth);
    wh = (stage ? stage.clientHeight : (vv ? vv.height : wrapper.clientHeight)) - controlsExtra;
  } else {
    ww = wrapper.clientWidth - 16;
    wh = wrapper.clientHeight - 24 - startPanelExtra;
  }

  const maxScale = mobilePlay ? 3 : 1;
  const scale = Math.min(ww / CANVAS_WIDTH, wh / CANVAS_HEIGHT, maxScale);
  const displayW = Math.round(CANVAS_WIDTH * scale);
  const displayH = Math.round(CANVAS_HEIGHT * scale);

  if (viewport) {
    viewport.style.width = displayW + 'px';
    viewport.style.height = displayH + 'px';
  }

  if (touchControls && mobilePlay) {
    touchControls.style.width = displayW + 'px';
  }

  canvas.style.position = '';
  canvas.style.left = '';
  canvas.style.top = '';
  canvas.style.transform = '';
  canvas.style.width = displayW + 'px';
  canvas.style.height = displayH + 'px';
}

function render() {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  uiButtons = [];

  switch (gameState) {
    case 'start':
      drawStartScreen();
      break;
    case 'story':
      drawStoryScreen();
      break;
    case 'playing':
      drawGameWorld();
      drawLevelFinishMarker();
      drawHUD();
      drawLevelEndHint();
      drawLifeLostFlash();
      break;
    case 'levelFade':
      drawGameWorld();
      drawLevelFinishMarker();
      drawHUD();
      drawLevelEndHint();
      drawLifeLostFlash();
      drawFadeOverlay();
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
  setupNameInput();
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  window.addEventListener('orientationchange', () => {
    setTimeout(afterGameStateChange, 120);
  });
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => {
      afterGameStateChange();
    });
    window.visualViewport.addEventListener('scroll', syncRiddleLayout);
  }

  await loadAllAssets();
  initBackgroundMusic();

  canvas.setAttribute('tabindex', '0');

  gameState = 'start';
  syncStartPanel();
  loadSavedPlayerName();
  loadLeaderboard();
  requestAnimationFrame(gameLoop);
}

init();
