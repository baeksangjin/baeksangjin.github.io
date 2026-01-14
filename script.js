document.addEventListener('DOMContentLoaded', () => {
    initPortfolio();
    initSlider();
    initMobileMenu();
    initAudio();
    // Wait slightly for DOM populating, but initPortfolio is async. 
    // We'll call magnetic init inside initPortfolio or via mutation observer.
    // simpler: handled via delegated events or attached in initPortfolio loop.
    // Let's stick to attaching logic after elements exist.
});

// --- Audio Logic ---
let globalAudioCtx;
function initAudio() {
    globalAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    document.body.addEventListener('click', (e) => {
        if (globalAudioCtx.state === 'suspended') { globalAudioCtx.resume(); }
        if (e.target.closest('a') || e.target.closest('.logo-btn') || e.target.closest('#hamburger-btn') || e.target.closest('#mobile-close-btn')) {
            playClickSound();
        }
    });
}
function playClickSound() {
    if (!globalAudioCtx || globalAudioCtx.state !== 'running') return;
    const t = globalAudioCtx.currentTime;
    let osc = globalAudioCtx.createOscillator();
    let gain = globalAudioCtx.createGain();
    let filter = globalAudioCtx.createBiquadFilter();
    osc.type = 'triangle'; let baseFreq = 5000; let decayTime = 0.008; let volume = 0.05;
    filter.type = 'highpass'; filter.frequency.setValueAtTime(4000, t);
    osc.frequency.setValueAtTime(baseFreq, t);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(volume, t + 0.001);
    gain.gain.linearRampToValueAtTime(0, t + decayTime);
    osc.connect(filter); filter.connect(gain); gain.connect(globalAudioCtx.destination);
    osc.start(t); osc.stop(t + decayTime + 0.02);
}

// --- Portfolio Logic ---
async function initPortfolio() {
    const listContainer = document.getElementById('works-list');
    const viewer = document.getElementById('art-viewer');
    let firstLoaded = false;

    // --- Initialize Static Elements Immediately ---
    const goIntro = document.getElementById('go-intro');
    const goBack = document.getElementById('go-back');

    // Apply Magnetic to Static Buttons
    if (window.matchMedia("(hover: hover)").matches) {
        applyMagneticEffect(goIntro);
        applyMagneticEffect(goBack);
    }

    // Scramble Static Logo (Start immediately with menu loop)
    // 2x slower than others (speed 0.5)
    scrambleText(goIntro, "B A E K", 0, 0.5);
    // ---------------------------------------------

    let foundCount = 0; // For gap-tolerant stagger logic

    // Scan for files from 40 down to 1
    for (let i = 40; i >= 1; i--) {
        const idxStr = i.toString().padStart(2, '0');
        const filename = `works/works_${idxStr}/index.html?v=${new Date().getTime()}`;
        try {
            const response = await fetch(filename, { method: 'HEAD' });
            if (!response.ok) continue;

            const textResponse = await fetch(filename);
            const text = await textResponse.text();

            const titleMatch = text.match(/<title>(.*?)<\/title>/i);
            const title = titleMatch ? titleMatch[1] : `Work ${idxStr}`;

            const li = document.createElement('li');
            const link = document.createElement('a');
            link.textContent = title;
            // Initial state empty for scrambling
            link.textContent = "";
            link.href = "#";

            // Interaction: Open Work
            link.addEventListener('click', (e) => {
                e.preventDefault();
                viewer.src = filename;
                document.querySelectorAll('#works-list a').forEach(a => a.classList.remove('active'));
                link.classList.add('active');
                document.getElementById('main-nav').classList.remove('open');
            });

            // Interaction: Magnetic Effect (PC Only)
            if (window.matchMedia("(hover: hover)").matches) {
                applyMagneticEffect(link);
            }

            // Scramble Entrance
            // Use foundCount to ensure first VISIBLE item starts at 0ms delay
            const delay = foundCount * 50;
            scrambleText(link, title, delay);

            // Sync Logo with First Item
            if (foundCount === 0) {
                scrambleText(goIntro, "B A E K", 0, 0.5); // Ensure slow speed here too if re-triggered
            }

            // Animation Delay (Stagger)
            li.style.animationDelay = `${0.3 + (foundCount * 0.04)}s`;

            li.appendChild(link);
            listContainer.appendChild(li);

            foundCount++;

            if (!firstLoaded) {
                viewer.src = filename;
                link.classList.add('active');
                firstLoaded = true;
            }

        } catch (e) { continue; }
    }

    // Fetches complete
}

function applyMagneticEffect(element) {
    if (!element) return;

    element.addEventListener('mousemove', (e) => {
        const rect = element.getBoundingClientRect();
        // Calculate distance from center
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        // Mouse position relative to center
        const deltaX = e.clientX - centerX;
        const deltaY = e.clientY - centerY;

        // Intensity of attraction (0.3 means moving 30% of stored distance)
        const intensity = 0.4;

        const x = deltaX * intensity;
        const y = deltaY * intensity;

        // Apply transform directly for low latency
        element.style.transform = `translate(${x}px, ${y}px)`;
        element.style.transition = 'transform 0.2s ease-out'; // Smooth follow
        element.style.display = 'inline-block'; // Ensure it can transform
    });

    element.addEventListener('mouseleave', () => {
        // Snap back with springy transition
        element.style.transition = 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        element.style.transform = `translate(0px, 0px)`;
    });
}

function initSlider() {
    const slider = document.getElementById('app-slider');
    const goIntro = document.getElementById('go-intro');
    const goBack = document.getElementById('go-back');
    goIntro.addEventListener('click', () => { slider.style.transform = 'translateX(-100vw)'; });
    goBack.addEventListener('click', () => { slider.style.transform = 'translateX(0)'; });
}

function initMobileMenu() {
    const hamburger = document.getElementById('hamburger-btn');
    const nav = document.getElementById('main-nav');
    const closeBtn = document.getElementById('mobile-close-btn');
    hamburger.addEventListener('click', () => {
        nav.classList.add('open');
        // Re-scramble close button when opening
        scrambleText(closeBtn, "C L O S E", 200);
    });

    closeBtn.addEventListener('click', () => {
        nav.classList.remove('open');
    });

    // Linked Scrolling: Iframe -> Nav
    const viewer = document.getElementById('art-viewer');
    viewer.addEventListener('load', () => {
        try {
            const iframeDoc = viewer.contentDocument || viewer.contentWindow.document;
            const nav = document.getElementById('main-nav');

            // Listen for wheel events inside iframe
            iframeDoc.addEventListener('wheel', (e) => {
                const scrollable = iframeDoc.scrollingElement || iframeDoc.body;

                // Check edge states (allowing 2px buffer)
                const isBottom = (scrollable.scrollHeight - scrollable.scrollTop) <= (scrollable.clientHeight + 2);
                const isTop = scrollable.scrollTop <= 0;

                // Condition 1: At Bottom AND Scrolling Down
                // Condition 2: At Top AND Scrolling Up
                if ((isBottom && e.deltaY > 0) || (isTop && e.deltaY < 0)) {
                    // Forward scroll to our nav
                    nav.scrollTop += e.deltaY;

                    // Prevent default to stop iframe "bounce" and prioritize nav scroll
                    e.preventDefault();
                }
            }, { passive: false });
        } catch (err) {
            // Cross-origin restriction might block this if not same domain
            console.log("Linked scrolling unavailable (Cross-Origin)");
        }
    });
}


// --- Scramble Text Effect ---
function scrambleText(element, finalString, delay, speed = 1) {
    if (!element) return;

    setTimeout(() => {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

        // Create set of indices to reveal in random order
        let indices = [];
        for (let i = 0; i < finalString.length; i++) {
            if (finalString[i] !== " ") indices.push(i);
        }
        // Shuffle indices
        indices.sort(() => Math.random() - 0.5);

        let iterations = 0;

        // Ensure element is visible/layout ready
        element.style.opacity = 1;

        const interval = setInterval(() => {
            const revealedCount = Math.floor(iterations);
            const revealedSet = new Set(indices.slice(0, revealedCount));

            element.textContent = finalString
                .split("")
                .map((letter, index) => {
                    if (letter === " ") return " ";

                    if (revealedSet.has(index)) {
                        return finalString[index];
                    }
                    // Random char
                    return chars[Math.floor(Math.random() * chars.length)];
                })
                .join("");

            if (revealedCount >= indices.length) {
                clearInterval(interval);
                element.textContent = finalString;
            }

            iterations += 0.35 * speed; // Faster resolution (shorter duration)
        }, 60); // 60ms interval (2x slower tick)
    }, delay);
}
