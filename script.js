document.addEventListener('DOMContentLoaded', () => {
    initPortfolio();
    initSlider();
    initMobileMenu();
    initIntroScroll();
    initAudio();
    // initLiveTimer(); // Removed per user request
});

function initIntroScroll() {
    const scrollContainer = document.getElementById('intro-scroll-content');
    const introTitle = document.getElementById('huge-title');

    if (!scrollContainer || !introTitle) return;

    // Reset Metrics on Resize/Load
    const resetMetrics = () => { delete introTitle.dataset.baseHeight; };
    window.addEventListener('resize', resetMetrics);
    setTimeout(resetMetrics, 500);

    // --- Momentum Scrolling Variables ---
    let targetScroll = 0;
    let currentScroll = 0;
    let isAnimating = false;
    let lastScrollTop = 0;
    let hasAutoRevealed = false;

    // 1. Capture Target Scroll (Input)
    scrollContainer.addEventListener('scroll', () => {
        targetScroll = scrollContainer.scrollTop;

        // Scroll Trigger Logic for Auto Reveal
        const viewportH = window.innerHeight;
        const isMobile = window.innerWidth <= 768;
        const scrollRatio = isMobile ? 0.6 : 0.4;
        const animDuration = viewportH * scrollRatio; // End of Shrink

        const isScrollingDown = targetScroll > lastScrollTop;
        lastScrollTop = targetScroll;

        // Trigger when BAEK shrink is nearly done (95%)
        if (isScrollingDown && targetScroll >= animDuration * 0.95 && !hasAutoRevealed) {
            hasAutoRevealed = true;

            // Calculate Target: Where About Section fully covers or tops up
            // About starts at: Visual(100vh) + Spacer(animDuration) relative to flow
            // But visually, we want it to scroll into view.
            // Target Scroll Position = Height of Visual + Spacer
            // This brings the top of About Section to the top of the viewport.
            // However, sticky header might cover it? About is z-index 10.
            const revealTarget = viewportH + animDuration;

            // Smooth Scroll to Reveal
            scrollContainer.scrollTo({
                top: revealTarget,
                behavior: 'smooth'
            });
        }

        // Reset trigger if scrolled back up significantly
        if (targetScroll < animDuration * 0.5) {
            hasAutoRevealed = false;
        }

        if (!isAnimating) {
            isAnimating = true;
            requestAnimationFrame(animateIntro);
        }
    }, { passive: true });


    // 2. Animation Loop (Lerp + Logic)
    function animateIntro() {
        // Lerp factor: 0.1 (Lazy) to 0.2 (Responsive)
        // A lower value (0.08) creates a "heavy/luxurious" feel
        const lerpFactor = 0.05;

        // Interpolate
        currentScroll += (targetScroll - currentScroll) * lerpFactor;

        // Stop loop if close enough (Precision 0.5px)
        if (Math.abs(targetScroll - currentScroll) < 0.5) {
            currentScroll = targetScroll; // Snap to finish
            isAnimating = targetScroll > 0; // If unscrolled, stop completely. Else keep drift check? 
            // Better: just stop.
            if (Math.abs(targetScroll - currentScroll) < 0.1) isAnimating = false;
        }

        // Loop safety: Always keep running if still far
        if (Math.abs(targetScroll - currentScroll) >= 0.1) {
            requestAnimationFrame(animateIntro);
        } else {
            isAnimating = false;
        }


        // --- Use currentScroll for Calculation ---
        const viewportH = window.innerHeight;

        // Timeline: 40% (PC) vs 60% (Mobile) of Viewport
        // Must match CSS #intro-spacer height
        const isMobile = window.innerWidth <= 768;
        const scrollRatio = isMobile ? 0.6 : 0.4;
        const animDuration = viewportH * scrollRatio;

        let progress = Math.min(Math.max(currentScroll / animDuration, 0), 1);

        // Raised Cosine for ultra-smooth 0 -> 1 -> 0 transition
        // progress 0 -> wave 0 (start)
        // progress 0.5 -> wave 1 (peak)
        // progress 1 -> wave 0 (end)
        const wave = (1 - Math.cos(progress * Math.PI * 2)) / 2;

        // Determine phase for lift trick
        let phase = progress <= 0.5 ? 'stretch' : 'shrink';

        // Dynamic Max Scale Calculation
        if (!introTitle.dataset.baseHeight) {
            introTitle.style.transform = 'scaleY(1)';
            introTitle.dataset.baseHeight = introTitle.offsetHeight;
        }

        const baseH = parseFloat(introTitle.dataset.baseHeight) || 100;

        // Dynamic Top Gap Calculation
        // PC: Header(35) + Button(~30) + Gap(80) = 145 (Increased by 20px)
        // Mobile: Header(20) + Button(~30) + Gap(60) = 110 (Increased by 20px)
        const topGap = isMobile ? 110 : 145;
        const targetH = viewportH - topGap;

        const maxScale = Math.max(targetH / baseH, 1);

        // Use smooth wave directly
        const currentScale = 1 + ((maxScale - 1) * wave);

        if (phase === 'shrink') {
            // Lift Trick: Stick to Top while shrinking
            const lift = baseH * (maxScale - currentScale);
            introTitle.style.transform = `translateY(-${lift}px) scaleY(${currentScale})`;
        } else {
            introTitle.style.transform = `scaleY(${currentScale})`;
        }
    }
}

// --- Live Timer Logic ---
/* Live Timer Logic Removed */

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
    // VISUAL DEBUGGER
    const debugDiv = document.createElement('div');
    debugDiv.id = 'debug-log';
    Object.assign(debugDiv.style, {
        position: 'fixed', top: '0', left: '0', zIndex: '9999',
        background: 'rgba(0,0,0,0.85)', color: '#0f0', padding: '10px',
        fontFamily: 'monospace', fontSize: '12px', maxWidth: '300px',
        maxHeight: '50vh', overflowY: 'auto', pointerEvents: 'none'
    });
    // Uncomment to see debug log on screen
    // Uncomment to see debug log on screen
    // document.body.appendChild(debugDiv);

    function log(msg) {
        const line = document.createElement('div');
        line.textContent = `> ${msg}`;
        debugDiv.appendChild(line);
    }

    log("Init Portfolio...");

    const listContainer = document.getElementById('works-list');
    const viewer = document.getElementById('art-viewer');
    let firstLoaded = false;

    // --- Initialize Static Elements Immediately ---
    const goIntro = document.getElementById('go-intro');
    const goBack = document.getElementById('go-back');

    // --- Initial Load Animation ---
    if (viewer) {
        viewer.style.opacity = '0'; // Hide initially
        showLoader(); // Start Loader
    }

    // Apply Magnetic to Static Buttons
    if (window.matchMedia("(hover: hover)").matches) {
        applyMagneticEffect(goIntro);
        applyMagneticEffect(goBack);
    }

    // Scramble Static Logo
    scrambleText(goIntro, "B A E K", 0, 0.5);

    let foundCount = 0;

    // --- Optimized Parallel Loading ---
    log("Scanning 40 slots...");
    const checks = Array.from({ length: 40 }, (_, i) => {
        const index = 40 - i;
        const idxStr = index.toString().padStart(2, '0');
        const filename = `works/works_${idxStr}/index.html?v=${new Date().getTime()}`;

        return fetch(filename, { method: 'GET' })
            .then(res => res.ok ? { index, filename, exists: true } : { index, exists: false })
            .catch((e) => {
                // log(`Error checking ${index}: ${e}`);
                return { index, exists: false };
            });
    });

    const results = await Promise.all(checks);
    log("Scan complete.");

    // DEBUG: Force works_03
    const hasWork3 = results.some(r => r.index === 3 && r.exists);
    if (!hasWork3) {
        log("Forcing Works 03 inject...");
        results.push({ index: 3, filename: 'works/works_03/index.html', exists: true });
    } else {
        log("Works 03 was found normally.");
    }

    const validWorks = results.filter(r => r.exists).sort((a, b) => b.index - a.index);
    log(`Valid works found: ${validWorks.length}`);

    // 3. Process valid works
    for (const work of validWorks) {
        try {
            log(`Loading meta for #${work.index}...`);
            const textResponse = await fetch(work.filename);
            const text = await textResponse.text();

            const titleMatch = text.match(/<title>(.*?)<\/title>/i);
            const title = titleMatch ? titleMatch[1] : `Work ${work.index.toString().padStart(2, '0')}`;
            log(`  -> Title: ${title}`);

            const li = document.createElement('li');
            const link = document.createElement('a');

            // Initial state empty for scrambling
            link.textContent = "";
            link.href = "#";

            // Interaction: Open Work
            link.addEventListener('click', (e) => {
                e.preventDefault();
                viewer.style.opacity = '0';
                showLoader();
                viewer.src = work.filename;
                document.querySelectorAll('#works-list a').forEach(a => a.classList.remove('active'));
                link.classList.add('active');
                document.getElementById('main-nav').classList.remove('open');
            });

            if (window.matchMedia("(hover: hover)").matches) {
                applyMagneticEffect(link);
            }

            const delay = foundCount * 50;
            scrambleText(link, title, delay);

            if (foundCount === 0) {
                scrambleText(goIntro, "B A E K", 0, 0.5);
            }

            li.style.animationDelay = `${0.3 + (foundCount * 0.04)}s`;

            li.appendChild(link);
            listContainer.appendChild(li);

            // Auto-load Title Logic (Load first available)
            if (!firstLoaded) {
                log(`  -> Auto-loading #${work.index}`);
                viewer.src = work.filename;
                link.classList.add('active');
                firstLoaded = true;
            }

            foundCount++;
        } catch (e) {
            log(`ERROR loading #${work.index}: ${e.message}`);
            console.error(e);
        }
    }
    log("All Done.");

    // Failsafe: Ensure loader lifts even if iframe blocks
    setTimeout(() => {
        hideLoader();
    }, 1000);
}

// --- Global Loader Logic ---
let loaderTimeout;
let loadStartTime = 0;

function showLoader() {
    const loader = document.getElementById('global-loader');
    const progress = document.getElementById('loader-progress');
    if (!loader || !progress) return;

    loadStartTime = Date.now(); // Record Start

    // Reset
    clearTimeout(loaderTimeout);
    loader.style.display = 'block'; // Instant "Tick" On
    progress.style.width = '0%';
    progress.style.transition = 'width 0s';

    // Fake Progress (Test 5s)
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            progress.style.width = '10%';
            progress.style.transition = 'width 0.3s ease-out';

            loaderTimeout = setTimeout(() => {
                // Normal Speed (2s to 85%) - Responsive feel
                progress.style.transition = 'width 2s cubic-bezier(0.22, 1, 0.36, 1)';
                progress.style.width = '85%';
            }, 100);
        });
    });
}

function hideLoader() {
    const loader = document.getElementById('global-loader');
    const progress = document.getElementById('loader-progress');
    if (!loader || !progress) return;

    // Complete Progress
    progress.style.transition = 'width 0.1s ease-out';
    progress.style.width = '100%';

    // Instant "Tick" Off after minimal delay to register 100%
    setTimeout(() => {
        loader.style.display = 'none';
        progress.style.width = '0%';

        // REVEAL CONTENT: Sequential appear after loader is gone (0.2s delay)
        setTimeout(() => {
            const viewer = document.getElementById('art-viewer');
            if (viewer) viewer.style.opacity = '1';
        }, 200);

    }, 100);
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
    const viewer = document.getElementById('art-viewer');

    // Select Intro Header to toggle visibility (Fixes overlap)
    const introHeader = document.querySelector('#intro-screen .screen-header');
    if (introHeader) {
        introHeader.style.opacity = '0';
        introHeader.style.pointerEvents = 'none';
        introHeader.style.transition = 'opacity 0.3s';
    }

    function toggleIframeAudio(shouldPlay) {
        if (viewer && viewer.contentWindow) {
            viewer.contentWindow.postMessage(shouldPlay ? 'UNMUTE' : 'MUTE', '*');
        }
    }


    goIntro.addEventListener('click', () => {
        slider.style.transform = 'translateX(-100vw)';
        toggleIframeAudio(false); // Mute
        if (introHeader) {
            introHeader.style.opacity = '1';
            introHeader.style.pointerEvents = 'auto';
        }
    });

    goBack.addEventListener('click', () => {
        slider.style.transform = 'translateX(0)';
        toggleIframeAudio(true); // Unmute
        if (introHeader) {
            introHeader.style.opacity = '0';
            introHeader.style.pointerEvents = 'none';
        }
    });
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

    // Linked Scrolling & Loader Trigger via Iframe
    const viewer = document.getElementById('art-viewer');

    // Hide Loader when Iframe loads (Real Event)
    viewer.addEventListener('load', () => {
        const elapsed = Date.now() - loadStartTime;
        const minLoadTime = 300; // Minimum 0.3s visible
        const remaining = Math.max(0, minLoadTime - elapsed);

        setTimeout(() => {
            hideLoader();
        }, remaining);

        try {
            const iframeDoc = viewer.contentDocument || viewer.contentWindow.document;
            const nav = document.getElementById('main-nav');

            // Listen for wheel events inside iframe
            iframeDoc.addEventListener('wheel', (e) => {
                const scrollable = iframeDoc.scrollingElement || iframeDoc.body;
                const isBottom = (scrollable.scrollHeight - scrollable.scrollTop) <= (scrollable.clientHeight + 2);
                const isTop = scrollable.scrollTop <= 0;
                if ((isBottom && e.deltaY > 0) || (isTop && e.deltaY < 0)) {
                    nav.scrollTop += e.deltaY;
                    e.preventDefault();
                }
            }, { passive: false });
        } catch (err) { }
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
