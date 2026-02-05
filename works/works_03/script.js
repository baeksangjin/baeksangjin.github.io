const CONFIG = {
    mobileCount: 4000,
    pcCount: 6400,
    redRatio: 0.1,
    noiseScale: 0.003,
    forceStrength: 0.5,
    thresholdY: 0.5,
    colors: {
        bg: '#FFFFFF',
        black: '#000000',
        red: '#EB0013'
    }
};

let particles = [];
let thresholdLine;

function setup() {
    createCanvas(windowWidth, windowHeight);
    thresholdLine = height * CONFIG.thresholdY;

    // Responsive Particle Count
    let pCount = (windowWidth < 800) ? CONFIG.mobileCount : CONFIG.pcCount;

    // Initialize Particles
    for (let i = 0; i < pCount; i++) {
        let isRed = random(1) < CONFIG.redRatio;
        particles.push(new Particle(random(width), random(height, height * 1.5), isRed));
    }
}

function draw() {
    background(CONFIG.colors.bg);

    // Update Threshold on resize
    thresholdLine = height * CONFIG.thresholdY;

    // Mouse Vector
    let mouse = createVector(mouseX, mouseY);
    let isPressed = mouseIsPressed;

    // Ghost Touch Fix: On mobile, if no fingers down, move "mouse" offscreen
    if (windowWidth < 800 && touches.length === 0) {
        mouse = createVector(-5000, -5000);
    }

    // Global Tide (Harmonics)
    let t = frameCount * 0.005;
    let globalTide = sin(t) + sin(t * 3.2) * 0.4 + noise(t);

    for (let p of particles) {
        p.interact(mouse, isPressed);
        p.update(globalTide);
        p.display();
    }
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    thresholdLine = height * CONFIG.thresholdY;
}

class Particle {
    constructor(x, y, isRed) {
        this.pos = createVector(x, y);
        this.vel = createVector(0, 0);
        this.acc = createVector(0, 0);
        this.isRed = isRed;
        this.size = random(1.5, 3);
        this.maxSpeed = random(2, 4);
        this.isSuccess = false;
        this.successX = 0;
    }

    interact(mouse, isPressed) {
        if (this.isSuccess) return;

        let d = this.pos.dist(mouse);

        // Responsive Radius
        // Mobile: 150px (Gathering Swarm)
        // PC: 600px (Huge Gravity Well)
        let isMobile = (windowWidth < 800);
        let radius = isMobile ? 150 : 600;

        // PC Hover Radius Limit (120px)
        if (!isMobile && !isPressed) {
            radius = 120;
        }

        if (d < radius) {
            let force = p5.Vector.sub(this.pos, mouse);
            force.normalize();

            let strength = map(d, 0, radius, 5, 0);

            if (isPressed) {
                // Unified "Gather & Drag" Logic
                // Always attract when pressed.
                // Negative = Attract
                force.mult(strength * -1.2);
            } else {
                // Passive Hover Repel (Disrupt)
                force.mult(strength * 0.5);
            }

            this.applyForce(force);
        }
    }

    applyForce(force) {
        this.acc.add(force);
    }

    update(globalTide) {
        // --- CASE 1: SUCCESS STATE (LINE) ---
        if (this.isSuccess) {
            // Erosion
            if (random(1) < 0.01) {
                this.isSuccess = false;
                this.pos.y = thresholdLine + random(10, 100);
                this.vel.set(random(-1, 1), random(1, 3));
            }
            return;
        }

        // --- CASE 2: NATURAL FLOW FIELD (Weighted) ---
        let n = noise(this.pos.x * 0.003, this.pos.y * 0.003, frameCount * 0.002);
        let angle = map(n, 0, 1, 0, TWO_PI * 4);

        let desired = p5.Vector.fromAngle(angle);
        desired.mult(this.maxSpeed);

        // Steering (Inertia)
        let steer = p5.Vector.sub(desired, this.vel);
        steer.limit(0.08);

        this.applyForce(steer);

        // Buoyancy
        this.applyForce(createVector(0, -0.012));

        // Physics
        this.vel.add(this.acc);
        this.vel.limit(this.maxSpeed);
        this.pos.add(this.vel);
        this.acc.mult(0);

        // EDGE RESPAWN (Rising Flow - Bottom Only)
        // Strictly enforcing Bottom Spawn
        let offScreen = (this.pos.x < -50 || this.pos.x > width + 50 || this.pos.y > height + 50 || this.pos.y < -50);

        if (offScreen) {
            this.pos.x = random(width);
            this.pos.y = height + 10; // Start below screen
            this.vel.set(random(-1, 1), random(-3, -5)); // Shoot Upward

            this.maxSpeed = random(2, 4);
            this.acc.mult(0);
        }

        // THRESHOLD
        if (this.pos.y <= thresholdLine) {
            this.isSuccess = true;
            this.successX = this.pos.x;
            this.pos.y = thresholdLine;
            this.vel.mult(0);
        }
    }

    display() {
        if (this.isSuccess) {
            // Vertical Line
            stroke(this.isRed ? CONFIG.colors.red : CONFIG.colors.black);
            strokeWeight(1);
            let jit = random(-0.5, 0.5);
            line(this.successX + jit, 0, this.successX + jit, thresholdLine);
        } else {
            // Flying Streak
            stroke(this.isRed ? CONFIG.colors.red : CONFIG.colors.black);
            strokeWeight(random(0.5, 1.5));

            let tailX = this.pos.x - this.vel.x * 2;
            let tailY = this.pos.y - this.vel.y * 2;
            line(this.pos.x, this.pos.y, tailX, tailY);
        }
    }
}
