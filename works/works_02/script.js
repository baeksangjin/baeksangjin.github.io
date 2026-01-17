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

// --- Setup ---
function setup() {
    // 1. Render Setup
    let cnv = createCanvas(windowWidth, windowHeight);
    cnv.parent(document.querySelector('main'));
    pixelDensity(1); // Critical for Mobile Safari performance & coordinate matching

    // Set Decay Threshold based on device
    decayThreshold = (windowWidth < 768) ? 25 : 50;

    // 2. UI Setup (Sound Button)
    setupUI();

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
            userStartAudio();

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
    background(255);

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
function mousePressed() {
    // Only handle canvas clicks here
    // Button clicks are handled by btn.mousePressed

    // UI Click Check (Safety)
    if (event && event.target && event.target.id === 'sound-btn') return;

    handleInput(mouseX, mouseY);
}

function touchStarted() {
    // Safari Audio Resume
    if (soundEnabled && getAudioContext().state !== 'running') {
        userStartAudio();
    }

    // UI Touch Check
    if (event && event.target && event.target.id === 'sound-btn') return true;

    // Multi-touch Support
    for (let i = 0; i < touches.length; i++) {
        handleInput(touches[i].x, touches[i].y);
    }

    // Prevent default (Scroll/Zoom)
    return false;
}

function handleInput(x, y) {
    if (soundEnabled) userStartAudio();

    for (let i = boxes.length - 1; i >= 0; i--) {
        let b = boxes[i];
        if (isPointInBody(x, y, b)) {
            // Chaos (Red)
            if (b.color === '#D72626') {
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
    body.color = isRed ? '#D72626' : '#FFFFFF';

    // Slight Jitter
    Matter.Body.setVelocity(body, { x: random(-2, 2), y: random(-2, 2) });
    Matter.Body.setAngularVelocity(body, random(-0.05, 0.05));

    boxes.push(body);
    World.add(world, body);
    return body;
}

function splitBox(body, depth = 0, silent = false) {
    if (depth > 2) return;

    if (!silent) playSplitSound(body.color === '#D72626');

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
    stroke(0);
    strokeWeight(0.5);
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
