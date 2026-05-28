import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

// ==========================================================================
// 1. GLOBAL ENGINE CONFIGURATION & CONTROLS STATE
// ==========================================================================
let scene, camera, renderer;
let particleSystem, particleGeometry;
let nodesArray = [];
let raycaster, mouse;
let currentHoveredNode = null;

let isEngineActive = true;
let discoveredNodes = new Set(); // Tracks unique node unlocks out of 50

const keys = { w: false, a: false, s: false, d: false, ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false };
const cameraVelocity = new THREE.Vector3();
const targetRotation = new THREE.Vector2(0, 0);
const currentRotation = new THREE.Vector2(0, 0);

// Tuned physics variables to stop infinite exponential speed gaps
const ACCELERATION = 0.15;
const MAX_SPEED = 2.5;
const FRICTION = 0.85;
const ROTATION_LERP_SPEED = 0.05;
const VOID_LIMIT = 500; // Increased for deeper space exploration

let audioCtx = null;
let glitchActive = false;
let glitchTimer = 0;
let recordingMode = false;

// Screen shake variables
let shakeActive = false;
let shakeIntensity = 0;
let shakeDuration = 0;
const MAX_SHAKE_INTENSITY = 0.8;
const SHAKE_DECAY = 0.9;

const PALETTE = {
    bgVoid: 0x0a050d,
    amberGlow: 0xffa522,
    neonMagenta: 0xbc267d,
    neonCyan: 0x22d5ff,
    dustColor: 0xff7711,
    anomalyGreen: 0x39ff14
};

// ==========================================================================
// 2. CURATED SYSTEM DATABASE: 10 PLANETS & 40 CULT SATELLITES (TOTAL 50)
// ==========================================================================
const ARCHIVE_DATABASE = [
    {
        title: "GeoCities_Archive", year: 1997, url: "geocities.com",
        desc: "A sprawling digital metropolis built on raw homepages, layout tables, and animated construction banners.",
        color: PALETTE.amberGlow, shape: "box", domExtrusions: { plates: 6 },
        satellites: [
            { title: "Enchanted_Forest", url: "geocities.com/EnchantedForest/", desc: "A curated ring-world of early personal mythology blogs and fantasy roleplaying web rings.", color: 0xffaa44, shape: "cone" },
            { title: "Hollywood_Sect", url: "geocities.com/Hollywood/", desc: "The ultimate 90s fan hub containing uncompressed shrines to classic television series and sci-fi movies.", color: 0xffcc33, shape: "sphere" },
            { title: "SiliconValley_0x1A", url: "geocities.com/SiliconValley/", desc: "A dense cluster dedicated to uncompiled hardware schematics and early tech manuals.", color: 0xff8833, shape: "cylinder" },
            { title: "Altavista_Index", url: "altavista.com", desc: "The primordial search index matrix used to map the outermost fringes of the early web ecosystem.", color: 0xffaa77, shape: "torus" }
        ]
    },
    {
        title: "Flash_Cathedral", year: 2002, url: "homestarrunner.com",
        desc: "A hyper-monument constructed entirely from compiled vectors and interactive structural audio tracks.",
        color: PALETTE.neonCyan, shape: "torus", domExtrusions: { plates: 8 },
        satellites: [
            { title: "StrongBad_Console", url: "homestarrunner.com/sbemail.html", desc: "An early portal processing custom narrative response frameworks within a terminal layout.", color: 0x66ffff, shape: "knot" },
            { title: "Marzipan_Audio", url: "homestarrunner.com", desc: "An audio-driven interactive comedy answering machine portal preserved in vector space.", color: 0x33ddff, shape: "sphere" },
            { title: "Newgrounds_Portal", url: "newgrounds.com", desc: "The wild west of indie vector animation, flash gaming subcultures, and stick-figure violence.", color: 0x00aaff, shape: "cone" },
            { title: "Hampster_Dance", url: "hamsterdance.com", desc: "One of the web's first viral layout anomalies. Infinite looping animated GIFs backed by a high-speed sound loop.", color: 0x99ffff, shape: "box" }
        ]
    },
    {
        title: "MySpace_Remnant", year: 2005, url: "myspace.com",
        desc: "The skeletal architectural frames of profile custom track layers and sparkling custom cursor banks.",
        color: PALETTE.neonMagenta, shape: "cylinder", domExtrusions: { plates: 5 },
        satellites: [
            { title: "Tom_Anchor_Node", url: "myspace.com", desc: "The initial identity cluster matrix that every inbound user node connected straight into.", color: 0xff44aa, shape: "box" },
            { title: "Glitch_Layouts", url: "myspace.com", desc: "Broken profile containers customized via raw unvalidated CSS injection and glitter graphics.", color: 0xff66cc, shape: "torus" },
            { title: "Yahoo_Answers", url: "answers.yahoo.com", desc: "A massive, chaotic historical ledger of bizarre human queries and community folklore.", color: 0xcc22aa, shape: "knot" },
            { title: "Digg_v3_Frontpage", url: "digg.com", desc: "The core social aggregator axis that controlled technology news flows before the great migration.", color: 0xff00ff, shape: "cylinder" }
        ]
    },
    {
        title: "Vine_Infinite_Loops", year: 2013, url: "vine.co",
        desc: "The foundational monument of short-form audio-visual compression, restricted to six looping seconds.",
        color: PALETTE.amberGlow, shape: "sphere", domExtrusions: { plates: 4 },
        satellites: [
            { title: "Loop_Server_Bucket", url: "vine.co", desc: "The raw data directory holding some of the most structurally influential video audio loops in internet history.", color: 0xffbb44, shape: "cylinder" },
            { title: "Club_Penguin_Blizzard", url: "clubpenguin.com", desc: "The defining snow-bound social chat sandbox platform for an entire generation, completely decommissioned.", color: 0xffaa00, shape: "box" },
            { title: "StumbleUpon_Engine", url: "stumbleupon.com", desc: "A legendary peer discovery gateway that hurled web-travelers into unexpected high-quality internet anomalies.", color: 0xff9900, shape: "torus" },
            { title: "Polyvore_Moodboard", url: "polyvore.com", desc: "A massive digital commerce curation node defining 2010s aesthetic movements before vanishing overnight.", color: 0xffdd66, shape: "cone" }
        ]
    },
    {
        title: "Napster_Network", year: 1999, url: "napster.com",
        desc: "The architecture that fractured global music distribution overnight, reducing audio tracks to decoupled peer-to-peer pipelines.",
        color: PALETTE.neonCyan, shape: "knot", domExtrusions: { plates: 7 },
        satellites: [
            { title: "Winamp_Skin_Factory", url: "winamp.com", desc: "The media player hub built entirely on custom pixel layouts and visualizer configurations.", color: 0x55ffff, shape: "box" },
            { title: "LimeWire_Client_0x", url: "limewire.com", desc: "The volatile, unmoderated file-sharing client known for structural malware and corrupt audio duplicates.", color: 0x00ffcc, shape: "cylinder" },
            { title: "Live365_Radio", url: "live365.com", desc: "The foundational network grid hosting the earliest wave of independent, user-generated web radio broadcasts.", color: 0x33eebb, shape: "torus" },
            { title: "Audacity_Source", url: "audacityteam.org", desc: "The pristine, open-source audio editor that democratized early podcasting and bedroom production.", color: 0x88ffff, shape: "cone" }
        ]
    },
    {
        title: "DeviantArt_Remnant", year: 2000, url: "deviantart.com",
        desc: "The massive collaborative subterranean repository for early digital painters, skin designers, and subculture art groups.",
        color: PALETTE.amberGlow, shape: "cylinder", domExtrusions: { plates: 6 },
        satellites: [
            { title: "Albino_Blacksheep", url: "albinoblacksheep.com", desc: "A legendary vector portal that birthed some of the oldest interactive flash memes and animations.", color: 0xffaa33, shape: "knot" },
            { title: "YTMND_Matrix", url: "ytmnd.com", desc: "The single-page looping audio, text, and image matrix that pioneered modern internet meme formats.", color: 0xffdd44, shape: "sphere" },
            { title: "Joe_Cartoon_Vault", url: "joecartoon.com", desc: "The absolute bedrock of crude, early-internet interactive shock animation and dark flash games.", color: 0xff9900, shape: "box" },
            { title: "Stickpage_Archive", url: "stickpage.com", desc: "A hyper-specialized gaming portal dedicated exclusively to technical stick-figure combat animations.", color: 0xeeaa55, shape: "torus" }
        ]
    },
    {
        title: "Habbo_Hotel_Core", year: 2000, url: "habbo.com",
        desc: "The iconic isometric pixel-art virtual space that defined social lounge design for millions of early internet teens.",
        color: PALETTE.neonMagenta, shape: "box", domExtrusions: { plates: 5 },
        satellites: [
            { title: "Runescape_Classic", url: "runescape.com", desc: "The original browser-based Java MMORPG sandbox environment that dominated school computer labs.", color: 0xff55bb, shape: "cylinder" },
            { title: "Gaia_Online_Nexus", url: "gaiaonline.com", desc: "A massive anime-inspired forum architecture blending conversation threads with a virtual item economy.", color: 0xff3399, shape: "cone" },
            { title: "Second_Life_Grid", url: "secondlife.com", desc: "The complex, user-generated 3D sandbox multiverse hosting real-world embassies and digital land speculation.", color: 0xee66aa, shape: "knot" },
            { title: "Neopets_Stock_Market", url: "neopets.com/stockmarket.phtml", desc: "The hyper-nuanced virtual stock system inside Neopia that taught kids advanced economic trade cycles.", color: 0xff77cc, shape: "sphere" }
        ]
    },
    {
        title: "Tumblr_Glow", year: 2007, url: "tumblr.com",
        desc: "The core aesthetic matrix of the 2010s web. A micro-blogging engine driven by recursive text reblogs and high-contrast GIFs.",
        color: PALETTE.neonCyan, shape: "sphere", domExtrusions: { plates: 6 },
        satellites: [
            { title: "Pottermore_Original", url: "pottermore.com", desc: "The interactive vector experience designed specifically to sort and gamify early 2010s fantasy groups.", color: 0x44ccff, shape: "torus" },
            { title: "DailyBooth_Snap", url: "dailybooth.com", desc: "The photo-a-day social platform that pioneered modern lifestyle logs before the smartphone app boom.", color: 0x77ddff, shape: "box" },
            { title: "Formspring_Me", url: "formspring.me", desc: "The unfiltered anonymous Q&A layout node that established interaction templates across the decade.", color: 0x0099ff, shape: "cone" },
            { title: "Is_Normal_Anomaly", url: "isnormal.com", desc: "A cult text-driven database where global users anonymously asked the web if their traits were normal.", color: 0x33bbff, shape: "cylinder" }
        ]
    },
    {
        title: "Quibi_Wasteland", year: 2020, url: "quibi.com",
        desc: "The staggering corporate tech collapse engineered for short-form mobile streaming that dissolved in under eight months.",
        color: PALETTE.amberGlow, shape: "torus", domExtrusions: { plates: 4 },
        satellites: [
            { title: "Stadia_Cloud_Station", url: "stadia.google.com", desc: "Google’s ambitious, cloud-native streaming engine designed to kill dedicated home gaming hardware.", color: 0xff9944, shape: "sphere" },
            { title: "Clubhouse_Hallway", url: "clubhouse.com", desc: "The exclusive invite-only spatial audio environment that dominated corporate tech during global lockdowns.", color: 0xffb366, shape: "knot" },
            { title: "Periscope_Stream", url: "periscope.tv", desc: "The real-time mobile broadcasting portal that pioneered live mapping before being dismantled.", color: 0xee8833, shape: "box" },
            { title: "Yahoo_Screen", url: "screen.yahoo.com", desc: "Yahoo's ill-fated premium original streaming attempt that dissolved into a massive financial sinkhole.", color: 0xffaa55, shape: "cylinder" }
        ]
    },
    {
        title: "ANOMALY_CERN_GENESIS", year: 1991, url: "info.cern.ch/hypertext/WWW/TheProject.html",
        desc: "The absolute source coordinates of the modern world wide web stack. Pure text layout documentation.",
        color: PALETTE.anomalyGreen, shape: "knot", domExtrusions: { plates: 9 }, isEasterEgg: true,
        satellites: [
            { title: "Heavens_Gate_97", url: "heavensgate.com", desc: "An eerie, untouched 1997 site operating as a completely preserved cultural time capsule.", color: 0x77ff77, shape: "sphere" },
            { title: "Yahoo_Groups_Vault", url: "groups.yahoo.com", desc: "Two decades of highly specialized human mailing lists and communal data registers, deleted in 2020.", color: 0x22cc22, shape: "box" },
            { title: "Flash_End_Of_Life", url: "adobe.com/products/flashplayer/end-of-life.html", desc: "The kill-switch terminal marker that permanently deactivated rich browser asset functionality globally.", color: 0x55ffaa, shape: "cone" },
            { title: "Google_Plus_Ghost", url: "plus.google.com", desc: "The ruins of an engineered corporate social architecture that dissolved into a silent tech ghost town.", color: 0x00ff88, shape: "cylinder" },
            { title: "Omegle_Roulette", url: "omegle.com", desc: "The raw unmoderated text and video communication network that paired random strangers across the globe.", color: 0xaaff55, shape: "torus" }
        ]
    }
];

// ==========================================================================
// 3. INITIALIZATION ENGINE RUNNER
// ==========================================================================
function init() {
    const container = document.getElementById('canvas-container');

    scene = new THREE.Scene();
    scene.background = new THREE.Color(PALETTE.bgVoid);
    scene.fog = new THREE.FogExp2(PALETTE.bgVoid, 0.012);

    camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 15, 80);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    raycaster = new THREE.Raycaster();
    raycaster.params.Line.threshold = 0.5;
    mouse = new THREE.Vector2(0, 0);

    createDataDust();
    buildArchiveNodes();
    setupSystemLights();
    buildMobileKeypad();
    setupMobilePanels(); // Added to tie the sliding drawers together
    createGlitchOverlay();

    const exploreBtn = document.getElementById('explore-btn');
    if (exploreBtn) exploreBtn.addEventListener('click', startExplorationEngine);

    const closeViewportBtn = document.getElementById('viewport-close-btn');
    if (closeViewportBtn) closeViewportBtn.addEventListener('click', terminateArchiveViewport);

    window.addEventListener('resize', onWindowResize);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('click', onNodeClick);
    window.addEventListener('touchmove', onTouchMove, { passive: false });

    window.addEventListener('keydown', (e) => {
        handleKeyToggle(e, true);
        if (e.key.toLowerCase() === 'r') toggleRecordingMode();
    });
    window.addEventListener('keyup', (e) => handleKeyToggle(e, false));

    animate();
}

function startExplorationEngine() {
    isEngineActive = true;
    initAudioEngine();
    const overlay = document.getElementById('intro-overlay');
    if (overlay) {
        overlay.style.opacity = '0';
        setTimeout(() => overlay.style.display = 'none', 500);
    }
    injectTerminalLog("[SYSTEM] DEEP DIVE ENGAGED: SOLAR ANOMALY INDEX ONLINE.");
}

// ==========================================================================
// 4. ENVIRONMENT GENERATION & SOLAR MATRIX NODES
// ==========================================================================
function createDataDust() {
    const particleCount = 1800;
    particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
        positions[i] = (Math.random() - 0.5) * 160;
        positions[i+1] = (Math.random() - 0.5) * 60;
        positions[i+2] = (Math.random() - 0.5) * 160;
        velocities[i] = (Math.random() - 0.5) * 4.0;
        velocities[i+1] = (Math.random() - 0.5) * 4.0;
        velocities[i+2] = (Math.random() - 0.5) * 4.0;
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.userData = { velocities: velocities };

    const material = new THREE.PointsMaterial({
        color: PALETTE.dustColor, size: 0.6, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending
    });

    particleSystem = new THREE.Points(particleGeometry, material);
    scene.add(particleSystem);
}

function generateCoreGeometry(shapeProfile) {
    switch(shapeProfile) {
        case "box":       return new THREE.BoxGeometry(4.5, 4.5, 4.5, 2, 2, 2);
        case "sphere":    return new THREE.SphereGeometry(3.2, 12, 10);
        case "cylinder":  return new THREE.CylinderGeometry(2.5, 2.5, 5, 10, 2, true);
        case "torus":     return new THREE.TorusGeometry(3.0, 0.9, 6, 16);
        case "cone":      return new THREE.ConeGeometry(2.8, 5.0, 10, 2, true);
        case "knot":      return new THREE.TorusKnotGeometry(2.2, 0.6, 40, 6);
        default:          return new THREE.BoxGeometry(4, 4, 4);
    }
}

function buildArchiveNodes() {
    ARCHIVE_DATABASE.forEach((siteData, index) => {
        const planetGroup = new THREE.Group();

        if (siteData.isEasterEgg) {
            planetGroup.position.set(-85, -18, -85);
        } else {
            const i = index;
            const total = ARCHIVE_DATABASE.length;
            const phi = Math.acos(-1 + (2 * i) / total);
            const theta = Math.sqrt(total * Math.PI) * phi;
            const radius = 50 + (Math.random() * 200);

            planetGroup.position.set(
                radius * Math.cos(theta) * Math.sin(phi),
                radius * Math.sin(theta) * Math.sin(phi),
                radius * Math.cos(phi)
            );
        }

        const geom = generateCoreGeometry(siteData.shape);
        const wireframeGeom = new THREE.WireframeGeometry(geom);
        const mat = new THREE.LineBasicMaterial({
            color: siteData.color, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending
        });
        const wireframe = new THREE.LineSegments(wireframeGeom, mat);
        planetGroup.add(wireframe);

        const innerWire = new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(1.4, 1));
        const innerCage = new THREE.LineSegments(innerWire, new THREE.LineBasicMaterial({
            color: 0xffffff, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending
        }));
        planetGroup.add(innerCage);

        if (siteData.domExtrusions) {
            const extrusionCount = siteData.domExtrusions.plates;
            const lineMaterial = new THREE.LineBasicMaterial({
                color: siteData.color, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending
            });
            for (let i = 0; i < extrusionCount; i++) {
                const plateMesh = new THREE.LineSegments(
                    new THREE.WireframeGeometry(new THREE.BoxGeometry(6.0, 0.12, 6.0)), lineMaterial
                );
                plateMesh.position.y = (i - extrusionCount / 2) * 1.3;
                plateMesh.rotation.y = (i * Math.PI) / 6;
                planetGroup.add(plateMesh);
            }
        }

        planetGroup.userData = {
            ...siteData, isNodeRoot: true, id: siteData.title, wireframeRef: wireframe, rotationSpeed: 0.003 + Math.random() * 0.003
        };

        if (siteData.satellites && siteData.satellites.length > 0) {
            siteData.satellites.forEach((sat, satIndex) => {
                const satelliteGroup = new THREE.Group();
                const orbitRadius = 7.5 + (satIndex * 2.8);
                const initialAngle = (satIndex / siteData.satellites.length) * Math.PI * 2;
                satelliteGroup.position.set(
                    Math.cos(initialAngle) * orbitRadius,
                    (Math.random() - 0.5) * 1.5,
                    Math.sin(initialAngle) * orbitRadius
                );

                const satGeom = generateCoreGeometry(sat.shape);
                const satWire = new THREE.LineSegments(
                    new THREE.WireframeGeometry(satGeom),
                    new THREE.LineBasicMaterial({ color: sat.color, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending })
                );
                satWire.scale.set(0.3, 0.3, 0.3);
                satelliteGroup.add(satWire);

                satelliteGroup.userData = {
                    title: sat.title, year: siteData.year, url: sat.url, desc: sat.desc,
                    isNodeRoot: true, id: sat.title, wireframeRef: satWire, rotationSpeed: 0.015,
                    isSatellite: true, orbitRadius: orbitRadius, orbitSpeed: 0.006 + (satIndex * 0.003),
                    orbitAngle: initialAngle
                };

                planetGroup.add(satelliteGroup);
                nodesArray.push(satelliteGroup);
            });
        }

        scene.add(planetGroup);
        nodesArray.push(planetGroup);
    });
}

function setupSystemLights() {
    const centerLight = new THREE.PointLight(PALETTE.neonMagenta, 3, 120);
    centerLight.position.set(0, 0, 0);
    scene.add(centerLight);

    const secondaryLight = new THREE.PointLight(PALETTE.neonCyan, 2, 120);
    secondaryLight.position.set(40, 20, 40);
    scene.add(secondaryLight);
}

// ==========================================================================
// 5. MOBILE CONSOLE INTERFACE & SLIDING SIDEBAR REGISTERS
// ==========================================================================
function buildMobileKeypad() {
    if (document.getElementById('mobile-gamepad')) return;

    const gamepadContainer = document.createElement('div');
    gamepadContainer.id = 'mobile-gamepad';

    Object.assign(gamepadContainer.style, {
        position: 'fixed',
        bottom: '25px',
        left: '25px',
        width: '130px',
        height: '130px',
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gridTemplateRows: 'repeat(3, 1fr)',
        gap: '6px',
        zIndex: '50',
        userSelect: 'none',
        webkitUserSelect: 'none'
    });

    const layout = [
        { label: '', key: null },    { label: 'W', key: 'w' }, { label: '', key: null },
        { label: 'A', key: 'a' },    { label: 'S', key: 's' }, { label: 'D', key: 'd' },
        { label: '', key: null },    { label: '', key: null }, { label: '', key: null }
    ];

    layout.forEach(btnInfo => {
        if (!btnInfo.label) {
            const blank = document.createElement('div');
            gamepadContainer.appendChild(blank);
            return;
        }

        const button = document.createElement('div');
        button.innerText = btnInfo.label;

        Object.assign(button.style, {
            backgroundColor: 'rgba(188, 38, 125, 0.25)',
            border: '1px solid #bc267d',
            color: '#22d5ff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'monospace',
            fontWeight: 'bold',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '18px',
            touchAction: 'none'
        });

        const press = (e) => { e.preventDefault(); keys[btnInfo.key] = true; button.style.backgroundColor = 'rgba(34, 213, 255, 0.5)'; };
        const release = (e) => { e.preventDefault(); keys[btnInfo.key] = false; button.style.backgroundColor = 'rgba(188, 38, 125, 0.25)'; };

        button.addEventListener('pointerdown', press);
        button.addEventListener('pointerup', release);
        button.addEventListener('pointerleave', release);

        gamepadContainer.appendChild(button);
    });

    document.body.appendChild(gamepadContainer);
}

function setupMobilePanels() {
    const leftTrigger = document.getElementById('toggle-left-panel');
    const rightTrigger = document.getElementById('toggle-right-panel');
    const diagnosticsPanel = document.getElementById('diagnostics-panel');
    const inspectorPanel = document.getElementById('inspector-panel');

    if (leftTrigger && diagnosticsPanel) {
        leftTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            diagnosticsPanel.classList.toggle('mobile-active');
            if (inspectorPanel) inspectorPanel.classList.remove('mobile-active');
        });
    }

    if (rightTrigger && inspectorPanel) {
        rightTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            inspectorPanel.classList.toggle('mobile-active');
            if (diagnosticsPanel) diagnosticsPanel.classList.remove('mobile-active');
        });
    }

    // Auto close open sliding drawers when touching the active 3D canvas
    const canvasContainer = document.getElementById('canvas-container');
    if (canvasContainer) {
        canvasContainer.addEventListener('click', () => {
            if (diagnosticsPanel) diagnosticsPanel.classList.remove('mobile-active');
            if (inspectorPanel) inspectorPanel.classList.remove('mobile-active');
        });
    }
}

// ==========================================================================
// 6. AUDIO ARCHAEOLOGY ENGINE
// ==========================================================================
function initAudioEngine() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc1 = audioCtx.createOscillator();
    const filter = audioCtx.createBiquadFilter();
    const gainNode = audioCtx.createGain();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(60, audioCtx.currentTime);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(140, audioCtx.currentTime);
    gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
    osc1.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    osc1.start();
}

function playSoundFX(type) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    const now = audioCtx.currentTime;
    if (type === 'hover') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1100, now);
        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.04);
        osc.start(now);
        osc.stop(now + 0.04);
    } else if (type === 'click') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(190, now);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
    }
}

// ==========================================================================
// 7. DEEP INTERACTIVE IFRAME OVERLAY APPLICATION MODULE
// ==========================================================================
async function fetchWaybackSnapshot(targetUrl, targetYear) {
    const timestamp = `${targetYear}0701000000`;
    const apiUrl = `https://archive.org/wayback/available?url=${encodeURIComponent(targetUrl)}&timestamp=${timestamp}`;

    injectTerminalLog(`[PING] DECRYPTING SECTOR AT DATA CHANNEL: ${targetUrl}`);

    const viewportContainer = document.getElementById('archive-viewport-container');
    const archiveIframe = document.getElementById('archive-iframe');
    const viewportTitle = document.getElementById('viewport-title');

    try {
        const response = await fetch(apiUrl);
        const data = await response.json();
        let snapshotUrl = `https://web.archive.org/web/${targetYear}/${targetUrl}`;
        if (data.archived_snapshots && data.archived_snapshots.closest) {
            snapshotUrl = data.archived_snapshots.closest.url;
        }
        if (snapshotUrl.includes('/web/')) {
            snapshotUrl = snapshotUrl.replace(/\/web\/(\d+)/, '/web/$1mp_');
        }

        injectTerminalLog(`[SUCCESS] TARGET MATRIX EMBED STABLE. DISPLAY ACTIVE.`);
        if (viewportTitle) viewportTitle.innerText = `[CONNECTED ARCHIVE] // ${targetUrl.toUpperCase()} (${targetYear})`;
        if (archiveIframe) archiveIframe.src = snapshotUrl;
        if (viewportContainer) viewportContainer.classList.remove('hidden');

        setArchiveViewActive(true);

    } catch (error) {
        console.error("Iframe integration crash:", error);
        injectTerminalLog(`[FALLBACK] USING DIRECT MATRIX EMULATION FOR: ${targetUrl}`);
        let fallbackUrl = `https://web.archive.org/web/${targetYear}mp_/${targetUrl}`;
        if (archiveIframe) archiveIframe.src = fallbackUrl;
        if (viewportContainer) viewportContainer.classList.remove('hidden');
        setArchiveViewActive(true);
    }
}

function terminateArchiveViewport() {
    playSoundFX('click');
    const viewportContainer = document.getElementById('archive-viewport-container');
    const archiveIframe = document.getElementById('archive-iframe');

    if (viewportContainer) viewportContainer.classList.add('hidden');
    if (archiveIframe) archiveIframe.src = "about:blank";

    setArchiveViewActive(false);

    injectTerminalLog(`[SYSTEM] STREAM DISCONNECTED. DRIFT ENGINE ACTIVE.`);
}

function setArchiveViewActive(active) {
    const keypad = document.getElementById('mobile-gamepad');
    const viewport = document.getElementById('archive-viewport-container');

    if (keypad) {
        if (active) {
            keypad.classList.add('hidden');
        } else {
            keypad.classList.remove('hidden');
        }
    }

    if (viewport) {
        viewport.style.zIndex = active ? '500' : '0';
    }
}

// ==========================================================================
// 8. VISUAL GLITCH OVERLAY (THE "SPARKLE" EFFECT)
// ==========================================================================
function createGlitchOverlay() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes glitch-anim {
            0%   { opacity: 0.8; transform: translate(0); }
            20%  { opacity: 1; transform: translate(-5px, 2px); }
            40%  { opacity: 0.6; transform: translate(5px, -2px); }
            60%  { opacity: 1; transform: translate(-3px, -1px); }
            80%  { opacity: 0.9; transform: translate(3px, 1px); }
            100% { opacity: 0; transform: translate(0); }
        }
        .glitch-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 9999;
            background: rgba(255, 0, 255, 0.05);
            mix-blend-mode: difference;
            animation: glitch-anim 0.5s ease-in-out;
            opacity: 0;
        }
        .glitch-overlay.active {
            opacity: 1;
            animation: glitch-anim 0.5s ease-in-out;
        }
    `;
    document.head.appendChild(style);

    const overlay = document.createElement('div');
    overlay.className = 'glitch-overlay';
    overlay.id = 'glitch-overlay';
    document.body.appendChild(overlay);
}

function triggerScreenGlitch() {
    const overlay = document.getElementById('glitch-overlay');
    if (overlay) {
        overlay.classList.add('active');
        glitchActive = true;
        glitchTimer = 6;
    }
}

function updateGlitchEffect() {
    if (glitchActive) {
        glitchTimer--;
        if (glitchTimer <= 0) {
            const overlay = document.getElementById('glitch-overlay');
            if (overlay) overlay.classList.remove('active');
            glitchActive = false;
        }
    }
}

// ==========================================================================
// 9. SCREEN SHAKE / JAR EFFECT
// ==========================================================================
function triggerCameraShake(intensity = MAX_SHAKE_INTENSITY, duration = 12) {
    shakeActive = true;
    shakeIntensity = intensity;
    shakeDuration = duration;
}

function updateCameraShake() {
    if (shakeActive && shakeDuration > 0) {
        const offsetX = (Math.random() - 0.5) * shakeIntensity;
        const offsetY = (Math.random() - 0.5) * shakeIntensity;
        const offsetZ = (Math.random() - 0.5) * shakeIntensity;
        camera.position.x += offsetX;
        camera.position.y += offsetY;
        camera.position.z += offsetZ;

        shakeDuration--;
        shakeIntensity *= SHAKE_DECAY;

        if (shakeDuration <= 0) {
            shakeActive = false;
            shakeIntensity = 0;
        }
    }
}

// ==========================================================================
// 10. NAVIGATION PHYSICS & COLLISION WRAPPERS
// ==========================================================================
function handleKeyToggle(event, isPressed) {
    const key = event.key.toLowerCase();
    if (key in keys) keys[key] = isPressed;
}

function onMouseMove(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    targetRotation.x = -mouse.x * 0.4;
    targetRotation.y = mouse.y * 0.3;
}

function onTouchMove(event) {
    if (event.touches.length === 1) {
        const touch = event.touches[0];
        mouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;
        targetRotation.x = -mouse.x * 0.6;
        targetRotation.y = mouse.y * 0.4;
    }
}

function updateFlightPhysics() {
    if (!isEngineActive) return;

    currentRotation.x = THREE.MathUtils.lerp(currentRotation.x, targetRotation.x, ROTATION_LERP_SPEED);
    currentRotation.y = THREE.MathUtils.lerp(currentRotation.y, targetRotation.y, ROTATION_LERP_SPEED);
    camera.rotation.y = currentRotation.x;
    camera.rotation.x = currentRotation.y;

    const forwardVector = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const sideVector = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    const moveDirection = new THREE.Vector3();

    if (keys.w || keys.ArrowUp) moveDirection.add(forwardVector);
    if (keys.s || keys.ArrowDown) moveDirection.add(forwardVector.clone().negate());
    if (keys.a || keys.ArrowLeft) moveDirection.add(sideVector.clone().negate());
    if (keys.d || keys.ArrowRight) moveDirection.add(sideVector);

    if (moveDirection.lengthSq() > 0) {
        moveDirection.normalize();
        cameraVelocity.addScaledVector(moveDirection, ACCELERATION);
    }

    cameraVelocity.clampLength(0, MAX_SPEED);
    camera.position.add(cameraVelocity);
    cameraVelocity.multiplyScalar(FRICTION);

    if (Math.abs(camera.position.x) > VOID_LIMIT || Math.abs(camera.position.z) > VOID_LIMIT || Math.abs(camera.position.y) > VOID_LIMIT) {
        camera.position.set(0, 15, 80);
        cameraVelocity.set(0, 0, 0);
        triggerScreenGlitch();
        triggerCameraShake();
    }
}

function toggleRecordingMode() {
    recordingMode = !recordingMode;
    const pad = document.getElementById('mobile-gamepad');
    if (pad) pad.style.display = recordingMode ? 'none' : 'grid';
    document.querySelectorAll('.hud-sidebar, .hud-header, .hud-footer, #mobile-hud-triggers').forEach(p => p.style.visibility = recordingMode ? 'hidden' : 'visible');
}

function findParentNodeRoot(obj) {
    if (!obj) return null;
    if (obj.userData && obj.userData.isNodeRoot) return obj;
    return findParentNodeRoot(obj.parent);
}

function onNodeClick() {
    if (!isEngineActive || !currentHoveredNode) return;
    const data = currentHoveredNode.userData;

    playSoundFX('click');
    triggerScreenGlitch();
    triggerCameraShake();

    discoveredNodes.add(data.id);
    const counterDisplay = document.getElementById('harvest-count');
    if (counterDisplay) {
        const formattedScore = String(discoveredNodes.size).padStart(2, '0');
        counterDisplay.innerText = `${formattedScore}/50`;
    }

    if (!recordingMode) {
        const inspectorPlaceholder = document.querySelector('.placeholder-text');
        const siteDetails = document.getElementById('site-details');
        if (inspectorPlaceholder) inspectorPlaceholder.classList.add('hidden');
        if (siteDetails) siteDetails.classList.remove('hidden');

        document.getElementById('site-title').innerText = data.title.toUpperCase();
        document.getElementById('site-year').innerText = data.year;
        document.getElementById('site-desc').innerText = data.desc;

        const extractBtn = document.getElementById('extract-btn');
        if (extractBtn) {
            const newExtractBtn = extractBtn.cloneNode(true);
            extractBtn.parentNode.replaceChild(newExtractBtn, extractBtn);
            newExtractBtn.addEventListener('click', () => {
                fetchWaybackSnapshot(data.url, data.year);
            });
        }

        // On smaller screens, auto slide out the Inspector panel so the user sees the data
        if (window.innerWidth <= 768) {
            const inspectorPanel = document.getElementById('inspector-panel');
            if (inspectorPanel) inspectorPanel.classList.add('mobile-active');
        }
    }

    injectTerminalLog(`[DECRYPTED] CORE_REMNANT // ${data.title}`);
}

function injectTerminalLog(message) {
    if (recordingMode) return;
    const stream = document.getElementById('data-stream');
    if (!stream) return;
    const logLine = document.createElement('div');
    logLine.innerText = `> ${message}`;
    stream.appendChild(logLine);
    stream.parentElement.scrollTop = stream.parentElement.scrollHeight;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// ==========================================================================
// 11. ANIMATION TIMELINE LOOP & SYSTEM DRIFT ROTATION
// ==========================================================================
function animate() {
    requestAnimationFrame(animate);

    const currentTime = performance.now();
    const time = currentTime * 0.001;

    updateFlightPhysics();
    updateGlitchEffect();
    updateCameraShake();

    if (particleSystem && particleGeometry) {
        const positions = particleGeometry.attributes.position.array;
        const velocities = particleGeometry.userData.velocities;
        for (let i = 0; i < positions.length; i += 3) {
            const waveX = Math.sin(time + positions[i+2] * 0.05) * 0.04;
            const waveY = Math.cos(time + positions[i] * 0.05) * 0.03;
            const waveZ = Math.sin(time + positions[i+1] * 0.05) * 0.04;
            velocities[i]   = THREE.MathUtils.lerp(velocities[i], waveX * 6.0, 0.02);
            velocities[i+1] = THREE.MathUtils.lerp(velocities[i+1], waveY * 4.0, 0.02);
            velocities[i+2] = THREE.MathUtils.lerp(velocities[i+2], waveZ * 6.0, 0.02);
            positions[i]   += velocities[i];
            positions[i+1] += velocities[i+1];
            positions[i+2] += velocities[i+2];
        }
        particleGeometry.attributes.position.needsUpdate = true;
    }

    nodesArray.forEach(node => {
        if (node.userData.isSatellite) {
            node.userData.orbitAngle += node.userData.orbitSpeed;
            node.position.x = Math.cos(node.userData.orbitAngle) * node.userData.orbitRadius;
            node.position.z = Math.sin(node.userData.orbitAngle) * node.userData.orbitRadius;
        }
        node.rotation.y += node.userData.rotationSpeed || 0.005;
    });

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);
    let foundHoverTarget = null;
    if (intersects.length > 0) {
        const root = findParentNodeRoot(intersects[0].object);
        if (root) foundHoverTarget = root;
    }

    if (foundHoverTarget !== currentHoveredNode) {
        if (currentHoveredNode && currentHoveredNode.userData.wireframeRef) {
            currentHoveredNode.userData.wireframeRef.material.opacity = currentHoveredNode.userData.isSatellite ? 0.5 : 0.4;
        }
        currentHoveredNode = foundHoverTarget;
        if (currentHoveredNode && currentHoveredNode.userData.wireframeRef) {
            playSoundFX('hover');
            currentHoveredNode.userData.wireframeRef.material.opacity = 1.0;
        }
    }

    renderer.render(scene, camera);
}

// Initialize the program on load
window.addEventListener('DOMContentLoaded', init);