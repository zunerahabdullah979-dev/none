/* ========================================================
   Virtual Pet — Stage 4 & 5: Audio & Life Stages Evolution
   script.js — Complete Implementation
   ======================================================== */

// ── 1. Global State Object (Stage 1 Core + Stage 5 Evolution) ───────────────
const state = {
  hunger: 50,
  happiness: 50,
  energy: 50,
  isGameOver: false,
  timerInterval: null,

  // Stage 5 Life Stages & Growth Tracking
  survivalSeconds: 0,
  currentStage: 'Baby', // 'Baby' (0-60s) | 'Teen' (61-180s) | 'Adult' (181s+)
  wasInDanger: false,
};

// Stage 2, 3, & 4 Sensory / Visual State
const visualState = {
  isUmbrellaOpen: false,
  reactionTimeout: null,
  isSoundEnabled: false,
};

// ── 2. DOM References ───────────────────────────────────────────────────────
const hungerValueEl      = document.getElementById('hunger-value');
const happinessValueEl   = document.getElementById('happiness-value');
const energyValueEl      = document.getElementById('energy-value');

const hungerBarEl        = document.getElementById('hunger-bar');
const happinessBarEl     = document.getElementById('happiness-bar');
const energyBarEl        = document.getElementById('energy-bar');

const stageBadgeEl       = document.getElementById('stage-badge');
const stageAgeEl         = document.getElementById('stage-age');

const statusMessageEl    = document.getElementById('status-message');
const gardenReactionEl   = document.getElementById('garden-reaction');
const petCharacterEl     = document.getElementById('pet-character');
const petEmojiEl         = document.getElementById('pet-emoji');
const actionParticlesEl  = document.getElementById('action-particles');

const muteBtn            = document.getElementById('mute-btn');
const muteIconEl         = document.getElementById('mute-icon');
const muteTextEl         = document.getElementById('mute-text');

const umbrellaBtn        = document.getElementById('umbrella-btn');
const gardenCookieBtn    = document.getElementById('garden-cookie');

const feedBtn            = document.getElementById('feed-btn');
const playBtn            = document.getElementById('play-btn');
const sleepBtn           = document.getElementById('sleep-btn');
const restartBtn         = document.getElementById('restart-btn');

// ── 3. Stage 4 Web Audio API Synthesizer Sound Engine ───────────────────────
let audioCtx = null;

/**
 * Gets or creates the single shared AudioContext instance.
 * Reuses the existing context to prevent duplicate AudioContext creation.
 */
function getOrCreateAudioContext() {
  if (!audioCtx && (window.AudioContext || window.webkitAudioContext)) {
    try {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioCtxClass();
    } catch (err) {
      console.warn('Web Audio API is not supported or was blocked:', err);
      audioCtx = null;
    }
  }
  return audioCtx;
}

/**
 * Ensures the AudioContext is running before playing sound.
 * Resumes suspended context inside user interactions.
 * @returns {Promise<AudioContext|null>}
 */
async function ensureAudioContextRunning() {
  const ctx = getOrCreateAudioContext();
  if (!ctx) return null;

  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch (err) {
      console.warn('AudioContext resume was rejected:', err);
      return null;
    }
  }

  return ctx.state === 'running' ? ctx : null;
}

/**
 * Synthesizes a soft, pleasant note with an attack/decay envelope.
 * Strictly checks the sound mute setting before attempting playback.
 */
function playTone(freq, type = 'sine', duration = 0.25, delay = 0, gainLevel = 0.08) {
  if (!visualState.isSoundEnabled) return;

  const ctx = getOrCreateAudioContext();
  if (!ctx) return;

  if (ctx.state === 'suspended') {
    ctx.resume().then(() => {
      if (visualState.isSoundEnabled && ctx.state === 'running') {
        emitTone(ctx, freq, type, duration, delay, gainLevel);
      }
    }).catch(() => {});
    return;
  }

  if (ctx.state === 'running') {
    emitTone(ctx, freq, type, duration, delay, gainLevel);
  }
}

/**
 * Internal helper to schedule oscillator and gain envelope on a running AudioContext.
 */
function emitTone(ctx, freq, type, duration, delay, gainLevel) {
  try {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = type;
    const startTime = ctx.currentTime + Math.max(0, delay);
    osc.frequency.setValueAtTime(freq, startTime);

    // Smooth attack and decay envelope
    gainNode.gain.setValueAtTime(0.0001, startTime);
    gainNode.gain.linearRampToValueAtTime(gainLevel, startTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);

    osc.onended = () => {
      try {
        osc.disconnect();
        gainNode.disconnect();
      } catch (_) {}
    };
  } catch (e) {
    // Silence any audio execution errors
  }
}

/**
 * Sound bank containing original synthesized sound effects for Stage 4 & 5.
 * Every sound function explicitly checks visualState.isSoundEnabled.
 */
const sounds = {
  // Gentle two-note welcome / unmute confirmation chime (C5 -> G5)
  welcome() {
    if (!visualState.isSoundEnabled) return;
    playTone(523.25, 'sine', 0.2, 0.0, 0.09);
    playTone(783.99, 'sine', 0.35, 0.16, 0.09);
  },
  // Soft, upward double-tone chime for feeding (E5 -> G5)
  feed() {
    if (!visualState.isSoundEnabled) return;
    playTone(659.25, 'sine', 0.15, 0.0, 0.08);
    playTone(783.99, 'sine', 0.22, 0.12, 0.09);
  },
  // Cheerful ascending three-note sequence for play (C5 -> E5 -> G5 -> C6)
  play() {
    if (!visualState.isSoundEnabled) return;
    playTone(523.25, 'triangle', 0.12, 0.0, 0.07);
    playTone(659.25, 'triangle', 0.12, 0.09, 0.07);
    playTone(783.99, 'triangle', 0.14, 0.18, 0.08);
    playTone(1046.50, 'sine', 0.25, 0.28, 0.09);
  },
  // Calming descending low-frequency tone for sleep (G4 -> E4 -> C4)
  sleep() {
    if (!visualState.isSoundEnabled) return;
    playTone(392.00, 'triangle', 0.25, 0.0, 0.07);
    playTone(329.63, 'triangle', 0.28, 0.22, 0.06);
    playTone(261.63, 'sine', 0.45, 0.44, 0.08);
  },
  // Short reset sweep / chime for restart (C4 -> G4 -> C5)
  restart() {
    if (!visualState.isSoundEnabled) return;
    playTone(261.63, 'triangle', 0.16, 0.0, 0.07);
    playTone(392.00, 'triangle', 0.18, 0.14, 0.08);
    playTone(523.25, 'sine', 0.35, 0.28, 0.09);
  },
  // Gentle pop tone for cookie
  cookie() {
    if (!visualState.isSoundEnabled) return;
    const ctx = getOrCreateAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    try {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.type = 'sine';
      const t = ctx.currentTime;
      osc.frequency.setValueAtTime(680, t);
      osc.frequency.exponentialRampToValueAtTime(220, t + 0.15);
      gainNode.gain.setValueAtTime(0.09, t);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.16);
      osc.onended = () => {
        try {
          osc.disconnect();
          gainNode.disconnect();
        } catch (_) {}
      };
    } catch (e) {}
  },
  // Gentle click / swoosh tone for umbrella
  umbrella() {
    if (!visualState.isSoundEnabled) return;
    playTone(340, 'sine', 0.1, 0.0, 0.06);
    playTone(460, 'sine', 0.14, 0.08, 0.06);
  },
  // Stage 4: Subtle low-tone alert when any stat falls into danger zone (<20% or >80%)
  warning() {
    if (!visualState.isSoundEnabled) return;
    playTone(196.00, 'triangle', 0.2, 0.0, 0.07);
    playTone(164.81, 'triangle', 0.3, 0.15, 0.07);
  },
  // Stage 4: Distinct, gentle low sequence signifying Game Over
  gameOver() {
    if (!visualState.isSoundEnabled) return;
    playTone(329.63, 'sine', 0.3, 0.0, 0.08);
    playTone(293.66, 'sine', 0.35, 0.26, 0.07);
    playTone(220.00, 'sine', 0.6, 0.55, 0.09);
  },
  // Stage 5: Celebratory ascending fanfare for evolution
  evolve() {
    if (!visualState.isSoundEnabled) return;
    playTone(261.63, 'triangle', 0.14, 0.0, 0.08);
    playTone(329.63, 'triangle', 0.14, 0.1, 0.08);
    playTone(392.00, 'triangle', 0.16, 0.2, 0.09);
    playTone(523.25, 'sine', 0.22, 0.32, 0.09);
    playTone(659.25, 'sine', 0.45, 0.48, 0.1);
  },
  // Soft low double-blip for invalid action
  invalid() {
    if (!visualState.isSoundEnabled) return;
    playTone(220, 'sine', 0.08, 0.0, 0.05);
    playTone(196, 'sine', 0.12, 0.09, 0.05);
  }
};

/**
 * Updates the sound toggle button's displayed state and accessibility attributes.
 */
function updateSoundButtonUI() {
  if (muteBtn) {
    muteBtn.classList.toggle('sound-active', visualState.isSoundEnabled);
    muteBtn.setAttribute('aria-pressed', visualState.isSoundEnabled ? 'true' : 'false');
  }
  if (muteIconEl) {
    muteIconEl.textContent = visualState.isSoundEnabled ? '🔊' : '🔇';
  }
  if (muteTextEl) {
    muteTextEl.textContent = visualState.isSoundEnabled ? 'Sound: On' : 'Sound: Off';
  }
}

/**
 * Toggles sound mute state on and off reliably inside user interaction.
 * Resumes AudioContext asynchronously and plays confirmation chime once running.
 */
async function toggleSound() {
  visualState.isSoundEnabled = !visualState.isSoundEnabled;
  updateSoundButtonUI();

  if (visualState.isSoundEnabled) {
    const ctx = await ensureAudioContextRunning();
    if (ctx) {
      sounds.welcome();
      showTemporaryReaction('🔊 Sound effects enabled! Listen to the gentle garden.');
    } else {
      showTemporaryReaction('🔊 Sound enabled.');
    }
  } else {
    showTemporaryReaction('🔇 Sound muted.');
  }
}

// ── 4. Stat Boundary Helper (Stage 1 Core) ──────────────────────────────────
/**
 * Clamps a stat value so it never drops below 0 or exceeds 100.
 * @param {number} value
 * @returns {number}
 */
function clampStat(value) {
  return Math.max(0, Math.min(100, value));
}

// ── 5. Stage 5 Life Stages & Evolution Logic ────────────────────────────────
/**
 * Calculates the current life stage based on active survival seconds:
 * - Baby: 0 - 60 seconds
 * - Teen: 61 - 180 seconds
 * - Adult: 181+ seconds
 * @param {number} seconds
 * @returns {'Baby'|'Teen'|'Adult'}
 */
function getStageForAge(seconds) {
  if (seconds <= 60)  return 'Baby';
  if (seconds <= 180) return 'Teen';
  return 'Adult';
}

/**
 * Returns dynamic stat decay rates per 2-second tick based on the active life stage:
 * - Baby: Fast hunger decay (hunger +3, happiness -2, energy -1)
 * - Teen: Higher energy demand (hunger +2, happiness -2, energy -2)
 * - Adult: Balanced decay (hunger +2, happiness -3, energy -1)
 * @param {'Baby'|'Teen'|'Adult'} stage
 * @returns {{ hungerDelta: number, happinessDelta: number, energyDelta: number }}
 */
function getStatDecayRates(stage) {
  switch (stage) {
    case 'Baby':
      return { hungerDelta: 3, happinessDelta: -2, energyDelta: -1 };
    case 'Teen':
      return { hungerDelta: 2, happinessDelta: -2, energyDelta: -2 };
    case 'Adult':
    default:
      return { hungerDelta: 2, happinessDelta: -3, energyDelta: -1 };
  }
}

/**
 * Checks for evolutionary transitions and triggers visual and audio fanfare.
 */
function checkLifeStageEvolution() {
  const newStage = getStageForAge(state.survivalSeconds);

  if (newStage !== state.currentStage) {
    const previousStage = state.currentStage;
    state.currentStage = newStage;

    // Trigger visual evolution transition
    triggerEvolutionEffect(previousStage, newStage);
  }
}

/**
 * Executes the visual and audio transition when the pet evolves.
 */
function triggerEvolutionEffect(prevStage, newStage) {
  if (!petCharacterEl) return;

  // Evolution animation pulse
  petCharacterEl.classList.remove('evolve-pulse');
  void petCharacterEl.offsetWidth;
  petCharacterEl.classList.add('evolve-pulse');

  setTimeout(() => {
    petCharacterEl.classList.remove('evolve-pulse');
  }, 1300);

  // Celebratory sound fanfare
  sounds.evolve();

  // Burst of celebratory particles
  spawnParticles(['🌸', '✨', '🌟', '✦'], 5);

  const stageDescriptions = {
    Teen: 'Dewdrop has evolved into an active Teen! Higher energy is needed for exploring.',
    Adult: 'Dewdrop has blossomed into a magnificent Adult! A wise guardian of the rain garden.'
  };

  showTemporaryReaction(`✨ Evolution! ${stageDescriptions[newStage] || 'Dewdrop has evolved!'}`, 4500);
}

// ── 6. Sensory Action Particles ─────────────────────────────────────────────
/**
 * Spawns a limited, bounded burst of temporary floating particles near the pet.
 */
function spawnParticles(symbols = ['✨', '✦', '✧'], count = 3) {
  if (!actionParticlesEl) return;

  while (actionParticlesEl.children.length > 8) {
    actionParticlesEl.removeChild(actionParticlesEl.firstChild);
  }

  const petRect = petCharacterEl ? petCharacterEl.getBoundingClientRect() : null;
  const containerRect = actionParticlesEl.getBoundingClientRect();

  const centerX = petRect && containerRect ? (petRect.left - containerRect.left + petRect.width / 2) : 180;
  const centerY = petRect && containerRect ? (petRect.top - containerRect.top + petRect.height / 2) : 120;

  for (let i = 0; i < Math.min(count, symbols.length); i++) {
    const particle = document.createElement('span');
    particle.className = 'action-particle';
    particle.textContent = symbols[i];

    const offsetX = (i - 1) * 26 + (Math.random() * 16 - 8);
    const offsetY = (Math.random() * 14 - 7);

    particle.style.left = `${centerX + offsetX}px`;
    particle.style.top  = `${centerY + offsetY}px`;

    actionParticlesEl.appendChild(particle);

    particle.addEventListener('animationend', () => {
      particle.remove();
    }, { once: true });

    setTimeout(() => {
      if (particle.parentNode) particle.remove();
    }, 1100);
  }
}

/**
 * Triggers a temporary pet movement class, cleaning up safely after completion.
 */
function triggerPetReaction(className) {
  if (!petCharacterEl || state.isGameOver) return;

  petCharacterEl.classList.remove('react-bounce', 'react-wiggle', 'react-sleep', 'react-tired', 'react-restart');
  void petCharacterEl.offsetWidth;
  petCharacterEl.classList.add(className);

  const cleanup = () => {
    petCharacterEl.classList.remove(className);
    petCharacterEl.removeEventListener('animationend', cleanup);
  };
  petCharacterEl.addEventListener('animationend', cleanup, { once: true });
}

// ── 7. Central Message System ───────────────────────────────────────────────
/**
 * Sets ambient reaction text if no temporary event reaction is showing.
 */
function setAmbientReaction(text) {
  if (visualState.reactionTimeout === null && gardenReactionEl && !state.isGameOver) {
    gardenReactionEl.textContent = text;
  }
}

/**
 * Displays a short reaction message with a gentle fade-in.
 * Respects game-over priority: never hides game-over message.
 */
function showTemporaryReaction(text, duration = 3000) {
  if (!gardenReactionEl || state.isGameOver) return;

  gardenReactionEl.textContent = text;
  gardenReactionEl.classList.remove('fade-in');
  void gardenReactionEl.offsetWidth;
  gardenReactionEl.classList.add('fade-in');

  if (visualState.reactionTimeout !== null) {
    clearTimeout(visualState.reactionTimeout);
  }

  visualState.reactionTimeout = setTimeout(() => {
    visualState.reactionTimeout = null;
    updatePetMood();
  }, duration);
}

// ── 8. Render Function ──────────────────────────────────────────────────────
/**
 * Centralized render function. Synchronizes state with DOM, life stages, and visuals.
 */
function render() {
  // Update numerical stat labels
  if (hungerValueEl)    hungerValueEl.textContent    = state.hunger;
  if (happinessValueEl) happinessValueEl.textContent = state.happiness;
  if (energyValueEl)    energyValueEl.textContent    = state.energy;

  // Update progress bar widths
  if (hungerBarEl)    hungerBarEl.style.width    = state.hunger + '%';
  if (happinessBarEl) happinessBarEl.style.width = state.happiness + '%';
  if (energyBarEl)    energyBarEl.style.width    = state.energy + '%';

  // Critical status classes (Hunger >= 75 is critical; Happiness/Energy <= 25 is critical)
  if (hungerBarEl)    hungerBarEl.classList.toggle('critical', state.hunger >= 75);
  if (happinessBarEl) happinessBarEl.classList.toggle('critical', state.happiness <= 25);
  if (energyBarEl)    energyBarEl.classList.toggle('critical', state.energy <= 25);

  // Stage 5: Update Life Stage Badge and Age Display
  renderLifeStageUI();

  // Update pet mood and visual expression
  updatePetMood();

  // Legacy emoji compatibility
  if (petEmojiEl) {
    petEmojiEl.textContent = getPetEmoji();
  }
}

/**
 * Updates Stage 5 Life Stage badges, age timer, and pet sprite scale classes.
 */
function renderLifeStageUI() {
  const stageIcons = {
    Baby: '🌱',
    Teen: '🌿',
    Adult: '🌸'
  };

  if (stageBadgeEl) {
    stageBadgeEl.textContent = `${stageIcons[state.currentStage] || '🌱'} Stage: ${state.currentStage}`;
  }

  if (stageAgeEl) {
    stageAgeEl.textContent = `⏱️ Age: ${state.survivalSeconds}s`;
  }

  // Update pet sprite scaling and decorative stage classes
  if (petCharacterEl) {
    petCharacterEl.classList.remove('stage-baby', 'stage-teen', 'stage-adult');
    petCharacterEl.classList.add(`stage-${state.currentStage.toLowerCase()}`);
  }
}

/**
 * Updates pet visual mood classes and ambient reaction text.
 */
function updatePetMood() {
  if (!petCharacterEl) return;

  petCharacterEl.classList.remove('mood-happy', 'mood-sleepy', 'mood-sad', 'mood-dead');

  if (state.isGameOver) {
    petCharacterEl.classList.add('mood-dead');
    return;
  }

  if (state.energy <= 25) {
    petCharacterEl.classList.add('mood-sleepy');
    setAmbientReaction('Dewdrop is feeling very drowsy... 😴');
  } else if (state.hunger >= 75) {
    petCharacterEl.classList.add('mood-sad');
    setAmbientReaction('Dewdrop is hungry and hoping for some berries! 🫐');
  } else if (state.happiness <= 25) {
    petCharacterEl.classList.add('mood-sad');
    setAmbientReaction('Dewdrop is feeling a bit lonely in the rain... 🌧️');
  } else if (state.happiness >= 75) {
    petCharacterEl.classList.add('mood-happy');
    setAmbientReaction('Dewdrop is dancing joyfully under the drops! ✨');
  } else {
    // Stage-aware peaceful ambient messages
    const stageAmbiences = {
      Baby: 'Baby Dewdrop is listening peacefully to the gentle rain.',
      Teen: 'Teen Dewdrop is watching raindrops race down leaves.',
      Adult: 'Adult Dewdrop stands gracefully in the cozy rain shelter.'
    };
    setAmbientReaction(stageAmbiences[state.currentStage] || 'Dewdrop is enjoying the rain.');
  }
}

/**
 * Returns a fallback emoji for backwards compatibility.
 */
function getPetEmoji() {
  if (state.isGameOver)       return '😵';
  if (state.happiness >= 75)  return '😄';
  if (state.energy <= 25)     return '😴';
  if (state.hunger >= 75)     return '🥺';
  if (state.happiness <= 25)  return '😢';
  return '😊';
}

// ── 9. Game-Over Conditions & Warnings (Stage 1 & 4 Core) ───────────────────
/**
 * Evaluates whether any game-over criteria are satisfied.
 */
function checkGameOver() {
  const isOver =
    state.hunger    >= 100 ||
    state.happiness <= 0   ||
    state.energy    <= 0;

  if (isOver) {
    triggerGameOver();
  } else {
    // Stage 4 Stat Warning: Check if any stat is in danger zone (<20% or >80%)
    checkStatWarning();
  }
}

/**
 * Stage 4: Stat Warning Alert.
 * Plays a subtle low-tone alert when any stat falls into the danger zone.
 */
function checkStatWarning() {
  const isInDanger =
    state.hunger    >= 80 ||
    state.happiness <= 20 ||
    state.energy    <= 20;

  if (isInDanger && !state.wasInDanger) {
    state.wasInDanger = true;
    sounds.warning();
  } else if (!isInDanger && state.wasInDanger) {
    state.wasInDanger = false;
  }
}

/**
 * Stops game timer, locks controls, and displays game-over banner.
 */
function triggerGameOver() {
  clearInterval(state.timerInterval);
  state.timerInterval = null;
  state.isGameOver = true;

  sounds.gameOver();

  let reason = 'neglected';
  if (state.hunger >= 100)         reason = 'too hungry 🫐';
  else if (state.happiness <= 0)   reason = 'too sad 🌧️';
  else if (state.energy <= 0)      reason = 'completely exhausted 🌙';

  if (statusMessageEl) {
    statusMessageEl.textContent = `💀 Dewdrop was ${reason} and took shelter in the deep forest! (Survived: ${state.survivalSeconds}s as ${state.currentStage})`;
  }
  if (gardenReactionEl) {
    gardenReactionEl.textContent = 'Game over. Press Restart to welcome Baby Dewdrop back!';
  }

  // Lock action controls, unlock restart
  if (feedBtn)    feedBtn.disabled    = true;
  if (playBtn)    playBtn.disabled    = true;
  if (sleepBtn)   sleepBtn.disabled   = true;
  if (restartBtn) restartBtn.disabled = false;

  render();
}

// ── 10. Game Loop (Dynamic Stat Decay per Stage) ────────────────────────────
/**
 * Executes automatic survival time increment, evolutionary check,
 * and dynamic stat decay rates according to active life stage.
 */
function gameTick() {
  if (state.isGameOver) return;

  // Advance survival time by 2 seconds per tick
  state.survivalSeconds += 2;

  // Stage 5: Check and apply life stage evolution
  checkLifeStageEvolution();

  // Stage 5: Dynamic stat decay based on life stage
  const decay = getStatDecayRates(state.currentStage);

  state.hunger    = clampStat(state.hunger    + decay.hungerDelta);
  state.happiness = clampStat(state.happiness + decay.happinessDelta);
  state.energy    = clampStat(state.energy    + decay.energyDelta);

  render();
  checkGameOver();
}

/**
 * Clears any active timer and initializes a fresh 2-second interval.
 */
function startTimer() {
  if (state.timerInterval !== null) {
    clearInterval(state.timerInterval);
  }
  state.timerInterval = setInterval(gameTick, 2000);
}

// ── 11. Core Actions with Sensory Audio & Growth Feedback ───────────────────

/**
 * Feed Action: Hunger -15, Energy +5.
 */
function feed() {
  if (state.isGameOver) return;

  if (state.hunger <= 0) {
    sounds.invalid();
    showTemporaryReaction('Dewdrop is already full and satisfied! 🫐 No need to eat more.');
    return;
  }

  state.hunger = clampStat(state.hunger - 15);
  state.energy = clampStat(state.energy + 5);

  sounds.feed();
  triggerPetReaction('react-bounce');
  spawnParticles(['🫐', '✨', '✦']);
  showTemporaryReaction('Yum! Those sweet garden berries were delicious! 🫐');

  render();
  checkGameOver();
}

/**
 * Play Action: Happiness +15, Energy -10.
 */
function play() {
  if (state.isGameOver) return;

  if (state.energy <= 10) {
    sounds.invalid();
    triggerPetReaction('react-tired');
    showTemporaryReaction('Dewdrop is too sleepy to play right now... 😴 Needs a little nap first!');
    return;
  }

  state.happiness = clampStat(state.happiness + 15);
  state.energy    = clampStat(state.energy    - 10);

  sounds.play();
  triggerPetReaction('react-wiggle');
  spawnParticles(['🎾', '★', '✨']);
  showTemporaryReaction('Yay! Splashing in the rain with you is so much fun! 🎾');

  render();
  checkGameOver();
}

/**
 * Sleep Action: Energy +25, Hunger +10.
 */
function sleep() {
  if (state.isGameOver) return;

  if (state.energy >= 100) {
    sounds.invalid();
    showTemporaryReaction('Dewdrop is wide awake and bursting with energy! ⚡');
    return;
  }

  state.energy = clampStat(state.energy + 25);
  state.hunger = clampStat(state.hunger + 10);

  sounds.sleep();
  triggerPetReaction('react-sleep');
  spawnParticles(['🌙', '💤', '✨']);
  showTemporaryReaction('Sweet dreams, Dewdrop! Rest well in the cozy shelter. 🌙');

  render();
  checkGameOver();
}

/**
 * Restart Action: Resets stats, age, life stage, timer, and UI.
 */
function restart() {
  state.hunger          = 50;
  state.happiness       = 50;
  state.energy          = 50;
  state.isGameOver      = false;
  state.survivalSeconds = 0;
  state.currentStage    = 'Baby';
  state.wasInDanger     = false;

  sounds.restart();
  triggerPetReaction('react-restart');
  spawnParticles(['🌱', '✨', '🌸']);

  if (statusMessageEl)  statusMessageEl.textContent = '';
  if (gardenReactionEl) gardenReactionEl.textContent = 'A fresh little adventure begins in the garden! 🌧️';

  if (feedBtn)    feedBtn.disabled    = false;
  if (playBtn)    playBtn.disabled    = false;
  if (sleepBtn)   sleepBtn.disabled   = false;
  if (restartBtn) restartBtn.disabled = true;

  startTimer();
  render();
}

// ── 12. Decorative Interactions (No effect on game rules or stats) ──────────

/**
 * Toggles the decorative umbrella open/closed.
 */
function toggleUmbrella() {
  visualState.isUmbrellaOpen = !visualState.isUmbrellaOpen;

  if (umbrellaBtn) {
    umbrellaBtn.classList.toggle('is-open', visualState.isUmbrellaOpen);
    umbrellaBtn.setAttribute('aria-expanded', visualState.isUmbrellaOpen);
  }

  sounds.umbrella();

  if (visualState.isUmbrellaOpen) {
    spawnParticles(['💧', '✨', '☂️']);
    showTemporaryReaction('Cozy under the umbrella! ☔ Sheltered from the gentle drops.');
  } else {
    showTemporaryReaction('Let\'s enjoy the refreshing rain! ☂️');
  }
}

/**
 * Handles cookie click reaction.
 */
function handleCookieClick() {
  if (!gardenCookieBtn) return;

  gardenCookieBtn.classList.remove('bounce');
  void gardenCookieBtn.offsetWidth;
  gardenCookieBtn.classList.add('bounce');

  sounds.cookie();
  spawnParticles(['🍪', '✧', '✨']);
  showTemporaryReaction('A tiny sweet cookie for a tiny garden! 🍪');
}

/**
 * Pet click interaction for extra warmth and playfulness.
 */
function handlePetClick() {
  if (state.isGameOver) return;
  sounds.welcome();
  triggerPetReaction('react-bounce');
  spawnParticles(['🌱', '✨']);
  showTemporaryReaction(`🌱 Dewdrop (${state.currentStage}) wiggles happily and sways its leaf!`);
}

// ── 13. Event Listeners ─────────────────────────────────────────────────────
if (feedBtn)         feedBtn.addEventListener('click', feed);
if (playBtn)         playBtn.addEventListener('click', play);
if (sleepBtn)        sleepBtn.addEventListener('click', sleep);
if (restartBtn)      restartBtn.addEventListener('click', restart);

if (muteBtn)         muteBtn.addEventListener('click', toggleSound);
if (umbrellaBtn)     umbrellaBtn.addEventListener('click', toggleUmbrella);
if (gardenCookieBtn) gardenCookieBtn.addEventListener('click', handleCookieClick);
if (petCharacterEl)  petCharacterEl.addEventListener('click', handlePetClick);

// ── 14. Welcome Experience & Initialization ─────────────────────────────────
if (petCharacterEl) {
  petCharacterEl.classList.add('pet-welcome');
  petCharacterEl.addEventListener('animationend', () => {
    petCharacterEl.classList.remove('pet-welcome');
  }, { once: true });
}

// Start game loop and initial render
startTimer();
render();
