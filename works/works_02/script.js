// Works 02: Kinetic Binary Partitioning
// BAEK Portfolio Work
// Stack: p5.js + Matter.js + Generative Audio

// --- Globals ---
const Engine = Matter.Engine;
const World = Matter.World;
const Bodies = Matter.Bodies;
const Runner = Matter.Runner;

let engine;
let world;
let boxes = [];
let boundaries = [];
let decayThreshold = 50; // Default

// Physics Constants
const WALL_THICKNESS = 100;

// Sound Globals
let noiseOsc;
let noiseEnv;
let bassOsc;
let bassEnv;
let soundEnabled = false; // Default: Sound OFF
let isGlobalMute = false; // Controlled by Parent

// --- Setup ---
function setup() {
    window.audioCtx = getAudioContext();
    // 1. Render Setup
    let cnv = createCanvas(windowWidth, windowHeight);
    cnv.parent(document.querySelector('main'));
    // Retina Support: Cap key density at 2 for performance/quality balance
    pixelDensity(min(window.devicePixelRatio, 2));

    // Set Decay Threshold based on device
    decayThreshold = (windowWidth < 768) ? 25 : 50;

    // 2. UI Setup (Sound Button)
    setupUI();

    // --- Vanilla Touch Handler for Robustness ---
    // Bypass p5.js touchStarted which can be flaky on some mobile browsers
    cnv.elt.addEventListener('touchstart', (e) => {
        // 1. Resume Audio
        if (soundEnabled && !isGlobalMute && getAudioContext().state !== 'running') {
            userStartAudio();
        }

        // 2. UI Protection
        if (e.target.id === 'sound-btn') return;

        // 3. Prevent Browser Defaults (Scroll/Zoom)
        e.preventDefault();

        // 4. Handle Touches
        // Use changedTouches to process only new touches
        for (let i = 0; i < e.changedTouches.length; i++) {
            const t = e.changedTouches[i];
            // Manual coordinate mapping not usually needed if canvas fills window,
            // but strictly use clientX/Y relative to canvas if needed. 
            // Since canvas is full screen fixed:
            handleInput(t.clientX, t.clientY);
        }
        return false;
    }, { passive: false }); // Important: passive: false allows preventDefault

    // 3. Physics Setup
    engine = Engine.create();
    world = engine.world;
    engine.gravity.y = 1;

    // 4. Sound Setup (Generative)
    setupAudio();

    // 5. Scene Setup
    createBoundaries();
    resetSystem();

    // 6. Run Physics
    let runner = Runner.create();
    Runner.run(runner, engine);

    // 7. Start Logic Loop
    scheduleNextSplit();
}

function setupUI() {
    let btn = select('#sound-btn');
    if (!btn) return;

    // Initial State
    btn.html('Sound On');

    // Magnetic Hover Effect
    if (window.matchMedia("(hover: hover)").matches) {
        applyMagneticEffect(btn.elt);
    }

    // Click Handler
    btn.mousePressed(() => {
        soundEnabled = !soundEnabled;

        // Update Text: Action-based
        // If ON -> "Sound Off" (to turn off)
        // If OFF -> "Sound On" (to turn on)
        btn.html(soundEnabled ? 'Sound Off' : 'Sound On');

        if (soundEnabled) {
            // Wake up Audio Context
            if (!isGlobalMute) userStartAudio();

            // Ensure Oscillators are running (browsers may stop them)
            if (noiseOsc) try { noiseOsc.start(); } catch (e) { }
            if (bassOsc) try { bassOsc.start(); } catch (e) { }
        }
    });
}

function setupAudio() {
    // High Frequency "Crack" (Noise)
    noiseEnv = new p5.Envelope();
    noiseEnv.setADSR(0.001, 0.05, 0.0, 0.1);
    noiseEnv.setRange(0.5, 0);

    noiseOsc = new p5.Noise();
    noiseOsc.amp(noiseEnv);
    // Start silently (envelope controls volume)
    noiseOsc.start();

    // Low Frequency "Boom" (Sine)
    bassEnv = new p5.Envelope();
    bassEnv.setADSR(0.01, 0.4, 0.0, 0.3);
    bassEnv.setRange(0.8, 0);

    bassOsc = new p5.Oscillator('sine');
    bassOsc.freq(60);
    bassOsc.amp(bassEnv);
    bassOsc.start();
}

// --- Magnetic Helper ---
function applyMagneticEffect(element) {
    if (!element) return;

    element.addEventListener('mousemove', (e) => {
        const rect = element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const deltaX = e.clientX - centerX;
        const deltaY = e.clientY - centerY;

        const intensity = 0.4; // Magnet strength
        const x = deltaX * intensity;
        const y = deltaY * intensity;

        // Apply Transform
        element.style.transform = `translate(${x}px, ${y}px)`;
        element.style.transition = 'transform 0.2s ease-out';
    });

    element.addEventListener('mouseleave', () => {
        // Snap back
        element.style.transition = 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        element.style.transform = `translate(0px, 0px)`;
    });
}

// --- Loop Logic ---
function scheduleNextSplit() {
    // Rhythmic Intervals
    let delays = [200, 200, 400, 400, 800, 1200, 200];
    let nextDelay = random(delays);

    setTimeout(() => {
        if (boxes.length > 0) {
            triggerRandomSplits(floor(random(2, 6)));
        }
        scheduleNextSplit();
    }, nextDelay);
}

function resetSystem() {
    World.clear(world, false);
    Engine.clear(engine);
    boxes = [];
    boundaries = [];
    createBoundaries();

    // Initial Block
    createBox(width / 2, height / 2, width, height, false);
}

function draw() {
    background('#FCFCFC');

    // Render & Update
    for (let i = boxes.length - 1; i >= 0; i--) {
        let box = boxes[i];
        drawBox(box);

        // Safety Culling
        if (box.position.y > height + 200) {
            World.remove(world, box);
            boxes.splice(i, 1);
        }
    }

    // Reset Condition: All gone -> Start over
    if (boxes.length === 0) {
        resetSystem();
    }
}

// --- Interaction ---
// --- Interaction ---
// --- Interaction ---
function mousePressed(e) {
    // UI Click Check (Safety) - Accept explicit event 'e' and check window.event fallback
    const evt = e || window.event;
    if (evt && evt.target && evt.target.id === 'sound-btn') return;

    handleInput(mouseX, mouseY);
}

// function touchStarted() removed in favor of vanilla listener in setup()

function handleInput(x, y) {
    if (soundEnabled && !isGlobalMute) userStartAudio();

    for (let i = boxes.length - 1; i >= 0; i--) {
        let b = boxes[i];
        if (isPointInBody(x, y, b)) {
            // Chaos (Red)
            if (b.color === '#EB0013') {
                playSplitSound(true);
                splitBox(b, 0, true);
                triggerRandomSplits(9);
            } else {
                // Normal
                playSplitSound(false);
                splitBox(b, 0, true);
            }
            break; // Handle one block per input point
        }
    }
}

function triggerRandomSplits(count) {
    if (boxes.length === 0) return;
    let indices = shuffle(Array.from({ length: boxes.length }, (_, i) => i));

    for (let i = 0; i < min(count, indices.length); i++) {
        let b = boxes[indices[i]];
        if (b) splitBox(b, 0);
    }
}

// --- Core Logic ---
function createBoundaries() {
    let opts = { isStatic: true, friction: 0.5, restitution: 0.2 };
    boundaries = [
        Bodies.rectangle(width / 2, height + WALL_THICKNESS / 2, width * 2, WALL_THICKNESS, opts), // Bottom
        Bodies.rectangle(-WALL_THICKNESS / 2, height / 2, WALL_THICKNESS, height * 2, opts), // Left
        Bodies.rectangle(width + WALL_THICKNESS / 2, height / 2, WALL_THICKNESS, height * 2, opts) // Right
    ];
    World.add(world, boundaries);
}

function createBox(x, y, w, h, forceColor = null) {
    // 15% Chance for Red
    let isRed = forceColor !== null ? forceColor : (random(1) < 0.15);
    let body = Bodies.rectangle(x, y, w, h, { friction: 0.5, restitution: 0.6, density: 0.001 });

    body.width = w;
    body.height = h;
    body.color = isRed ? '#EB0013' : '#FCFCFC';

    // Slight Jitter
    Matter.Body.setVelocity(body, { x: random(-2, 2), y: random(-2, 2) });
    Matter.Body.setAngularVelocity(body, random(-0.05, 0.05));

    boxes.push(body);
    World.add(world, body);
    return body;
}

function splitBox(body, depth = 0, silent = false) {
    if (depth > 2) return;

    if (!silent) playSplitSound(body.color === '#EB0013');

    World.remove(world, body);
    boxes = boxes.filter(b => b !== body);

    let w = body.width;
    let h = body.height;

    // Decay Threshold: Vanish if smaller than threshold
    if (w < decayThreshold || h < decayThreshold) return;

    let splitVertical = w > h;
    let gap = 5;

    if (splitVertical) {
        let newW = (w / 2) - gap;
        let newH = h;
        createBox(body.position.x - w / 4, body.position.y, newW, newH);
        createBox(body.position.x + w / 4, body.position.y, newW, newH);
    } else {
        let newW = w;
        let newH = (h / 2) - gap;
        createBox(body.position.x, body.position.y - h / 4, newW, newH);
        createBox(body.position.x, body.position.y + h / 4, newW, newH);
    }
}

// --- Sound ---
function playSplitSound(isRed) {
    if (!soundEnabled) return;

    if (isRed) {
        bassOsc.freq(random(50, 80));
        bassEnv.play();
        noiseOsc.setType('brown');
        noiseEnv.play();
    } else {
        noiseOsc.setType(random(['white', 'brown']));
        noiseEnv.play();
    }
}

// --- Utils ---
function drawBox(body) {
    push();
    translate(body.position.x, body.position.y);
    rotate(body.angle);
    rectMode(CENTER);
    stroke(60); // Optical thinning (Dark Gray instead of Black)
    strokeWeight(1);
    fill(body.color);
    rect(0, 0, body.width, body.height);
    pop();
}

function isPointInBody(x, y, body) {
    return Matter.Query.point([body], { x: x, y: y }).length > 0;
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    decayThreshold = (windowWidth < 768) ? 25 : 50;
    World.remove(world, boundaries);
    createBoundaries();
}

// ... (Existing code) ...


window.addEventListener('message', function (event) {
    if (event.data === 'MUTE') {
        isGlobalMute = true; // Block local resume
        try {
            if (typeof getAudioContext === 'function') {
                var ctx = getAudioContext();
                if (ctx.state === 'running') ctx.suspend();
            } else if (window.audioCtx) {
                if (window.audioCtx.state === 'running') window.audioCtx.suspend();
            }
        } catch (e) { console.error(e); }
    } else if (event.data === 'UNMUTE') {
        isGlobalMute = false; // Allow local resume
        try {
            if (typeof getAudioContext === 'function') {
                var ctx = getAudioContext();
                if (ctx.state === 'suspended' && soundEnabled) ctx.resume();
            } else if (window.audioCtx) {
                if (window.audioCtx.state === 'suspended' && soundEnabled) window.audioCtx.resume();
            }
        } catch (e) { console.error(e); }
    }
});
