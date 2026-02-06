const CONFIG = {
    mobileCount: 4000,
    pcCount: 6400,
    redRatio: 0.1,
    noiseScale: 0.003,
    forceStrength: 0.5,
    thresholdY: 0.5,
    colors: {
        bg: '#FCFCFC',
        black: '#000000',
        red: '#EB0013'
    }
};

let particlesBlack = [];
let particlesRed = [];
let thresholdLine;

function setup() {
    let cnv = createCanvas(windowWidth, windowHeight);
    thresholdLine = height * CONFIG.thresholdY;

    // Responsive Particle Count
    let pCount = (windowWidth < 800) ? CONFIG.mobileCount : CONFIG.pcCount;

    // Initialize Particles - Split into Batches
    for (let i = 0; i < pCount; i++) {
        let isRed = random(1) < CONFIG.redRatio;
        let p = new Particle(random(width), random(height, height * 1.5), isRed);
        if (isRed) {
            particlesRed.push(p);
        } else {
            particlesBlack.push(p);
        }
    }

    // --- FORCE SAFARI TOUCH FIX ---
    // Prevent default scrolling aggressively with non-passive listeners
    cnv.elt.addEventListener('touchstart', function (e) { e.preventDefault(); }, { passive: false });
    cnv.elt.addEventListener('touchmove', function (e) { e.preventDefault(); }, { passive: false });
    cnv.elt.addEventListener('touchend', function (e) { e.preventDefault(); }, { passive: false });
}

function draw() {
    background(CONFIG.colors.bg);

    // Update Threshold on resize
    thresholdLine = height * CONFIG.thresholdY;

    // Mouse Coordinates
    let mx = mouseX;
    let my = mouseY;
    let isPressed = mouseIsPressed;

    // Ghost Touch Fix: On mobile, if no fingers down, move "mouse" offscreen
    if (windowWidth < 800 && touches.length === 0) {
        mx = -5000;
        my = -5000;
    }

    // Global Tide (Harmonics)
    let t = frameCount * 0.005;
    let globalTide = sin(t) + sin(t * 3.2) * 0.4 + noise(t);

    // --- BATCH 1: BLACK PARTICLES ---
    stroke(CONFIG.colors.black);
    for (let p of particlesBlack) {
        p.interact(mx, my, isPressed);
        p.update(globalTide);
        p.display();
    }

    // --- BATCH 2: RED PARTICLES ---
    stroke(CONFIG.colors.red);
    for (let p of particlesRed) {
        p.interact(mx, my, isPressed);
        p.update(globalTide);
        p.display();
    }
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    thresholdLine = height * CONFIG.thresholdY;
}

// --- Mobile Safari Touch Fix ---
// Explicitly prevent default browser behaviors (Scroll/Zoom)
// so that the canvas receives the raw Drag events.
function touchStarted() {
    return false;
}

function touchMoved() {
    return false;
}

class Particle {
    constructor(x, y, isRed) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.ax = 0;
        this.ay = 0;
        this.isRed = isRed;
        this.size = random(1.5, 3);
        this.maxSpeed = random(2, 4);
        this.isSuccess = false;
        this.successX = 0;
    }

    interact(mx, my, isPressed) {
        if (this.isSuccess) return;

        let dx = this.x - mx;
        let dy = this.y - my;
        let distSq = dx * dx + dy * dy;

        // Responsive Radius
        // Mobile: 150px (Gathering Swarm)
        // PC: 600px (Huge Gravity Well)
        let isMobile = (windowWidth < 800);
        let radius = isMobile ? 150 : 600;

        // PC Hover Radius Limit (120px)
        if (!isMobile && !isPressed) {
            radius = 120;
        }

        if (distSq < radius * radius) {
            let d = Math.sqrt(distSq);
            if (d === 0) d = 0.001; // Avoid division by zero

            // Normalize direction (force vector)
            let fx = dx / d;
            let fy = dy / d;

            let strength = map(d, 0, radius, 5, 0);

            if (isPressed) {
                // Unified "Gather & Drag" Logic
                // Negative = Attract
                let mag = strength * -1.2;
                fx *= mag;
                fy *= mag;
            } else {
                // Passive Hover Repel (Disrupt)
                let mag = strength * 0.5;
                fx *= mag;
                fy *= mag;
            }

            this.ax += fx;
            this.ay += fy;
        }
    }

    update(globalTide) {
        // --- CASE 1: SUCCESS STATE (LINE) ---
        if (this.isSuccess) {
            // Erosion
            if (random(1) < 0.01) {
                this.isSuccess = false;
                this.y = thresholdLine + random(10, 100);
                this.vx = random(-1, 1);
                this.vy = random(1, 3);
            }
            return;
        }

        // --- CASE 2: NATURAL FLOW FIELD (Weighted) ---
        let n = noise(this.x * 0.003, this.y * 0.003, frameCount * 0.002);
        let angle = map(n, 0, 1, 0, TWO_PI * 4);

        let desiredX = cos(angle) * this.maxSpeed;
        let desiredY = sin(angle) * this.maxSpeed;

        // Steering (Inertia)
        let steerX = desiredX - this.vx;
        let steerY = desiredY - this.vy;

        // Limit steer
        let steerMagSq = steerX * steerX + steerY * steerY;
        let limit = 0.08;
        if (steerMagSq > limit * limit) {
            let steerMag = Math.sqrt(steerMagSq);
            steerX = (steerX / steerMag) * limit;
            steerY = (steerY / steerMag) * limit;
        }

        this.ax += steerX;
        this.ay += steerY;

        // Buoyancy
        this.ay += -0.012;

        // Physics
        this.vx += this.ax;
        this.vy += this.ay;

        // Limit Velocity
        let velMagSq = this.vx * this.vx + this.vy * this.vy;
        if (velMagSq > this.maxSpeed * this.maxSpeed) {
            let velMag = Math.sqrt(velMagSq);
            this.vx = (this.vx / velMag) * this.maxSpeed;
            this.vy = (this.vy / velMag) * this.maxSpeed;
        }

        this.x += this.vx;
        this.y += this.vy;

        // Clear Acc
        this.ax = 0;
        this.ay = 0;

        // EDGE RESPAWN (Rising Flow - Bottom Only)
        // Strictly enforcing Bottom Spawn
        let offScreen = (this.x < -50 || this.x > width + 50 || this.y > height + 50 || this.y < -50);

        if (offScreen) {
            this.x = random(width);
            this.y = height + 10; // Start below screen
            this.vx = random(-1, 1);
            this.vy = random(-3, -5); // Shoot Upward

            this.maxSpeed = random(2, 4);
            this.ax = 0;
            this.ay = 0;
        }

        // THRESHOLD
        if (this.y <= thresholdLine) {
            this.isSuccess = true;
            this.successX = this.x;
            this.y = thresholdLine;
            this.vx = 0;
            this.vy = 0;
        }
    }

    display() {
        if (this.isSuccess) {
            // Vertical Line
            // stroke() is handled globally
            strokeWeight(1);
            let jit = random(-0.5, 0.5);
            line(this.successX + jit, 0, this.successX + jit, thresholdLine);
        } else {
            // Flying Streak
            // stroke() is handled globally
            strokeWeight(random(0.5, 1.5));

            let tailX = this.x - this.vx * 2;
            let tailY = this.y - this.vy * 2;
            line(this.x, this.y, tailX, tailY);
        }
    }
}
