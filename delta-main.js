// ==========================================
// DELTA UI MAIN v2.1.0
// Core UI modification system for Hordes.io
// ==========================================

(function() {
    "use strict";

    // ==========================================
    // GUARD: Prevent double initialization
    // ==========================================
    if (window.DeltaUI) {
        console.warn("[DeltaUI] Already initialized");
        return;
    }

    // ==========================================
    // CONSTANTS
    // ==========================================
    
    const MODULE_NAME = "DeltaUI";
    const MODULE_VERSION = "2.1.0";
    
    // Dependency wait settings
    const DEP_MAX_WAIT = 10000;      // 10 seconds max wait
    const DEP_CHECK_INTERVAL = 50;   // Check every 50ms
    
    // Update loop frame counts
    const FRAMES = {
        CC_UPDATE: 30,          // Every 30 frames (~500ms at 60fps)
        TIME_UPDATE: 60,        // Every 60 frames (~1s at 60fps)
        SLOW_SCAN: 120          // Every 120 frames (~2s at 60fps)
    };

    // CSS class names used by the module
    const CSS_CLASSES = {
        ITEM_RECOLOR: "delta-item-recolor",
        CHARM_COLORS: "delta-charm-colors",
        FPS_MODE: "delta-fps-mode",
        FPS_HIDE: "delta-fps-hide"
    };

    // Data attributes
    const DATA_ATTRS = {
        PET: "pet",
        CHARM: "charm",
        PREMIUM_BOX: "premiumBox",
        COLOR_APPLIED: "colorApplied",
        REPLACED: "replaced",
        ORIGINAL_SRC: "originalSrc",
        FULLY_COLORED: "fullyColored"
    };

    // ==========================================
    // CRITICAL CSS
    // ==========================================
    
    const CRITICAL_CSS = `
        /* Hide default exp bar */
        #expbar { display: none !important; }
        
        /* Slot positioning for overlays */
        .slot.filled { 
            position: relative !important; 
            overflow: visible !important; 
        }
        
        /* Session stats container */
        #sessionStatsContainer { 
            position: fixed; 
            bottom: 10px; 
            right: 10px; 
            z-index: 9999; 
            pointer-events: none; 
        }
        
        .stat-box { 
            background: rgba(0, 0, 0, 0.5); 
            padding: 4px 8px; 
            margin-bottom: 5px; 
            border-radius: 6px; 
            color: white; 
            display: flex; 
            align-items: center; 
            gap: 4px; 
        }
        
        .stat-box .fame-icon { 
            width: 14px; 
            height: 14px; 
        }
        
        /* Settings window positioning */
        #delta-settings-window { 
            position: fixed !important; 
            top: 50% !important; 
            left: 50% !important; 
            transform: translate(-50%, -50%) !important; 
            z-index: 99999 !important; 
        }
        
        /* CC indicator overlay */
        .cc-hp-border-overlay { 
            position: absolute; 
            inset: 0; 
            border-radius: 4px; 
            pointer-events: none; 
            z-index: 10; 
            display: none; 
            box-sizing: border-box; 
            box-shadow: inset 0 0 0 6px red; 
        }
        
        /* FPS mode hiding */
        body.delta-fps-mode .delta-fps-hide { 
            display: none !important; 
        }
        
        /* Item recolor - Default purple state */
        body:not(.delta-item-recolor) .border.purp { 
            border-color: #9E3BF9 !important; 
            box-shadow: 0 0 6px rgba(158, 59, 249, 0.5) !important; 
        }
        
        body:not(.delta-item-recolor) .border.purp:hover { 
            box-shadow: 0 0 12px rgba(158, 59, 249, 0.7) !important; 
        }
        
        /* Item recolor - Orange legendary state */
        body.delta-item-recolor .border.purp:not([data-premium-box="true"]):not([data-charm="true"]):not([data-pet="true"]) { 
            border: 3px solid #ff7600 !important; 
            box-shadow: 0 0 6px #ff7600 !important; 
        }
        
        body.delta-item-recolor .border.purp:not([data-premium-box="true"]):not([data-charm="true"]):not([data-pet="true"]):hover { 
            box-shadow: 0 0 12px #ff7600, 0 0 20px rgba(255, 118, 0, 0.3) !important; 
        }
        
        /* Charm colors - Default state */
        body:not(.delta-charm-colors) .slot.filled[data-charm="true"], 
        body:not(.delta-charm-colors) .slot.filled[data-pet="true"] { 
            border-color: #9E3BF9 !important; 
            box-shadow: 0 0 6px rgba(158, 59, 249, 0.5) !important; 
        }
        
        body:not(.delta-charm-colors) .slot.filled[data-charm="true"]:hover, 
        body:not(.delta-charm-colors) .slot.filled[data-pet="true"]:hover { 
            box-shadow: 0 0 12px rgba(158, 59, 249, 0.7) !important; 
        }
        
        /* Premium box effects */
        .premium-crown { 
            position: absolute; 
            top: -8px; 
            left: 50%; 
            transform: translateX(-50%); 
            width: 16px; 
            height: 16px; 
            background: url('/data/ui/icons/crown.svg') center/contain no-repeat; 
            filter: drop-shadow(0 0 4px gold); 
            z-index: 20; 
        }
        
        .premium-sparkles { 
            position: absolute; 
            inset: 0; 
            pointer-events: none; 
            z-index: 15; 
        }
        
        .premium-sparkle { 
            position: absolute; 
            width: 4px; 
            height: 4px; 
            background: gold; 
            border-radius: 50%; 
            animation: sparkle 1.5s ease-in-out infinite; 
        }
        
        .sparkle-0 { top: 10%; left: 10%; animation-delay: 0s; }
        .sparkle-1 { top: 10%; right: 10%; animation-delay: 0.4s; }
        .sparkle-2 { bottom: 10%; left: 10%; animation-delay: 0.8s; }
        .sparkle-3 { bottom: 10%; right: 10%; animation-delay: 1.2s; }
        
        @keyframes sparkle { 
            0%, 100% { opacity: 0; transform: scale(0); } 
            50% { opacity: 1; transform: scale(1); } 
        }
        
        /* Delta button in toolbar */
        #sysdelta { position: relative; }
        
        #sysdelta .delta-icon { 
            font-size: 16px; 
            font-weight: bold; 
            color: #F5C247; 
        }
        
        #sysdelta:hover .delta-icon { 
            text-shadow: 0 0 8px rgba(245, 194, 71, 0.6); 
        }
    `;

    // ==========================================
    // STATE
    // ==========================================
    
    let isInitialized = false;
    let isDestroyed = false;
    let cleanup = null;
    let CONFIG = null;
    let DeltaLib = null;

    // Feature states
    const state = {
        ccEnabled: true,
        hideBuffsEnabled: false,
        fullscreenKey: "o",
        sessionStart: Date.now(),
        totalPlaytime: 0,
        frameCount: 0
    };

    // DOM references (cached)
    let dynamicStyle = null;
    let factionPanel = null;

    // Debug metrics
    const metrics = {
        slotProcessTime: [],
        mutationProcessTime: [],
        updateLoopTime: []
    };

    // ==========================================
    // LOGGING & DEBUG
    // ==========================================

    const LogLevel = {
        ERROR: 0,
        WARN: 1,
        INFO: 2,
        DEBUG: 3
    };

    let currentLogLevel = LogLevel.WARN;

    /**
     * Log a message with level filtering
     * @param {number} level - Log level
     * @param {...any} args - Log arguments
     */
    function log(level, ...args) {
        if (level > currentLogLevel) return;
        
        const prefix = `[${MODULE_NAME}]`;
        
        switch (level) {
            case LogLevel.ERROR:
                console.error(prefix, ...args);
                break;
            case LogLevel.WARN:
                console.warn(prefix, ...args);
                break;
            case LogLevel.INFO:
                console.info(prefix, ...args);
                break;
            case LogLevel.DEBUG:
                console.log(prefix, "[DEBUG]", ...args);
                break;
        }
    }

    /**
     * Set debug mode
     * @param {boolean} enabled - Enable debug logging
     */
    function setDebugMode(enabled) {
        currentLogLevel = enabled ? LogLevel.DEBUG : LogLevel.WARN;
        log(LogLevel.INFO, `Debug mode ${enabled ? "enabled" : "disabled"}`);
    }

    /**
     * Record a performance metric
     * @param {string} category - Metric category
     * @param {number} time - Time in ms
     */
    function recordMetric(category, time) {
        if (!metrics[category]) metrics[category] = [];
        metrics[category].push(time);
        
        // Keep only last 100 measurements
        if (metrics[category].length > 100) {
            metrics[category].shift();
        }
    }

    /**
     * Get average metric time
     * @param {string} category - Metric category
     * @returns {number} Average time in ms
     */
    function getAvgMetric(category) {
        const arr = metrics[category];
        if (!arr || arr.length === 0) return 0;
        return arr.reduce((a, b) => a + b, 0) / arr.length;
    }

    // ==========================================
    // DOM UTILITIES (with fallbacks)
    // ==========================================

    /**
     * Query selector with error handling
     * @param {string} sel - CSS selector
     * @param {Element|Document} root - Root element
     * @returns {Element|null}
     */
    function $(sel, root = document) {
        if (DeltaLib) return DeltaLib.$(sel, root);
        try { 
            return root?.querySelector(sel) || null; 
        } catch (e) { 
            log(LogLevel.ERROR, "Query failed:", sel, e);
            return null; 
        }
    }

    /**
     * Query selector all with error handling
     * @param {string} sel - CSS selector
     * @param {Element|Document} root - Root element
     * @returns {Element[]}
     */
    function $$(sel, root = document) {
        if (DeltaLib) return DeltaLib.$$(sel, root);
        try { 
            return Array.from(root?.querySelectorAll(sel) || []); 
        } catch (e) { 
            log(LogLevel.ERROR, "QueryAll failed:", sel, e);
            return []; 
        }
    }

    /**
     * Get toggle value from storage
     * @param {string} key - Toggle key
     * @param {boolean} defaultVal - Default value
     * @returns {boolean}
     */
    function getToggle(key, defaultVal) {
        if (DeltaLib) return DeltaLib.storage.getToggle(key, defaultVal);
        
        const saved = localStorage.getItem("deltaUI_" + key);
        if (saved !== null) return saved === "true";
        return CONFIG?.defaults?.toggles?.[key] ?? defaultVal;
    }

    /**
     * Set style property with !important
     * @param {Element} el - Target element
     * @param {string} prop - CSS property
     * @param {string} value - CSS value
     */
    function setStyleImportant(el, prop, value) {
        if (DeltaLib) {
            DeltaLib.setStyleImportant(el, prop, value);
            return;
        }
        if (!el?.style) return;
        try { 
            el.style.setProperty(prop, value, "important"); 
        } catch (e) { 
            el.style[prop] = value; 
        }
    }

    /**
     * Get pathname from a URL
     * @param {string} src - Source URL
     * @returns {string}
     */
    function getPathFromSrc(src) {
        if (DeltaLib) return DeltaLib.url.getPath(src);
        if (!src) return "";
        try { 
            return new URL(src, window.location.origin).pathname; 
        } catch (e) { 
            return src.split("?")[0]; 
        }
    }

    // ==========================================
    // FORMATTING UTILITIES
    // ==========================================

    /**
     * Format seconds to human readable time
     * @param {number} s - Seconds
     * @returns {string}
     */
    function formatTime(s) {
        if (DeltaLib) return DeltaLib.format.time(s);
        
        if (s < 0) s = 0;
        s = Math.floor(s);
        
        if (s < 60) return s + "s";
        if (s < 3600) return Math.floor(s / 60) + "m " + (s % 60) + "s";
        if (s < 86400) return Math.floor(s / 3600) + "h " + Math.floor((s % 3600) / 60) + "m";
        return Math.floor(s / 86400) + "d " + Math.floor((s % 86400) / 3600) + "h";
    }

    /**
     * Format number with K/M suffix
     * @param {number} n - Number
     * @returns {string}
     */
    function formatNumber(n) {
        if (DeltaLib) return DeltaLib.format.number(n);
        
        if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
        if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, "") + "k";
        return String(n);
    }

    /**
     * Get color based on quality percentage
     * @param {number} pct - Percentage
     * @returns {string}
     */
    function colorFromPercent(pct) {
        if (DeltaLib) return DeltaLib.colors.fromPercent(pct, CONFIG.qualityColors);
        
        if (pct >= 109) return CONFIG.qualityColors.RED;
        if (pct >= 99) return CONFIG.qualityColors.ORANGE;
        if (pct >= 90) return CONFIG.qualityColors.PURPLE;
        if (pct >= 70) return CONFIG.qualityColors.BLUE;
        if (pct >= 50) return CONFIG.qualityColors.GREEN;
        return CONFIG.qualityColors.GREY;
    }

    // ==========================================
    // CSS INJECTION
    // ==========================================

    /**
     * Inject critical CSS styles
     */
    function injectCriticalCSS() {
        if (DeltaLib) {
            DeltaLib.injectStyle("delta-critical-css", CRITICAL_CSS);
        } else {
            if (document.getElementById("delta-critical-css")) return;
            const style = document.createElement("style");
            style.id = "delta-critical-css";
            style.textContent = CRITICAL_CSS;
            document.head.appendChild(style);
        }
        log(LogLevel.DEBUG, "Critical CSS injected");
    }

    /**
     * Generate dynamic CSS based on current config
     * @returns {string}
     */
    function generateDynamicStyles() {
        if (!CONFIG) return "";
        
        let css = "";
        
        // Skillbar colors
        for (const [id, color] of Object.entries(CONFIG.skillbarColors || {})) {
            const extraGlow = id === "skr" ? `, 0 0 10px ${color}` : "";
            css += `#${id} { 
                border: 3px solid ${color} !important; 
                box-shadow: 0 0 6px ${color}${extraGlow} !important; 
            }\n`;
        }
        
        // Charm colors
        for (const [charm, color] of Object.entries(CONFIG.charmColors || {})) {
            css += `
                body.delta-charm-colors .slot.filled[data-${charm}="true"] { 
                    border-color: ${color} !important; 
                    box-shadow: 0 0 8px ${color} !important; 
                }
                body.delta-charm-colors .slot.filled[data-${charm}="true"] > .slotdescription { 
                    border-color: ${color} !important; 
                    box-shadow: 0 0 12px ${color}cc !important; 
                }
                body.delta-charm-colors .slot.filled[data-${charm}="true"] > .slotdescription .slottitle { 
                    color: ${color} !important; 
                }
            `;
        }
        
        // Pet color
        const petColor = CONFIG.petColor || "#0aa2af";
        css += `
            body.delta-charm-colors .slot.filled[data-pet="true"] { 
                border-color: ${petColor} !important; 
                box-shadow: 0 0 8px ${petColor} !important; 
            }
            body.delta-charm-colors .slot.filled[data-pet="true"] > .slotdescription { 
                border-color: ${petColor} !important; 
                box-shadow: 0 0 12px ${petColor}cc !important; 
            }
            body.delta-charm-colors .slot.filled[data-pet="true"] > .slotdescription .slottitle { 
                color: ${petColor} !important; 
            }
        `;
        
        // Default charm styling when custom colors disabled
        css += `
            body:not(.delta-charm-colors) .slot.filled[data-charm="true"], 
            body:not(.delta-charm-colors) .slot.filled[data-pet="true"] { 
                border-color: #9E3BF9 !important; 
                box-shadow: 0 0 6px rgba(158, 59, 249, 0.5) !important; 
            }
        `;
        
        // FPS mode selectors
        if (CONFIG.fpsHideSelectors?.length > 0) {
            css += `
                body.delta-fps-mode :is(${CONFIG.fpsHideSelectors.join(", ")}) { 
                    display: none !important; 
                }
            `;
        }
        
        return css;
    }

    /**
     * Update dynamic styles element
     */
    function updateDynamicStyles() {
        if (!dynamicStyle) {
            dynamicStyle = document.getElementById("delta-dynamic-styles");
            if (!dynamicStyle) {
                dynamicStyle = document.createElement("style");
                dynamicStyle.id = "delta-dynamic-styles";
                document.head.appendChild(dynamicStyle);
            }
        }
        dynamicStyle.textContent = generateDynamicStyles();
        log(LogLevel.DEBUG, "Dynamic styles updated");
    }

    // ==========================================
    // CONFIG MANAGEMENT
    // ==========================================

    /**
     * Build runtime config from base config
     * @returns {Object|null}
     */
    function buildRuntimeConfig() {
        const baseConfig = window.DELTA_CONFIG;
        if (!baseConfig) {
            log(LogLevel.ERROR, "DELTA_CONFIG not found");
            return null;
        }
        
        CONFIG = {
            ...baseConfig,
            skillbarColors: { ...baseConfig.defaults.skillbarColors },
            charmColors: { ...baseConfig.defaults.charmColors },
            petColor: baseConfig.defaults.petColor,
            hiddenBuffs: [],
            fpsHideSelectors: []
        };
        
        // Update global reference
        window.DELTA_CONFIG = CONFIG;
        
        loadSavedSettings();
        
        log(LogLevel.INFO, `Config built, version ${CONFIG.version}`);
        return CONFIG;
    }

    /**
     * Load all saved settings from storage
     */
    function loadSavedSettings() {
        loadSkillbarColors();
        loadCharmColors();
        loadPetColor();
        loadHiddenBuffs();
        loadCCSettings();
        loadFPSSettings();
    }

    /**
     * Load skillbar colors from storage
     */
    function loadSkillbarColors() {
        try {
            const key = CONFIG.storageKeys.SKILLBAR_COLORS;
            const saved = DeltaLib 
                ? DeltaLib.storage.getJSON(key) 
                : JSON.parse(localStorage.getItem(key) || "{}");
            if (saved && typeof saved === "object") {
                Object.assign(CONFIG.skillbarColors, saved);
            }
        } catch (e) {
            log(LogLevel.WARN, "Failed to load skillbar colors:", e);
        }
    }

    /**
     * Load charm colors from storage
     */
    function loadCharmColors() {
        try {
            const key = CONFIG.storageKeys.CHARM_COLORS;
            const saved = DeltaLib 
                ? DeltaLib.storage.getJSON(key) 
                : JSON.parse(localStorage.getItem(key) || "{}");
            if (saved && typeof saved === "object") {
                Object.assign(CONFIG.charmColors, saved);
            }
        } catch (e) {
            log(LogLevel.WARN, "Failed to load charm colors:", e);
        }
    }

    /**
     * Load pet color from storage
     */
    function loadPetColor() {
        try {
            const key = CONFIG.storageKeys.PET_COLOR;
            const saved = DeltaLib 
                ? DeltaLib.storage.get(key) 
                : localStorage.getItem(key);
            if (saved) {
                CONFIG.petColor = saved;
            }
        } catch (e) {
            log(LogLevel.WARN, "Failed to load pet color:", e);
        }
    }

    /**
     * Load hidden buffs configuration
     */
    function loadHiddenBuffs() {
        try {
            const key = CONFIG.storageKeys.HIDDEN_BUFFS;
            const saved = DeltaLib 
                ? DeltaLib.storage.getJSON(key) 
                : JSON.parse(localStorage.getItem(key) || "{}");
            
            if (!saved || typeof saved !== "object") return;
            
            const arr = [];
            
            for (const [buffId, isHidden] of Object.entries(saved)) {
                if (!isHidden) continue;
                
                // Search in class buffs
                for (const className of Object.keys(CONFIG.buffIcons || {})) {
                    const buff = CONFIG.buffIcons[className].find(b => b.id === buffId);
                    if (buff) {
                        arr.push(buff.src);
                        break;
                    }
                }
                
                // Search in utility buffs
                const utilBuff = (CONFIG.utilityBuffs || []).find(b => b.id === buffId);
                if (utilBuff) arr.push(utilBuff.src);
            }
            
            CONFIG.hiddenBuffs = arr;
        } catch (e) {
            log(LogLevel.WARN, "Failed to load hidden buffs:", e);
        }
    }

    /**
     * Load CC indicator settings
     */
    function loadCCSettings() {
        try {
            const key = CONFIG.storageKeys.CC_SETTINGS;
            const saved = DeltaLib 
                ? DeltaLib.storage.getJSON(key) 
                : JSON.parse(localStorage.getItem(key) || "{}");
            
            if (!saved || typeof saved !== "object") return;
            
            (CONFIG.ccEffects || []).forEach(cc => {
                const settings = saved[cc.id];
                if (settings) {
                    cc.color = settings.color;
                    cc.priority = settings.priority;
                }
            });
        } catch (e) {
            log(LogLevel.WARN, "Failed to load CC settings:", e);
        }
    }

    /**
     * Load FPS mode settings
     */
    function loadFPSSettings() {
        try {
            const key = CONFIG.storageKeys.FPS_SETTINGS;
            const saved = DeltaLib 
                ? DeltaLib.storage.getJSON(key) 
                : JSON.parse(localStorage.getItem(key) || "{}");
            
            const fpsSettings = saved || {};
            const arr = [];
            
            (CONFIG.fpsOptions || []).forEach(opt => {
                const isEnabled = fpsSettings[opt.id] ?? opt.default;
                if (isEnabled) {
                    arr.push(opt.selector);
                }
            });
            
            CONFIG.fpsHideSelectors = arr;
        } catch (e) {
            log(LogLevel.WARN, "Failed to load FPS settings:", e);
        }
    }

    // ==========================================
    // IMAGE PRELOADER
    // ==========================================

    const ImagePreloader = {
        cache: new Map(),
        preloaded: false,
        loadPromises: new Map(),

        /**
         * Preload all replacement images
         */
        preload() {
            if (this.preloaded || !CONFIG?.replacements) return;
            this.preloaded = true;
            
            let loaded = 0;
            const total = Object.keys(CONFIG.replacements).length;
            
            for (const [original, replacement] of Object.entries(CONFIG.replacements)) {
                const img = new Image();
                
                const promise = new Promise((resolve) => {
                    img.onload = () => {
                        loaded++;
                        log(LogLevel.DEBUG, `Preloaded ${loaded}/${total}: ${original}`);
                        resolve(true);
                    };
                    img.onerror = () => {
                        log(LogLevel.WARN, `Failed to preload: ${replacement}`);
                        resolve(false);
                    };
                });
                
                this.loadPromises.set(original, promise);
                img.src = replacement;
                this.cache.set(original, img);
            }
            
            log(LogLevel.INFO, `Preloading ${total} images`);
        },

        /**
         * Get a preloaded image
         * @param {string} original - Original image path
         * @returns {HTMLImageElement|undefined}
         */
        get(original) {
            return this.cache.get(original);
        },

        /**
         * Check if an image is loaded
         * @param {string} original - Original image path
         * @returns {boolean}
         */
        isLoaded(original) {
            const img = this.cache.get(original);
            return img?.complete && img?.naturalWidth > 0;
        }
    };

    // ==========================================
    // SLOT PROCESSOR
    // ==========================================

    const SlotProcessor = {
        processedSlots: new WeakMap(),
        errorCount: 0,
        maxErrors: 50,

        /**
         * Get replacement key from source path
         * @param {string} srcPath - Source path
         * @returns {string}
         */
        getReplacementKey(srcPath) {
            return srcPath.replace("_grey.avif", "_q3.avif");
        },

        /**
         * Process a single slot element
         * @param {Element} slot - Slot element
         * @returns {boolean} Success
         */
        process(slot) {
            const startTime = performance.now();
            
            try {
                if (!slot || !(slot instanceof Element)) return false;
                
                const img = slot.querySelector("img.icon") || slot.querySelector("img");
                if (!img?.src) return false;
                
                const srcPath = getPathFromSrc(img.src);
                const normalizedPath = this.getReplacementKey(srcPath);
                const itemRecolorEnabled = document.body.classList.contains(CSS_CLASSES.ITEM_RECOLOR);
                const isAlreadyReplacement = img.src.includes("githubusercontent") || img.src.includes("github");
                
                // Handle item recoloring
                if (itemRecolorEnabled && !isAlreadyReplacement) {
                    this.applyImageReplacement(img, srcPath, normalizedPath);
                }
                
                // Revert if recolor disabled
                if (!itemRecolorEnabled && img.dataset[DATA_ATTRS.REPLACED] === "true" && img.dataset[DATA_ATTRS.ORIGINAL_SRC]) {
                    img.src = img.dataset[DATA_ATTRS.ORIGINAL_SRC];
                    delete img.dataset[DATA_ATTRS.REPLACED];
                    delete img.dataset[DATA_ATTRS.ORIGINAL_SRC];
                }
                
                // Clear previous data attributes
                delete slot.dataset[DATA_ATTRS.PET];
                delete slot.dataset[DATA_ATTRS.CHARM];
                
                // Categorize slot
                this.categorizeSlot(slot, srcPath, normalizedPath);
                
                // Track processed
                this.processedSlots.set(slot, img.src);
                
                // Record metric
                recordMetric("slotProcessTime", performance.now() - startTime);
                
                return true;
                
            } catch (error) {
                this.errorCount++;
                log(LogLevel.ERROR, "SlotProcessor.process failed:", error, slot);
                
                if (this.errorCount > this.maxErrors) {
                    log(LogLevel.ERROR, `Too many errors (${this.errorCount}), some slots may not process`);
                }
                
                return false;
            }
        },

        /**
         * Apply image replacement for a slot
         * @param {HTMLImageElement} img - Image element
         * @param {string} srcPath - Source path
         * @param {string} normalizedPath - Normalized path
         */
        applyImageReplacement(img, srcPath, normalizedPath) {
            for (const [original, replacement] of Object.entries(CONFIG.replacements || {})) {
                if (normalizedPath.includes(original) || srcPath.includes(original)) {
                    if (!img.dataset[DATA_ATTRS.ORIGINAL_SRC]) {
                        img.dataset[DATA_ATTRS.ORIGINAL_SRC] = img.src;
                    }
                    
                    const preloaded = ImagePreloader.get(original);
                    if (preloaded?.complete && preloaded?.naturalWidth > 0) {
                        img.src = preloaded.src;
                    } else {
                        img.src = replacement;
                    }
                    
                    img.dataset[DATA_ATTRS.REPLACED] = "true";
                    break;
                }
            }
        },

        /**
         * Categorize slot as pet, charm, or premium box
         * @param {Element} slot - Slot element
         * @param {string} srcPath - Source path
         * @param {string} normalizedPath - Normalized path
         */
        categorizeSlot(slot, srcPath, normalizedPath) {
            // Check for pet
            if (normalizedPath.includes("/pet/") && (normalizedPath.includes("_q3") || srcPath.includes("_grey"))) {
                slot.dataset[DATA_ATTRS.PET] = "true";
                return;
            }
            
            // Check for charm
            if (normalizedPath.includes("/charm/") || srcPath.includes("/charm/")) {
                slot.dataset[DATA_ATTRS.CHARM] = "true";
                
                // Find specific charm type
                for (const charmKey of Object.keys(CONFIG.charmColors || {})) {
                    if (normalizedPath.includes(charmKey) || srcPath.includes(charmKey)) {
                        slot.dataset[charmKey] = "true";
                        break;
                    }
                }
                return;
            }
            
            // Check for premium box
            if (srcPath.includes("box/box1_q3") || srcPath.includes("box/box2_q3")) {
                this.applyPremiumBoxEffects(slot);
            }
        },

        /**
         * Apply premium box visual effects
         * @param {Element} slot - Slot element
         */
        applyPremiumBoxEffects(slot) {
            if (slot.dataset[DATA_ATTRS.PREMIUM_BOX]) return;
            
            slot.dataset[DATA_ATTRS.PREMIUM_BOX] = "true";
            
            // Add crown
            if (!slot.querySelector(".premium-crown")) {
                const crown = document.createElement("div");
                crown.className = "premium-crown";
                slot.appendChild(crown);
            }
            
            // Add sparkles
            if (!slot.querySelector(".premium-sparkles")) {
                const sparkles = document.createElement("div");
                sparkles.className = "premium-sparkles";
                sparkles.innerHTML = `
                    <div class="premium-sparkle sparkle-0"></div>
                    <div class="premium-sparkle sparkle-1"></div>
                    <div class="premium-sparkle sparkle-2"></div>
                    <div class="premium-sparkle sparkle-3"></div>
                `;
                slot.appendChild(sparkles);
            }
        },

        /**
         * Scan and process all slots
         */
        scanAll() {
            const slots = $$(".slot.filled, .container.border.purp");
            log(LogLevel.DEBUG, `Scanning ${slots.length} slots`);
            
            let processed = 0;
            let errors = 0;
            
            slots.forEach(slot => {
                if (this.process(slot)) {
                    processed++;
                } else {
                    errors++;
                }
            });
            
            log(LogLevel.DEBUG, `Scan complete: ${processed} processed, ${errors} errors`);
        },

        /**
         * Revert all replaced images to original
         */
        revertAllImages() {
            const replaced = $$(`img[data-${DATA_ATTRS.REPLACED}="true"][data-${DATA_ATTRS.ORIGINAL_SRC}]`);
            
            replaced.forEach(img => {
                img.src = img.dataset[DATA_ATTRS.ORIGINAL_SRC];
                delete img.dataset[DATA_ATTRS.REPLACED];
                delete img.dataset[DATA_ATTRS.ORIGINAL_SRC];
            });
            
            this.processedSlots = new WeakMap();
            log(LogLevel.DEBUG, `Reverted ${replaced.length} images`);
        },

        /**
         * Reset error counter
         */
        resetErrors() {
            this.errorCount = 0;
        }
    };

    // ==========================================
    // UPDATE QUEUE SYSTEM
    // ==========================================

    const UpdateQueue = {
        slots: new Set(),
        flags: {
            tooltips: false,
            damageBars: false,
            windows: false,
            ccOverlays: false,
            hiddenBuffs: false
        },
        rafId: null,

        /**
         * Add a slot to the processing queue
         * @param {Element} slot - Slot element
         */
        queueSlot(slot) {
            if (slot instanceof Element) {
                this.slots.add(slot);
                this.scheduleUpdate();
            }
        },

        /**
         * Set an update flag
         * @param {string} flag - Flag name
         */
        setFlag(flag) {
            if (flag in this.flags) {
                this.flags[flag] = true;
                this.scheduleUpdate();
            }
        },

        /**
         * Schedule an update on next animation frame
         */
        scheduleUpdate() {
            if (this.rafId) return;
            this.rafId = requestAnimationFrame(() => this.processQueue());
        },

        /**
         * Process all queued updates
         */
        processQueue() {
            const startTime = performance.now();
            
            try {
                // Process slots
                if (this.slots.size > 0) {
                    this.slots.forEach(slot => SlotProcessor.process(slot));
                    this.slots.clear();
                }
                
                // Process tooltips
                if (this.flags.tooltips) {
                    $$(".slotdescription").forEach(updateTooltipUI);
                    this.flags.tooltips = false;
                }
                
                // Process damage bars
                if (this.flags.damageBars) {
                    scanDamageBars();
                    this.flags.damageBars = false;
                }
                
                // Process windows
                if (this.flags.windows) {
                    fixBattleboardWindow();
                    colorWarStatisticsTable();
                    applySkillColors();
                    this.flags.windows = false;
                }
                
                // Process CC overlays
                if (this.flags.ccOverlays) {
                    updateCCOverlays();
                    this.flags.ccOverlays = false;
                }
                
                // Process hidden buffs
                if (this.flags.hiddenBuffs) {
                    updateHiddenBuffs();
                    this.flags.hiddenBuffs = false;
                }
                
            } catch (error) {
                log(LogLevel.ERROR, "UpdateQueue.processQueue failed:", error);
            }
            
            this.rafId = null;
            recordMetric("updateLoopTime", performance.now() - startTime);
        },

        /**
         * Clear all queued updates
         */
        clear() {
            this.slots.clear();
            Object.keys(this.flags).forEach(key => this.flags[key] = false);
            if (this.rafId) {
                cancelAnimationFrame(this.rafId);
                this.rafId = null;
            }
        }
    };

    // ==========================================
    // CC OVERLAY SYSTEM
    // ==========================================

    /**
     * Update CC indicator overlays on party frames
     */
    function updateCCOverlays() {
        if (!state.ccEnabled) {
            $$(".cc-hp-border-overlay").forEach(o => {
                o.style.display = "none";
            });
            return;
        }
        
        $$(".partyframes .grid.left").forEach(frame => {
            try {
                const barsInner = frame.querySelector(".panel-black.barsInner.targetable");
                if (!barsInner) return;
                
                const parent = barsInner.parentElement;
                if (!parent) return;
                
                // Ensure relative positioning
                if (getComputedStyle(parent).position === "static") {
                    parent.style.position = "relative";
                }
                
                // Get or create overlay
                let overlay = parent.querySelector(".cc-hp-border-overlay");
                if (!overlay) {
                    overlay = document.createElement("div");
                    overlay.className = "cc-hp-border-overlay";
                    parent.appendChild(overlay);
                }
                
                // Find highest priority CC
                let highestCC = null;
                
                frame.querySelectorAll(".buffarray.party img.icon").forEach(buff => {
                    for (const cc of (CONFIG.ccEffects || [])) {
                        if (cc.priority === 0) continue;
                        if (buff.src.includes(cc.src)) {
                            if (!highestCC || cc.priority > highestCC.priority) {
                                highestCC = cc;
                            }
                        }
                    }
                });
                
                // Apply or hide overlay
                if (highestCC) {
                    overlay.style.display = "block";
                    overlay.style.boxShadow = `inset 0 0 0 6px ${highestCC.color}`;
                } else {
                    overlay.style.display = "none";
                }
                
            } catch (error) {
                log(LogLevel.ERROR, "updateCCOverlays frame error:", error);
            }
        });
    }

    // ==========================================
    // BUFF HIDING SYSTEM
    // ==========================================

    /**
     * Update hidden buffs visibility
     */
    function updateHiddenBuffs() {
        const containers = $$(".partyframes .buffarray .container, #ufplayer .buffarray .container");
        
        if (!state.hideBuffsEnabled) {
            containers.forEach(c => c.style.display = "");
            return;
        }
        
        containers.forEach(container => {
            try {
                const icon = container.querySelector(".slot > img.icon");
                if (!icon) return;
                
                const shouldHide = (CONFIG.hiddenBuffs || []).some(buff => icon.src.includes(buff));
                container.style.display = shouldHide ? "none" : "";
                
            } catch (error) {
                log(LogLevel.ERROR, "updateHiddenBuffs container error:", error);
            }
        });
    }

    /**
     * Update hidden buffs configuration from settings
     * @param {Object} hiddenBuffsObj - Hidden buffs object
     */
    function updateHiddenBuffsConfig(hiddenBuffsObj) {
        const arr = [];
        
        for (const [buffId, isHidden] of Object.entries(hiddenBuffsObj || {})) {
            if (!isHidden) continue;
            
            // Search class buffs
            for (const className of Object.keys(CONFIG.buffIcons || {})) {
                const buff = CONFIG.buffIcons[className].find(b => b.id === buffId);
                if (buff) {
                    arr.push(buff.src);
                    break;
                }
            }
            
            // Search utility buffs
            const utilBuff = (CONFIG.utilityBuffs || []).find(b => b.id === buffId);
            if (utilBuff) arr.push(utilBuff.src);
        }
        
        CONFIG.hiddenBuffs = arr;
        updateHiddenBuffs();
    }

    // ==========================================
    // CC CONFIG UPDATE
    // ==========================================

    /**
     * Update CC configuration from settings
     * @param {Object} ccSettings - CC settings object
     */
    function updateCCConfig(ccSettings) {
        (CONFIG.ccEffects || []).forEach(cc => {
            const settings = ccSettings[cc.id];
            if (settings) {
                cc.color = settings.color;
                cc.priority = settings.priority;
            }
        });
        updateCCOverlays();
    }

    // ==========================================
    // FPS CONFIG UPDATE
    // ==========================================

    /**
     * Update FPS mode configuration from settings
     * @param {Object} fpsSettings - FPS settings object
     */
    function updateFPSConfig(fpsSettings) {
        const arr = [];
        
        (CONFIG.fpsOptions || []).forEach(opt => {
            const isEnabled = fpsSettings[opt.id] ?? opt.default;
            if (isEnabled) {
                arr.push(opt.selector);
            }
        });
        
        CONFIG.fpsHideSelectors = arr;
        updateDynamicStyles();
    }

    // ==========================================
    // TOGGLE SYSTEM
    // ==========================================

    /**
     * Apply a toggle state change
     * @param {string} toggleId - Toggle identifier
     * @param {boolean} isEnabled - New state
     */
    function applyToggle(toggleId, isEnabled) {
        // Save to storage
        if (DeltaLib) {
            DeltaLib.storage.setToggle(toggleId, isEnabled);
        } else {
            localStorage.setItem("deltaUI_" + toggleId, String(isEnabled));
        }
        
        log(LogLevel.DEBUG, `Toggle ${toggleId} = ${isEnabled}`);
        
        // Apply toggle
        switch (toggleId) {
            case "ccIndicator":
                state.ccEnabled = isEnabled;
                updateCCOverlays();
                break;
                
            case "hideBuffs":
                state.hideBuffsEnabled = isEnabled;
                updateHiddenBuffs();
                break;
                
            case "fpsMode":
                document.body.classList.toggle(CSS_CLASSES.FPS_MODE, isEnabled);
                break;
                
            case "chatTweaks":
                const chatControls = $("#chat-controls");
                if (chatControls) {
                    chatControls.style.display = isEnabled ? "flex" : "none";
                }
                break;
                
            case "itemRecolor":
                document.body.classList.toggle(CSS_CLASSES.ITEM_RECOLOR, isEnabled);
                if (isEnabled) {
                    SlotProcessor.scanAll();
                } else {
                    SlotProcessor.revertAllImages();
                    SlotProcessor.scanAll();
                }
                break;
                
            case "charmColors":
                document.body.classList.toggle(CSS_CLASSES.CHARM_COLORS, isEnabled);
                break;
                
            case "playtimeLabels":
                const playtimeEl = $("#totalPlaytimeUI");
                const sessionEl = $("#sessionTimeUI");
                if (playtimeEl) playtimeEl.style.display = isEnabled ? "flex" : "none";
                if (sessionEl) sessionEl.style.display = isEnabled ? "flex" : "none";
                break;
                
            case "fameLabels":
                const fameGainedEl = $("#fameGainedUI");
                const fameLostEl = $("#fameLostUI");
                if (fameGainedEl) fameGainedEl.style.display = isEnabled ? "flex" : "none";
                if (fameLostEl) fameLostEl.style.display = isEnabled ? "flex" : "none";
                break;
                
            case "mouseover":
                if (window.DeltaMouseover) {
                    isEnabled ? window.DeltaMouseover.enable() : window.DeltaMouseover.disable();
                }
                break;
                
            case "partyUIEditor":
                if (window.DeltaPartyArranger) {
                    isEnabled ? window.DeltaPartyArranger.enable() : window.DeltaPartyArranger.disable();
                }
                break;
                
            case "canvasScaler":
                if (window.DeltaCanvasScaler) {
                    isEnabled ? window.DeltaCanvasScaler.enable() : window.DeltaCanvasScaler.disable();
                }
                break;
                
            case "partyAutoSort":
                if (window.DeltaPartyArranger) {
                    isEnabled ? window.DeltaPartyArranger.enableAutoSort() : window.DeltaPartyArranger.disableAutoSort();
                }
                break;
                
            default:
                log(LogLevel.WARN, `Unknown toggle: ${toggleId}`);
        }
    }

    /**
     * Apply all saved toggle states
     */
    function applyAllSavedToggles() {
        const toggles = [
            "ccIndicator", "hideBuffs", "fpsMode", "chatTweaks",
            "itemRecolor", "charmColors", "playtimeLabels", "fameLabels",
            "mouseover", "partyUIEditor", "canvasScaler", "partyAutoSort"
        ];
        
        toggles.forEach(id => {
            const defaultValue = CONFIG.defaults.toggles[id] ?? false;
            applyToggle(id, getToggle(id, defaultValue));
        });
    }

    // ==========================================
    // UI UPDATES
    // ==========================================

    /**
     * Apply skill colors to skill window
     */
    function applySkillColors() {
        $$(".skillbox.svelte-1e0alkc .slot.filled").forEach(slot => {
            try {
                if (slot.dataset[DATA_ATTRS.COLOR_APPLIED]) return;
                
                const img = slot.querySelector("img.icon.slotskill");
                if (!img) return;
                
                const match = img.src.match(/skills\/(\d+)/);
                if (!match) return;
                
                const color = (CONFIG.skillColors || {})[match[1]];
                if (color) {
                    slot.style.setProperty("border-color", color, "important");
                    slot.style.setProperty("box-shadow", `0 0 10px ${color}66, 0 0 5px ${color}44`, "important");
                    slot.dataset[DATA_ATTRS.COLOR_APPLIED] = "true";
                }
            } catch (error) {
                log(LogLevel.ERROR, "applySkillColors slot error:", error);
            }
        });
    }

    /**
     * Scan and add class icons to damage bars
     */
    function scanDamageBars() {
        $$(".window.panel-black.svelte-1f1v3u3 .wrapper .bar .progressBar").forEach(bar => {
            try {
                const left = bar.querySelector("span.left");
                if (!left || left.querySelector("img.dmg-class-icon")) return;
                
                for (const [cls, src] of Object.entries(CONFIG.classIcons || {})) {
                    if (bar.classList.contains(cls)) {
                        const img = document.createElement("img");
                        img.className = "dmg-class-icon";
                        img.src = src;
                        img.style.marginRight = "4px";
                        left.prepend(img);
                        break;
                    }
                }
            } catch (error) {
                log(LogLevel.ERROR, "scanDamageBars bar error:", error);
            }
        });
    }

    /**
     * Update tooltip UI with quality colors
     * @param {Element} tooltip - Tooltip element
     */
    function updateTooltipUI(tooltip) {
        if (!tooltip) return;
        
        try {
            // Skip charms
            const typeEl = tooltip.querySelector(".type.textwhite");
            if (typeEl?.textContent.toLowerCase().includes("charm")) return;
            
            // Skip special items
            const parentSlot = tooltip.closest(".slot.filled");
            if (parentSlot) {
                for (const charmKey of Object.keys(CONFIG.charmColors || {})) {
                    if (parentSlot.dataset[charmKey] === "true") return;
                }
                if (parentSlot.dataset[DATA_ATTRS.PET] === "true") return;
            }
            
            // Get percent value
            const percentSpan = tooltip.querySelector(".type span");
            if (!percentSpan) return;
            
            const percent = parseInt(percentSpan.textContent.replace("%", "").trim(), 10);
            if (isNaN(percent)) return;
            
            // Apply color
            const color = colorFromPercent(percent);
            
            const title = tooltip.querySelector(".slottitle");
            if (title) setStyleImportant(title, "color", color);
            
            setStyleImportant(tooltip, "border-color", color);
            setStyleImportant(tooltip, "box-shadow", `0 0 12px ${color}cc`);
            
        } catch (error) {
            log(LogLevel.ERROR, "updateTooltipUI error:", error);
        }
    }

    /**
     * Recolor chat items based on quality
     */
    function recolorChatItems() {
        $$(`#chat .chatItem:not([data-${DATA_ATTRS.FULLY_COLORED}])`).forEach(item => {
            try {
                const percentSpan = item.querySelector(".textpurp-l, .textblue-l");
                if (!percentSpan) return;
                
                const match = percentSpan.textContent.trim().match(/(\d+)%/);
                if (!match) return;
                
                const color = colorFromPercent(parseInt(match[1], 10));
                if (!color) return;
                
                item.style.backgroundColor = `${color}33`;
                setStyleImportant(percentSpan, "color", color);
                setStyleImportant(item, "color", color);
                
                const upgradeSpan = item.querySelector(".textprimary");
                if (upgradeSpan) {
                    setStyleImportant(upgradeSpan, "color", "#40edff");
                }
                
                item.dataset[DATA_ATTRS.FULLY_COLORED] = "true";
                
            } catch (error) {
                log(LogLevel.ERROR, "recolorChatItems item error:", error);
            }
        });
    }

    /**
     * Color war statistics table rows
     */
    function colorWarStatisticsTable() {
        $$(".window.panel-black.svelte-1f1v3u3").forEach(win => {
            try {
                const titleDiv = win.querySelector(".title > div");
                if (titleDiv?.textContent.trim() !== "War Statistics") return;
                
                const table = win.querySelector("table.panel-black");
                if (!table) return;
                
                $$("tbody tr", table).forEach(row => {
                    const cells = $$("td", row);
                    if (cells.length >= 5) {
                        cells[1].style.setProperty("color", "#ee960b", "important"); // Damage
                        cells[2].style.setProperty("color", "#6acc6a", "important"); // Healing
                        cells[3].style.setProperty("color", "#c32929", "important"); // Kills
                        cells[4].style.setProperty("color", "#fe48fc", "important"); // Fame
                    }
                });
            } catch (error) {
                log(LogLevel.ERROR, "colorWarStatisticsTable window error:", error);
            }
        });
    }

    /**
     * Fix battleboard window class assignment
     */
    function fixBattleboardWindow() {
        $$(".window.panel-black.svelte-1f1v3u3").forEach(win => {
            const titleDiv = win.querySelector(".title > div");
            const isBattleboard = titleDiv?.textContent.trim() === "War Statistics";
            win.classList.toggle("battleboard-window", isBattleboard);
        });
    }

    // ==========================================
    // SESSION STATS
    // ==========================================

    /**
     * Create session stats UI container
     */
    function createSessionStats() {
        if (document.getElementById("sessionStatsContainer")) return;
        
        const container = document.createElement("div");
        container.id = "sessionStatsContainer";
        container.innerHTML = `
            <div class="stat-box" id="totalPlaytimeUI">
                Total playtime: <span class="value">0s</span>
            </div>
            <div class="stat-box" id="sessionTimeUI">
                Session time: <span class="value">0s</span>
            </div>
            <div class="stat-box" id="fameGainedUI">
                Fame Gained: 
                <span class="fame-value">
                    <img src="/data/ui/currency/fame.svg" class="fame-icon">
                    <span id="fameGainedAmount">0</span>
                </span>
            </div>
            <div class="stat-box" id="fameLostUI">
                Fame Lost: 
                <span class="fame-value">
                    <img src="/data/ui/currency/fame.svg" class="fame-icon">
                    <span id="fameLostAmount">0</span>
                </span>
            </div>
        `;
        
        document.body.appendChild(container);
        log(LogLevel.DEBUG, "Session stats container created");
    }

    /**
     * Update time display UI
     */
    function updateTimeUI() {
        const elapsed = Math.floor((Date.now() - state.sessionStart) / 1000);
        
        const sessionEl = $("#sessionTimeUI .value");
        const totalEl = $("#totalPlaytimeUI .value");
        
        if (sessionEl) sessionEl.textContent = formatTime(elapsed);
        if (totalEl) totalEl.textContent = formatTime(state.totalPlaytime + elapsed);
    }

    /**
     * Update fame display UI
     */
    function updateFameUI() {
        const gainedEl = $("#fameGainedAmount");
        const lostEl = $("#fameLostAmount");
        
        if (window.FameNotifier) {
            if (gainedEl) gainedEl.textContent = window.FameNotifier.getGained().toLocaleString();
            if (lostEl) lostEl.textContent = window.FameNotifier.getLost().toLocaleString();
        } else {
            const gained = parseInt(localStorage.getItem(CONFIG.storageKeys.FAME_GAINED) || "0", 10);
            const lost = parseInt(localStorage.getItem(CONFIG.storageKeys.FAME_LOST) || "0", 10);
            if (gainedEl) gainedEl.textContent = gained.toLocaleString();
            if (lostEl) lostEl.textContent = lost.toLocaleString();
        }
    }

    // ==========================================
    // FACTION PANEL
    // ==========================================

    /**
     * Update faction stats panel
     */
    function updateFactionPanel() {
        const warStats = $(".battleboard-window");
        
        if (!warStats) {
            if (factionPanel) {
                factionPanel.remove();
                factionPanel = null;
            }
            return;
        }
        
        try {
            // Create panel if needed
            if (!factionPanel || !document.contains(factionPanel)) {
                factionPanel = document.createElement("div");
                factionPanel.id = "faction-stats-panel";
                factionPanel.innerHTML = `
                    <div class="fs-section vg" id="vg-stats"></div>
                    <div class="fs-vs">VS</div>
                    <div class="fs-section bl" id="bl-stats"></div>
                `;
                
                const parent = warStats.parentElement;
                if (parent) {
                    parent.style.display = "flex";
                    parent.style.alignItems = "flex-start";
                    parent.appendChild(factionPanel);
                }
            }
            
            // Parse stats from table
            const rows = warStats.querySelectorAll("tbody tr");
            const factions = { vg: [], bl: [] };
            
            rows.forEach(row => {
                const fameCell = row.querySelector(".textfame");
                if (!fameCell) return;
                
                const fame = parseInt(fameCell.textContent.replace(/,/g, "")) || 0;
                if (fame === 0) return;
                
                const nameEl = row.querySelector(".name");
                if (!nameEl) return;
                
                const factionClass = nameEl.classList.contains("textf0") ? "vg" : "bl";
                const clsImg = row.querySelector("img.icon")?.src || "";
                const damage = parseInt(row.cells[1]?.textContent.replace(/,/g, "")) || 0;
                const healing = parseInt(row.cells[2]?.textContent.replace(/,/g, "")) || 0;
                const kills = parseInt(row.cells[3]?.textContent.replace(/,/g, "")) || 0;
                
                factions[factionClass].push({
                    classIcon: clsImg,
                    dmg: damage,
                    heal: healing,
                    kills,
                    fame
                });
            });
            
            // Render faction stats
            const ICONS = CONFIG.factionIcons || {};
            
            ["vg", "bl"].forEach(f => {
                const data = factions[f];
                const classCounts = { warrior: 0, mage: 0, shaman: 0, archer: 0 };
                let totalDmg = 0, totalHeal = 0, totalKills = 0, totalFame = 0;
                
                data.forEach(p => {
                    if (p.classIcon.includes("0.avif")) classCounts.warrior++;
                    else if (p.classIcon.includes("1.avif")) classCounts.mage++;
                    else if (p.classIcon.includes("2.avif")) classCounts.archer++;
                    else if (p.classIcon.includes("3.avif")) classCounts.shaman++;
                    
                    totalDmg += p.dmg;
                    totalHeal += p.heal;
                    totalKills += p.kills;
                    totalFame += p.fame;
                });
                
                // Compare with other faction
                const other = f === "vg" ? "bl" : "vg";
                const otherData = factions[other];
                const otherKills = otherData.reduce((a, p) => a + p.kills, 0);
                const otherDmg = otherData.reduce((a, p) => a + p.dmg, 0);
                const otherHeal = otherData.reduce((a, p) => a + p.heal, 0);
                const otherFame = otherData.reduce((a, p) => a + p.fame, 0);
                
                const cmp = (a, b) => a > b ? "win" : a < b ? "lose" : "tie";
                
                const statsDiv = factionPanel.querySelector(`#${f}-stats`);
                if (statsDiv) {
                    statsDiv.innerHTML = `
                        <div class="fs-header ${f}">
                            <img src="${ICONS[f] || ""}">
                            <span class="fs-name ${f}">${f.toUpperCase()}</span>
                            <span class="fs-count"><strong>${data.length}</strong></span>
                        </div>
                        <div class="fs-classes">
                            <span class="fs-class"><img src="${ICONS.warrior || ""}"><span>${classCounts.warrior}</span></span>
                            <span class="fs-class"><img src="${ICONS.mage || ""}"><span>${classCounts.mage}</span></span>
                            <span class="fs-class"><img src="${ICONS.shaman || ""}"><span>${classCounts.shaman}</span></span>
                            <span class="fs-class"><img src="${ICONS.archer || ""}"><span>${classCounts.archer}</span></span>
                        </div>
                        <div class="fs-stats">
                            <div class="fs-stat">
                                <span class="fs-label">⚔</span>
                                <span class="fs-value ${cmp(totalKills, otherKills)}">${formatNumber(totalKills)}</span>
                            </div>
                            <div class="fs-stat">
                                <span class="fs-label">💥</span>
                                <span class="fs-value ${cmp(totalDmg, otherDmg)}">${formatNumber(totalDmg)}</span>
                            </div>
                            <div class="fs-stat">
                                <span class="fs-label">💚</span>
                                <span class="fs-value ${cmp(totalHeal, otherHeal)}">${formatNumber(totalHeal)}</span>
                            </div>
                            <div class="fs-stat">
                                <span class="fs-label"><img src="${ICONS.fame || ""}"></span>
                                <span class="fs-value ${cmp(totalFame, otherFame)}">${formatNumber(totalFame)}</span>
                            </div>
                        </div>
                    `;
                }
            });
            
        } catch (error) {
            log(LogLevel.ERROR, "updateFactionPanel error:", error);
        }
    }

    // ==========================================
    // DELTA BUTTON
    // ==========================================

    /**
     * Inject Delta settings button into toolbar
     */
    function injectDeltaButton() {
        if ($("#sysdelta")) return;
        
        const btnbar = $(".l-corner-ur .btnbar");
        if (!btnbar) return;
        
        const syschar = $("#syschar", btnbar);
        if (!syschar) return;
        
        const btn = document.createElement("div");
        btn.id = "sysdelta";
        btn.className = "btn border black";
        btn.title = "Delta's UI Settings";
        btn.innerHTML = '<span class="delta-icon">Δ</span>';
        
        btn.addEventListener("click", () => {
            if (window.DeltaSettings) {
                window.DeltaSettings.toggle();
            }
        });
        
        btnbar.insertBefore(btn, syschar);
        log(LogLevel.DEBUG, "Delta button injected");
    }

    // ==========================================
    // MUTATION OBSERVER
    // ==========================================

    /**
     * Setup DOM mutation observer
     */
    function setupObserver() {
        const callback = (mutations) => {
            const startTime = performance.now();
            
            try {
                for (const mutation of mutations) {
                    // Handle attribute changes (image src)
                    if (mutation.type === "attributes" && mutation.attributeName === "src") {
                        const target = mutation.target;
                        if (target.tagName === "IMG") {
                            const slot = target.closest(".slot.filled, .container.border.purp");
                            if (slot) {
                                UpdateQueue.queueSlot(slot);
                            }
                        }
                        continue;
                    }
                    
                    // Handle node additions
                    for (const node of mutation.addedNodes) {
                        if (!(node instanceof HTMLElement)) continue;
                        
                        // Direct slot
                        if (node.classList?.contains("slot") && node.classList?.contains("filled")) {
                            UpdateQueue.queueSlot(node);
                        }
                        
                        // Descendant slots
                        if (node.children?.length > 0) {
                            node.querySelectorAll(".slot.filled").forEach(slot => {
                                UpdateQueue.queueSlot(slot);
                            });
                        }
                        
                        // Set flags for other updates
                        if (node.classList?.contains("slotdescription") || node.querySelector?.(".slotdescription")) {
                            UpdateQueue.setFlag("tooltips");
                        }
                        
                        if (node.classList?.contains("progressBar") || node.querySelector?.(".progressBar")) {
                            UpdateQueue.setFlag("damageBars");
                        }
                        
                        if (node.classList?.contains("window") || node.querySelector?.(".window")) {
                            UpdateQueue.setFlag("windows");
                        }
                    }
                }
                
                recordMetric("mutationProcessTime", performance.now() - startTime);
                
            } catch (error) {
                log(LogLevel.ERROR, "MutationObserver callback error:", error);
            }
        };
        
        // Use DeltaLib if available
        if (DeltaLib && cleanup) {
            const observerId = DeltaLib.observers.create(document.body, callback, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ["src"],
                debounce: 50
            });
            cleanup.trackObserver(observerId);
        } else {
            const observer = new MutationObserver(callback);
            observer.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ["src"]
            });
            if (cleanup) {
                cleanup.trackCustom(() => observer.disconnect());
            }
        }
        
        log(LogLevel.DEBUG, "MutationObserver setup complete");
    }

    // ==========================================
    // UPDATE LOOP
    // ==========================================

    /**
     * Setup main update loop
     */
    function setupUpdateLoop() {
        function tick() {
            if (isDestroyed) return;
            
            state.frameCount++;
            
            // Fast updates (CC overlays, buffs)
            if (state.frameCount % FRAMES.CC_UPDATE === 0) {
                if ($(".battleboard-window")) {
                    updateFactionPanel();
                }
                updateCCOverlays();
                updateHiddenBuffs();
            }
            
            // Time updates
            if (state.frameCount % FRAMES.TIME_UPDATE === 0) {
                updateTimeUI();
                updateFameUI();
            }
            
            // Reset frame counter to prevent overflow
            if (state.frameCount >= FRAMES.SLOW_SCAN) {
                state.frameCount = 0;
            }
            
            requestAnimationFrame(tick);
        }
        
        requestAnimationFrame(tick);
        
        // Slow interval for scanning
        const intervalId = setInterval(() => {
            if (isDestroyed) return;
            
            fixBattleboardWindow();
            
            if (!$("#sysdelta")) {
                injectDeltaButton();
            }
            
            SlotProcessor.scanAll();
            recolorChatItems();
            
        }, CONFIG.timing.SLOW_UPDATE);
        
        if (cleanup) {
            cleanup.trackCustom(() => clearInterval(intervalId));
        }
        
        log(LogLevel.DEBUG, "Update loop started");
    }

    // ==========================================
    // KEYBOARD HANDLER
    // ==========================================

    /**
     * Setup keyboard event handler
     */
    function setupKeyboardHandler() {
        const handler = (e) => {
            // Check if typing in an input
            const active = document.activeElement;
            const isTyping = active?.tagName === "INPUT" ||
                            active?.tagName === "TEXTAREA" ||
                            active?.isContentEditable;
            
            // Skip if in keybind input
            if (active?.classList?.contains("keybind-input")) return;
            
            // Fullscreen toggle
            if (!isTyping && e.key.toLowerCase() === state.fullscreenKey) {
                const isFS = document.fullscreenElement || document.webkitFullscreenElement;
                
                if (isFS) {
                    (document.exitFullscreen || document.webkitExitFullscreen)?.call(document);
                } else {
                    document.documentElement.requestFullscreen?.();
                }
            }
        };
        
        if (DeltaLib && cleanup) {
            cleanup.trackEvent(DeltaLib.events.on(window, "keydown", handler));
        } else {
            window.addEventListener("keydown", handler);
            if (cleanup) {
                cleanup.trackCustom(() => window.removeEventListener("keydown", handler));
            }
        }
        
        log(LogLevel.DEBUG, "Keyboard handler setup complete");
    }

    // ==========================================
    // BEFORE UNLOAD HANDLER
    // ==========================================

    /**
     * Setup beforeunload handler to save playtime
     */
    function setupBeforeUnload() {
        const handler = () => {
            const elapsed = Math.floor((Date.now() - state.sessionStart) / 1000);
            localStorage.setItem(CONFIG.storageKeys.PLAYTIME, String(state.totalPlaytime + elapsed));
        };
        
        window.addEventListener("beforeunload", handler);
        
        if (cleanup) {
            cleanup.trackCustom(() => window.removeEventListener("beforeunload", handler));
        }
    }

    // ==========================================
    // CONFLICT DETECTION
    // ==========================================

    /**
     * Detect potential conflicts with game UI
     * @returns {string[]} Array of conflict messages
     */
    function detectConflicts() {
        const conflicts = [];
        
        // Check critical selectors
        const criticalSelectors = [
            "#skillbar",
            "#chat",
            ".partyframes",
            ".btnbar"
        ];
        
        criticalSelectors.forEach(sel => {
            if (!$(sel)) {
                conflicts.push(`Missing element: ${sel}`);
            }
        });
        
        // Check skillbar structure
        const skillbar = $("#skillbar");
        if (skillbar) {
            const slots = skillbar.querySelectorAll(".slot[id]");
            if (slots.length === 0) {
                conflicts.push("Skillbar structure changed - no skill slots found");
            }
        }
        
        // Check version compatibility
        if (window.DELTA_CONFIG && window.DeltaLib) {
            if (CONFIG.version !== DeltaLib.version) {
                conflicts.push(`Version mismatch: Config ${CONFIG.version}, Lib ${DeltaLib.version}`);
            }
        }
        
        if (conflicts.length > 0) {
            log(LogLevel.WARN, "Conflicts detected:", conflicts);
            
            // Notify user if loader available
            if (window.DeltaLoader) {
                window.DeltaLoader.toastError(
                    "UI conflicts detected",
                    "Check console for details"
                );
            }
        }
        
        return conflicts;
    }

    // ==========================================
    // DEPENDENCY WAITING
    // ==========================================

    /**
     * Wait for dependencies to be available
     * @returns {Promise<boolean>}
     */
    function waitForDependencies() {
        return new Promise((resolve) => {
            let waited = 0;
            
            const check = () => {
                if (window.DELTA_CONFIG && window.DeltaLib) {
                    DeltaLib = window.DeltaLib;
                    log(LogLevel.INFO, "Dependencies ready");
                    resolve(true);
                    return;
                }
                
                // Fallback: Config only (lib is optional)
                if (window.DELTA_CONFIG && waited > DEP_MAX_WAIT / 2) {
                    log(LogLevel.WARN, "DeltaLib not found, running without it");
                    resolve(true);
                    return;
                }
                
                waited += DEP_CHECK_INTERVAL;
                
                if (waited >= DEP_MAX_WAIT) {
                    log(LogLevel.ERROR, "Dependency timeout after", DEP_MAX_WAIT, "ms");
                    resolve(false);
                    return;
                }
                
                setTimeout(check, DEP_CHECK_INTERVAL);
            };
            
            check();
        });
    }

    // ==========================================
    // INITIALIZATION
    // ==========================================

    /**
     * Main initialization function
     */
    async function init() {
        if (isInitialized) {
            log(LogLevel.WARN, "Already initialized");
            return;
        }
        
        log(LogLevel.INFO, `Initializing ${MODULE_NAME} v${MODULE_VERSION}`);
        
        // Wait for dependencies
        const depsReady = await waitForDependencies();
        if (!depsReady) {
            log(LogLevel.ERROR, "Failed to load dependencies");
            return;
        }
        
        isInitialized = true;
        isDestroyed = false;
        
        // Setup cleanup tracker
        if (DeltaLib) {
            cleanup = DeltaLib.createCleanup();
        } else {
            const customCleanups = [];
            cleanup = {
                trackEvent: () => {},
                trackObserver: () => {},
                trackInterval: () => {},
                trackCustom: (fn) => customCleanups.push(fn),
                run: () => customCleanups.forEach(fn => {
                    try { fn(); } catch (e) { log(LogLevel.ERROR, "Cleanup error:", e); }
                }),
                getCount: () => ({ custom: customCleanups.length })
            };
        }
        
        // Build runtime config
        if (!buildRuntimeConfig()) {
            log(LogLevel.ERROR, "Failed to build config");
            setTimeout(init, 100);
            return;
        }
        
        // Inject critical CSS
        injectCriticalCSS();
        
        // Load saved state
        state.fullscreenKey = localStorage.getItem("deltaUI_fullscreenKey") || "o";
        state.totalPlaytime = Number(localStorage.getItem(CONFIG.storageKeys.PLAYTIME) || "0") || 0;
        state.ccEnabled = getToggle("ccIndicator", true);
        state.hideBuffsEnabled = getToggle("hideBuffs", false);
        
        // Initialize subsystems
        ImagePreloader.preload();
        updateDynamicStyles();
        createSessionStats();
        setupObserver();
        setupUpdateLoop();
        setupKeyboardHandler();
        setupBeforeUnload();
        
        // Remove default party button
        const partyBtn = $("div.btn.party");
        if (partyBtn) partyBtn.remove();
        
        // Initial UI updates
        fixBattleboardWindow();
        updateFameUI();
        SlotProcessor.scanAll();
        colorWarStatisticsTable();
        injectDeltaButton();
        applySkillColors();
        
        // Delayed initialization
        setTimeout(() => {
            SlotProcessor.scanAll();
            scanDamageBars();
            colorWarStatisticsTable();
            injectDeltaButton();
            applyAllSavedToggles();
            detectConflicts();
        }, CONFIG.timing.INIT_DELAY);
        
        log(LogLevel.INFO, "Initialization complete");
    }

    /**
     * Destroy and cleanup
     */
    function destroy() {
        if (!isInitialized) return;
        
        log(LogLevel.INFO, "Destroying...");
        
        isDestroyed = true;
        isInitialized = false;
        
        // Run cleanup
        if (cleanup) {
            cleanup.run();
            cleanup = null;
        }
        
        // Clear update queue
        UpdateQueue.clear();
        
        // Reset slot processor
        SlotProcessor.processedSlots = new WeakMap();
        SlotProcessor.resetErrors();
        
        // Remove faction panel
        if (factionPanel) {
            factionPanel.remove();
            factionPanel = null;
        }
        
        log(LogLevel.INFO, "Destroyed");
    }

    /**
     * Reinitialize module
     */
    function reinit() {
        destroy();
        setTimeout(init, 100);
    }

    // ==========================================
    // SAVE FUNCTIONS
    // ==========================================

    /**
     * Save skillbar colors to storage
     */
    function saveSkillbarColors() {
        const key = CONFIG.storageKeys.SKILLBAR_COLORS;
        if (DeltaLib) {
            DeltaLib.storage.setJSON(key, CONFIG.skillbarColors);
        } else {
            localStorage.setItem(key, JSON.stringify(CONFIG.skillbarColors));
        }
    }

    /**
     * Save charm colors to storage
     */
    function saveCharmColors() {
        const key = CONFIG.storageKeys.CHARM_COLORS;
        if (DeltaLib) {
            DeltaLib.storage.setJSON(key, CONFIG.charmColors);
        } else {
            localStorage.setItem(key, JSON.stringify(CONFIG.charmColors));
        }
    }

    /**
     * Save pet color to storage
     */
    function savePetColor() {
        const key = CONFIG.storageKeys.PET_COLOR;
        if (DeltaLib) {
            DeltaLib.storage.set(key, CONFIG.petColor);
        } else {
            localStorage.setItem(key, CONFIG.petColor);
        }
    }

    /**
     * Reset all colors to defaults
     */
    function resetToDefaults() {
        CONFIG.skillbarColors = { ...CONFIG.defaults.skillbarColors };
        CONFIG.charmColors = { ...CONFIG.defaults.charmColors };
        CONFIG.petColor = CONFIG.defaults.petColor;
        
        saveSkillbarColors();
        saveCharmColors();
        savePetColor();
        
        log(LogLevel.INFO, "Colors reset to defaults");
    }

    /**
     * Set fullscreen toggle key
     * @param {string} key - Key to use
     */
    function setFullscreenKey(key) {
        state.fullscreenKey = key.toLowerCase();
    }

    // ==========================================
    // DEBUG API
    // ==========================================

    /**
     * Get debug information
     * @returns {Object}
     */
    function getDebugInfo() {
        return {
            version: MODULE_VERSION,
            initialized: isInitialized,
            destroyed: isDestroyed,
            state: { ...state },
            metrics: {
                slotProcessAvg: getAvgMetric("slotProcessTime").toFixed(2) + "ms",
                mutationProcessAvg: getAvgMetric("mutationProcessTime").toFixed(2) + "ms",
                updateLoopAvg: getAvgMetric("updateLoopTime").toFixed(2) + "ms",
                slotErrors: SlotProcessor.errorCount
            },
            cleanup: cleanup?.getCount() || null,
            updateQueue: {
                slots: UpdateQueue.slots.size,
                flags: { ...UpdateQueue.flags }
            }
        };
    }

    // ==========================================
    // STARTUP
    // ==========================================

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }

    // ==========================================
    // PUBLIC API
    // ==========================================

    window.DeltaUI = Object.freeze({
        // Version
        version: MODULE_VERSION,
        
        // Toggle system
        applyToggle,
        
        // Style management
        updateDynamicStyles,
        
        // Color management
        saveSkillbarColors,
        saveCharmColors,
        savePetColor,
        resetToDefaults,
        
        // Keybinds
        setFullscreenKey,
        
        // Config updates
        updateHiddenBuffsConfig,
        updateCCConfig,
        updateFPSConfig,
        
        // Lifecycle
        destroy,
        reinit,
        
        // Debug
        setDebugMode,
        getDebugInfo,
        
        // Internal (for other modules)
        _internal: {
            getToggle,
            formatTime,
            formatNumber,
            colorFromPercent,
            SlotProcessor,
            UpdateQueue
        }
    });

})();
