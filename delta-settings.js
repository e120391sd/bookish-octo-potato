// ==========================================
// DELTA UI SETTINGS v2.1.0
// Settings panel for Delta UI configuration
// ==========================================

(function() {
    "use strict";

    // ==========================================
    // GUARD: Prevent double initialization
    // ==========================================
    if (window.DeltaSettings) {
        console.warn("[DeltaSettings] Already initialized");
        return;
    }

    // ==========================================
    // CONSTANTS
    // ==========================================

    const MODULE_NAME = "DeltaSettings";
    const MODULE_VERSION = "2.1.0";

    // Dependency wait settings
    const DEP_MAX_WAIT = 10000;
    const DEP_CHECK_INTERVAL = 50;

    // Debounce timings
    const DEBOUNCE = {
        COLOR_INPUT: 300,
        PRIORITY_INPUT: 500,
        SLIDER_INPUT: 100
    };

    // Tab identifiers
    const TABS = {
        FEATURES: "features",
        CONTROLS: "controls",
        COLORS: "colors",
        CUSTOMIZATION: "customization",
        ABOUT: "about"
    };

    // CSS selectors
    const SELECTORS = {
        WINDOW: "#delta-settings-window",
        CLOSE_BTN: ".close-btn",
        NAV_CHOICE: ".delta-nav .choice",
        TAB_PANEL: ".tab-panel",
        TOGGLE_CHECKBOX: ".btn.checkbox[data-toggle]",
        BUFF_CHECKBOX: ".btn.checkbox[data-buff-id]",
        FPS_CHECKBOX: ".btn.checkbox[data-fps-id]",
        CC_COLOR_INPUT: ".cc-color-input",
        CC_PRIORITY_INPUT: ".cc-priority-input",
        SKILL_COLOR_INPUT: ".skill-color-input",
        CHARM_COLOR_INPUT: ".charm-color-input",
        PET_COLOR_INPUT: "#pet-color-input",
        PRIORITY_INPUT: ".priority-input",
        TITLEFRAME: ".titleframe"
    };

    // ==========================================
    // STATE
    // ==========================================

    let isInitialized = false;
    let CONFIG = null;
    let DeltaUI = null;
    let DeltaLib = null;

    // Window state
    let settingsWindow = null;
    let isDragging = false;
    let dragOffset = { x: 0, y: 0 };

    // Cleanup tracking
    let cleanup = null;
    let eventListeners = [];

    // Debounced save functions (will be created after init)
    let debouncedSaveSkillbarColors = null;
    let debouncedSaveCharmColors = null;
    let debouncedSavePetColor = null;
    let debouncedSaveCCSettings = null;
    let debouncedSaveFPSSettings = null;
    let debouncedSavePartyPriorities = null;

    // ==========================================
    // LOGGING
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

    // ==========================================
    // DOM UTILITIES
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
     * Create an element with attributes
     * @param {string} tag - HTML tag
     * @param {Object} attrs - Attributes
     * @param {string|Element|Array} children - Children
     * @returns {HTMLElement}
     */
    function createElement(tag, attrs = {}, children = null) {
        if (DeltaLib) return DeltaLib.createElement(tag, attrs, children);

        const el = document.createElement(tag);

        for (const [key, value] of Object.entries(attrs)) {
            if (key === "className") {
                el.className = value;
            } else if (key === "style" && typeof value === "object") {
                Object.assign(el.style, value);
            } else if (key.startsWith("on") && typeof value === "function") {
                const event = key.slice(2).toLowerCase();
                el.addEventListener(event, value);
            } else if (key === "dataset" && typeof value === "object") {
                Object.assign(el.dataset, value);
            } else {
                el.setAttribute(key, value);
            }
        }

        if (children !== null) {
            if (Array.isArray(children)) {
                children.forEach(child => {
                    if (typeof child === "string") {
                        el.appendChild(document.createTextNode(child));
                    } else if (child instanceof Node) {
                        el.appendChild(child);
                    }
                });
            } else if (typeof children === "string") {
                el.textContent = children;
            } else if (children instanceof Node) {
                el.appendChild(children);
            }
        }

        return el;
    }

    // ==========================================
    // VALIDATION UTILITIES
    // ==========================================

    /**
     * Validate hex color format
     * @param {string} color - Color string
     * @returns {boolean}
     */
    function isValidHexColor(color) {
        return /^#[0-9A-F]{6}$/i.test(color);
    }

    /**
     * Validate priority number
     * @param {number} priority - Priority value
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {boolean}
     */
    function isValidPriority(priority, min = 0, max = 10) {
        return typeof priority === "number" && 
               !isNaN(priority) && 
               priority >= min && 
               priority <= max;
    }

    /**
     * Validate keybind character
     * @param {string} key - Key string
     * @returns {boolean}
     */
    function isValidKeybind(key) {
        if (!key || typeof key !== "string") return false;
        // Allow single characters or special keys
        const invalidKeys = ["shift", "control", "alt", "meta", ""];
        return !invalidKeys.includes(key.toLowerCase());
    }

    /**
     * Sanitize string for display
     * @param {string} str - String to sanitize
     * @returns {string}
     */
    function sanitizeString(str) {
        if (typeof str !== "string") return "";
        return str.replace(/[<>]/g, "");
    }

    // ==========================================
    // STORAGE UTILITIES
    // ==========================================

    /**
     * Get toggle value from storage
     * @param {string} key - Toggle key
     * @param {boolean} defaultVal - Default value
     * @returns {boolean}
     */
    function getToggle(key, defaultVal = false) {
        try {
            if (DeltaLib) return DeltaLib.storage.getToggle(key, defaultVal);

            const saved = localStorage.getItem("deltaUI_" + key);
            if (saved !== null) return saved === "true";
            return CONFIG?.defaults?.toggles?.[key] ?? defaultVal;
        } catch (e) {
            log(LogLevel.ERROR, "getToggle failed:", key, e);
            return defaultVal;
        }
    }

    /**
     * Safely get JSON from storage
     * @param {string} key - Storage key
     * @param {*} defaultValue - Default value
     * @returns {*}
     */
    function getStorageJSON(key, defaultValue = {}) {
        try {
            if (DeltaLib) return DeltaLib.storage.getJSON(key, defaultValue);

            const saved = localStorage.getItem(key);
            return saved ? JSON.parse(saved) : defaultValue;
        } catch (e) {
            log(LogLevel.ERROR, "getStorageJSON failed:", key, e);
            return defaultValue;
        }
    }

    /**
     * Safely set JSON to storage
     * @param {string} key - Storage key
     * @param {*} value - Value to store
     * @returns {boolean} Success
     */
    function setStorageJSON(key, value) {
        try {
            if (DeltaLib) return DeltaLib.storage.setJSON(key, value);

            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            log(LogLevel.ERROR, "setStorageJSON failed:", key, e);
            return false;
        }
    }

    /**
     * Get storage value
     * @param {string} key - Storage key
     * @param {string} defaultValue - Default value
     * @returns {string}
     */
    function getStorage(key, defaultValue = "") {
        try {
            if (DeltaLib) return DeltaLib.storage.get(key, defaultValue);
            return localStorage.getItem(key) || defaultValue;
        } catch (e) {
            log(LogLevel.ERROR, "getStorage failed:", key, e);
            return defaultValue;
        }
    }

    /**
     * Set storage value
     * @param {string} key - Storage key
     * @param {string} value - Value to store
     * @returns {boolean} Success
     */
    function setStorage(key, value) {
        try {
            if (DeltaLib) return DeltaLib.storage.set(key, value);
            localStorage.setItem(key, value);
            return true;
        } catch (e) {
            log(LogLevel.ERROR, "setStorage failed:", key, e);
            return false;
        }
    }

    // ==========================================
    // SETTINGS GETTERS
    // ==========================================

    /**
     * Get hidden buffs configuration
     * @returns {Object}
     */
    function getHiddenBuffs() {
        return getStorageJSON(CONFIG.storageKeys.HIDDEN_BUFFS, {});
    }

    /**
     * Get CC settings configuration
     * @returns {Object}
     */
    function getCCSettings() {
        return getStorageJSON(CONFIG.storageKeys.CC_SETTINGS, {});
    }

    /**
     * Get FPS settings configuration
     * @returns {Object}
     */
    function getFPSSettings() {
        try {
            const saved = getStorageJSON(CONFIG.storageKeys.FPS_SETTINGS, null);
            if (saved) return saved;

            // Build defaults
            const defaults = {};
            (CONFIG.fpsOptions || []).forEach(opt => {
                defaults[opt.id] = opt.default;
            });
            return defaults;
        } catch (e) {
            log(LogLevel.ERROR, "getFPSSettings failed:", e);
            return {};
        }
    }

    /**
     * Get party priorities
     * @returns {Object}
     */
    function getPartyPriorities() {
        if (window.DeltaPartyArranger?.getPriorities) {
            return window.DeltaPartyArranger.getPriorities();
        }
        return getStorageJSON(
            CONFIG.storageKeys.PARTY_PRIORITIES,
            CONFIG.defaults.partyPriorities
        );
    }

    // ==========================================
    // SETTINGS SAVERS
    // ==========================================

    /**
     * Save hidden buffs configuration
     * @param {Object} hiddenBuffs - Hidden buffs object
     */
    function saveHiddenBuffs(hiddenBuffs) {
        try {
            setStorageJSON(CONFIG.storageKeys.HIDDEN_BUFFS, hiddenBuffs);
            DeltaUI?.updateHiddenBuffsConfig?.(hiddenBuffs);
            log(LogLevel.DEBUG, "Saved hidden buffs");
        } catch (e) {
            log(LogLevel.ERROR, "saveHiddenBuffs failed:", e);
        }
    }

    /**
     * Save CC settings configuration
     * @param {Object} ccSettings - CC settings object
     */
    function saveCCSettings(ccSettings) {
        try {
            setStorageJSON(CONFIG.storageKeys.CC_SETTINGS, ccSettings);
            DeltaUI?.updateCCConfig?.(ccSettings);
            log(LogLevel.DEBUG, "Saved CC settings");
        } catch (e) {
            log(LogLevel.ERROR, "saveCCSettings failed:", e);
        }
    }

    /**
     * Save FPS settings configuration
     * @param {Object} fpsSettings - FPS settings object
     */
    function saveFPSSettings(fpsSettings) {
        try {
            setStorageJSON(CONFIG.storageKeys.FPS_SETTINGS, fpsSettings);
            DeltaUI?.updateFPSConfig?.(fpsSettings);
            log(LogLevel.DEBUG, "Saved FPS settings");
        } catch (e) {
            log(LogLevel.ERROR, "saveFPSSettings failed:", e);
        }
    }

    /**
     * Save party priorities
     * @param {Object} priorities - Priority object
     */
    function savePartyPriorities(priorities) {
        try {
            setStorageJSON(CONFIG.storageKeys.PARTY_PRIORITIES, priorities);
            log(LogLevel.DEBUG, "Saved party priorities");
        } catch (e) {
            log(LogLevel.ERROR, "savePartyPriorities failed:", e);
        }
    }

    // ==========================================
    // DEBOUNCE UTILITY
    // ==========================================

    /**
     * Create a debounced function
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in ms
     * @returns {Function}
     */
    function debounce(func, wait) {
        if (DeltaLib) return DeltaLib.timers.debounce(func, wait);

        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Initialize debounced save functions
     */
    function initDebouncedFunctions() {
        debouncedSaveSkillbarColors = debounce(() => {
            DeltaUI?.saveSkillbarColors?.();
            DeltaUI?.updateDynamicStyles?.();
        }, DEBOUNCE.COLOR_INPUT);

        debouncedSaveCharmColors = debounce(() => {
            DeltaUI?.saveCharmColors?.();
            DeltaUI?.updateDynamicStyles?.();
        }, DEBOUNCE.COLOR_INPUT);

        debouncedSavePetColor = debounce(() => {
            DeltaUI?.savePetColor?.();
            DeltaUI?.updateDynamicStyles?.();
        }, DEBOUNCE.COLOR_INPUT);

        debouncedSaveCCSettings = debounce((settings) => {
            saveCCSettings(settings);
        }, DEBOUNCE.COLOR_INPUT);

        debouncedSaveFPSSettings = debounce((settings) => {
            saveFPSSettings(settings);
        }, DEBOUNCE.PRIORITY_INPUT);

        debouncedSavePartyPriorities = debounce((priorities) => {
            savePartyPriorities(priorities);
        }, DEBOUNCE.PRIORITY_INPUT);
    }

    // ==========================================
    // SKILLBAR SCANNER
    // ==========================================

    /**
     * Scan skillbar for slot information
     * @returns {Array} Array of slot info objects
     */
    function scanSkillbar() {
        const slots = [];

        try {
            const skillbar = document.querySelector("#skillbar");
            if (!skillbar) return slots;

            skillbar.querySelectorAll(".slot[id]").forEach(slot => {
                const id = slot.id;
                if (id && id.startsWith("sk")) {
                    const keyText = slot.querySelector(".slottext.key");
                    const keybind = keyText 
                        ? keyText.textContent.trim() 
                        : id.replace("sk", "").toUpperCase();
                    
                    slots.push({
                        id,
                        keybind: sanitizeString(keybind),
                        color: CONFIG.skillbarColors[id] || "#ffffff"
                    });
                }
            });
        } catch (e) {
            log(LogLevel.ERROR, "scanSkillbar failed:", e);
        }

        return slots;
    }

    // ==========================================
    // HTML GENERATORS
    // ==========================================

    /**
     * Generate skillbar color rows HTML
     * @param {Array} slots - Slot info array
     * @returns {string}
     */
    function generateSkillbarColorRows(slots) {
        try {
            if (slots.length === 0) {
                // Fallback to config
                return Object.entries(CONFIG.skillbarColors || {}).map(([id, color]) => {
                    const key = id.replace("sk", "").toUpperCase();
                    return `
                        <div>Slot ${sanitizeString(key)}</div>
                        <div class="color-input-wrapper">
                            <div class="color-preview" style="background: ${color};"></div>
                            <input type="color" class="skill-color-input" data-skill-id="${id}" value="${color}">
                        </div>
                    `;
                }).join("");
            }

            return slots.map(slot => `
                <div>Slot <span class="keybind-badge">${sanitizeString(slot.keybind)}</span></div>
                <div class="color-input-wrapper">
                    <div class="color-preview" style="background: ${slot.color};"></div>
                    <input type="color" class="skill-color-input" data-skill-id="${slot.id}" value="${slot.color}">
                </div>
            `).join("");
        } catch (e) {
            log(LogLevel.ERROR, "generateSkillbarColorRows failed:", e);
            return '<div class="textgrey">Failed to load skillbar colors</div>';
        }
    }

    /**
     * Generate charm color rows HTML
     * @returns {string}
     */
    function generateCharmColorRows() {
        try {
            return Object.entries(CONFIG.charmColors || {}).map(([charm, color]) => {
                const name = CONFIG.charmNames?.[charm] || charm;
                return `
                    <div>${sanitizeString(name)}</div>
                    <div class="color-input-wrapper">
                        <div class="color-preview" style="background: ${color};"></div>
                        <input type="color" class="charm-color-input" data-charm-id="${charm}" value="${color}">
                    </div>
                `;
            }).join("");
        } catch (e) {
            log(LogLevel.ERROR, "generateCharmColorRows failed:", e);
            return '<div class="textgrey">Failed to load charm colors</div>';
        }
    }

    /**
     * Generate buff toggle rows HTML
     * @returns {string}
     */
    function generateBuffToggleRows() {
        try {
            const hiddenBuffs = getHiddenBuffs();
            const classes = ["warrior", "archer", "mage", "shaman"];
            let html = '';

            classes.forEach(className => {
                const buffs = (CONFIG.buffIcons || {})[className] || [];
                if (buffs.length === 0) return;

                const displayName = className.charAt(0).toUpperCase() + className.slice(1);
                html += `
                    <h4 class="textprimary class-header">${displayName}</h4>
                    <div class="settings fps-settings">
                `;

                buffs.forEach(buff => {
                    const isHidden = hiddenBuffs[buff.id] === true;
                    html += `
                        <div class="fps-row">
                            <img src="${buff.src}" class="buff-icon" alt="${sanitizeString(buff.name)}" 
                                 style="width:20px;height:20px;margin-right:8px;border-radius:3px;">
                            <span class="fps-name">${sanitizeString(buff.name)}</span>
                        </div>
                        <div class="btn checkbox ${isHidden ? "active" : ""}" data-buff-id="${buff.id}"></div>
                    `;
                });

                html += '</div>';
            });

            // Utility buffs
            const utilityBuffs = CONFIG.utilityBuffs || [];
            if (utilityBuffs.length > 0) {
                html += `
                    <h4 class="textprimary class-header">Utility</h4>
                    <div class="settings fps-settings">
                `;

                utilityBuffs.forEach(buff => {
                    const isHidden = hiddenBuffs[buff.id] === true;
                    html += `
                        <div class="fps-row">
                            <img src="${buff.src}" class="buff-icon" alt="${sanitizeString(buff.name)}" 
                                 style="width:20px;height:20px;margin-right:8px;border-radius:3px;">
                            <span class="fps-name">${sanitizeString(buff.name)}</span>
                        </div>
                        <div class="btn checkbox ${isHidden ? "active" : ""}" data-buff-id="${buff.id}"></div>
                    `;
                });

                html += '</div>';
            }

            return html;
        } catch (e) {
            log(LogLevel.ERROR, "generateBuffToggleRows failed:", e);
            return '<div class="textgrey">Failed to load buff options</div>';
        }
    }

    /**
     * Generate CC settings rows HTML
     * @returns {string}
     */
    function generateCCRows() {
        try {
            const ccSettings = getCCSettings();
            let html = '';

            (CONFIG.ccEffects || []).forEach(cc => {
                const settings = ccSettings[cc.id] || { 
                    color: cc.color, 
                    priority: cc.priority 
                };

                html += `
                    <div class="cc-row">
                        <img src="${cc.src}" class="cc-icon" alt="${sanitizeString(cc.name)}">
                        <span class="cc-name">${sanitizeString(cc.name)}</span>
                    </div>
                    <div class="cc-controls">
                        <div class="color-input-wrapper">
                            <div class="color-preview cc-color-preview" style="background: ${settings.color};"></div>
                            <input type="color" class="cc-color-input" data-cc-id="${cc.id}" value="${settings.color}">
                        </div>
                        <input type="number" class="cc-priority-input" data-cc-id="${cc.id}" 
                               value="${settings.priority}" min="0" max="10" title="Priority (0 = disabled)">
                    </div>
                `;
            });

            return html;
        } catch (e) {
            log(LogLevel.ERROR, "generateCCRows failed:", e);
            return '<div class="textgrey">Failed to load CC options</div>';
        }
    }

    /**
     * Generate FPS options rows HTML
     * @returns {string}
     */
    function generateFPSRows() {
        try {
            const fpsSettings = getFPSSettings();
            let html = '';

            (CONFIG.fpsOptions || []).forEach(opt => {
                const isEnabled = fpsSettings[opt.id] !== undefined 
                    ? fpsSettings[opt.id] 
                    : opt.default;

                html += `
                    <div class="fps-row">
                        <span class="fps-name">${sanitizeString(opt.name)}</span>
                    </div>
                    <div class="btn checkbox ${isEnabled ? "active" : ""}" data-fps-id="${opt.id}"></div>
                `;
            });

            return html;
        } catch (e) {
            log(LogLevel.ERROR, "generateFPSRows failed:", e);
            return '<div class="textgrey">Failed to load FPS options</div>';
        }
    }

    /**
     * Generate party priority rows HTML
     * @returns {string}
     */
    function generatePartyPriorityRows() {
        try {
            const priorities = getPartyPriorities();
            const classes = [
                { id: "shaman", icon: "3", name: "Shaman" },
                { id: "archer", icon: "2", name: "Archer" },
                { id: "mage", icon: "1", name: "Mage" },
                { id: "warrior", icon: "0", name: "Warrior" }
            ];

            return classes.map(cls => `
                <div class="priority-row">
                    <img src="/data/ui/classes/${cls.icon}.avif" class="class-icon" alt="${cls.name}">
                    <span class="priority-name">${cls.name}</span>
                </div>
                <input type="number" class="priority-input" data-class="${cls.id}" 
                       value="${priorities[cls.id] || 1}" min="1" max="4">
            `).join("");
        } catch (e) {
            log(LogLevel.ERROR, "generatePartyPriorityRows failed:", e);
            return '<div class="textgrey">Failed to load priority options</div>';
        }
    }

    // ==========================================
    // WINDOW MANAGEMENT
    // ==========================================

    /**
     * Close the settings window
     */
    function closeWindow() {
        if (settingsWindow) {
            // Cleanup event listeners
            cleanupEventListeners();

            settingsWindow.remove();
            settingsWindow = null;
            log(LogLevel.DEBUG, "Settings window closed");
        }
        isDragging = false;
    }

    /**
     * Toggle settings window visibility
     */
    function toggleWindow() {
        if (settingsWindow && document.contains(settingsWindow)) {
            closeWindow();
        } else {
            createWindow();
        }
    }

    /**
     * Open settings window
     */
    function openWindow() {
        if (!settingsWindow || !document.contains(settingsWindow)) {
            createWindow();
        }
    }

    /**
     * Update customization section visibility based on feature toggle
     * @param {string} toggleId - Toggle identifier
     * @param {boolean} isEnabled - Toggle state
     */
    function updateCustomizationVisibility(toggleId, isEnabled) {
        if (!settingsWindow) return;

        try {
            const notice = $(`.customization-notice[data-for="${toggleId}"]`, settingsWindow);
            const section = $(`.customization-section[data-for="${toggleId}"]`, settingsWindow);

            if (notice) {
                notice.style.display = isEnabled ? "none" : "block";
            }

            if (section) {
                section.style.opacity = isEnabled ? "1" : "0.5";
                section.style.pointerEvents = isEnabled ? "auto" : "none";
            }
        } catch (e) {
            log(LogLevel.ERROR, "updateCustomizationVisibility failed:", e);
        }
    }

    /**
     * Update color preview element
     * @param {HTMLInputElement} input - Color input element
     */
    function updateColorPreview(input) {
        try {
            const preview = input.previousElementSibling;
            if (preview && preview.classList.contains("color-preview")) {
                preview.style.background = input.value;
            }
        } catch (e) {
            log(LogLevel.ERROR, "updateColorPreview failed:", e);
        }
    }

    /**
     * Show feedback on button (e.g., "Copied!")
     * @param {HTMLElement} button - Button element
     * @param {string} message - Feedback message
     * @param {number} duration - Duration in ms
     */
    function showButtonFeedback(button, message, duration = 1500) {
        const originalText = button.textContent;
        button.textContent = message;
        button.classList.add("success");

        setTimeout(() => {
            button.textContent = originalText;
            button.classList.remove("success");
        }, duration);
    }

    // ==========================================
    // EXPORT/IMPORT FUNCTIONALITY
    // ==========================================

    /**
     * Export all settings to JSON object
     * @returns {Object}
     */
    function exportAllSettings() {
        try {
            const data = {
                version: CONFIG.version,
                exportedAt: new Date().toISOString(),
                settings: {
                    toggles: {},
                    skillbarColors: { ...CONFIG.skillbarColors },
                    charmColors: { ...CONFIG.charmColors },
                    petColor: CONFIG.petColor,
                    hiddenBuffs: getHiddenBuffs(),
                    ccSettings: getCCSettings(),
                    fpsSettings: getFPSSettings(),
                    partyPriorities: getPartyPriorities(),
                    keybinds: {
                        fullscreen: getStorage("deltaUI_fullscreenKey", "o"),
                        fameReset: getStorage("deltaUI_fameResetKey", "["),
                        partyReset: getStorage("deltaUI_partyResetKey", "]")
                    },
                    canvasScale: parseFloat(getStorage("deltaUI_canvasScale", "1.0"))
                }
            };

            // Export all toggles
            const toggleKeys = Object.keys(CONFIG.defaults.toggles || {});
            toggleKeys.forEach(key => {
                data.settings.toggles[key] = getToggle(key);
            });

            return data;
        } catch (e) {
            log(LogLevel.ERROR, "exportAllSettings failed:", e);
            return null;
        }
    }

    /**
     * Import settings from JSON object
     * @param {Object} data - Settings data
     * @returns {boolean} Success
     */
    function importSettings(data) {
        try {
            if (!data || !data.settings) {
                throw new Error("Invalid settings format");
            }

            const { settings } = data;

            // Version compatibility check
            if (data.version && data.version !== CONFIG.version) {
                log(LogLevel.WARN, `Importing from different version: ${data.version} -> ${CONFIG.version}`);
            }

            // Import toggles
            if (settings.toggles) {
                Object.entries(settings.toggles).forEach(([key, value]) => {
                    setStorage(`deltaUI_${key}`, String(value));
                });
            }

            // Import colors
            if (settings.skillbarColors) {
                Object.entries(settings.skillbarColors).forEach(([key, value]) => {
                    if (isValidHexColor(value)) {
                        CONFIG.skillbarColors[key] = value;
                    }
                });
                DeltaUI?.saveSkillbarColors?.();
            }

            if (settings.charmColors) {
                Object.entries(settings.charmColors).forEach(([key, value]) => {
                    if (isValidHexColor(value)) {
                        CONFIG.charmColors[key] = value;
                    }
                });
                DeltaUI?.saveCharmColors?.();
            }

            if (settings.petColor && isValidHexColor(settings.petColor)) {
                CONFIG.petColor = settings.petColor;
                DeltaUI?.savePetColor?.();
            }

            // Import other settings
            if (settings.hiddenBuffs) {
                saveHiddenBuffs(settings.hiddenBuffs);
            }

            if (settings.ccSettings) {
                saveCCSettings(settings.ccSettings);
            }

            if (settings.fpsSettings) {
                saveFPSSettings(settings.fpsSettings);
            }

            if (settings.partyPriorities) {
                savePartyPriorities(settings.partyPriorities);
            }

            // Import keybinds
            if (settings.keybinds) {
                if (isValidKeybind(settings.keybinds.fullscreen)) {
                    setStorage("deltaUI_fullscreenKey", settings.keybinds.fullscreen);
                }
                if (isValidKeybind(settings.keybinds.fameReset)) {
                    setStorage("deltaUI_fameResetKey", settings.keybinds.fameReset);
                }
                if (isValidKeybind(settings.keybinds.partyReset)) {
                    setStorage("deltaUI_partyResetKey", settings.keybinds.partyReset);
                }
            }

            // Import canvas scale
            if (typeof settings.canvasScale === "number") {
                const scale = Math.max(0.1, Math.min(2.5, settings.canvasScale));
                setStorage("deltaUI_canvasScale", scale.toString());
            }

            // Update dynamic styles
            DeltaUI?.updateDynamicStyles?.();

            log(LogLevel.INFO, "Settings imported successfully");
            return true;

        } catch (e) {
            log(LogLevel.ERROR, "importSettings failed:", e);
            return false;
        }
    }

    /**
     * Export settings to file
     */
    function exportToFile() {
        try {
            const data = exportAllSettings();
            if (!data) {
                alert("Failed to export settings");
                return;
            }

            const json = JSON.stringify(data, null, 2);
            const blob = new Blob([json], { type: "application/json" });
            const url = URL.createObjectURL(blob);

            const timestamp = new Date().toISOString().slice(0, 10);
            const filename = `delta-ui-settings-${timestamp}.json`;

            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            URL.revokeObjectURL(url);
            log(LogLevel.INFO, "Settings exported to file:", filename);

        } catch (e) {
            log(LogLevel.ERROR, "exportToFile failed:", e);
            alert("Failed to export settings");
        }
    }

    /**
     * Import settings from file
     */
    function importFromFile() {
        try {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = ".json";

            input.addEventListener("change", (e) => {
                const file = e.target.files[0];
                if (!file) return;

                const reader = new FileReader();

                reader.onload = (event) => {
                    try {
                        const data = JSON.parse(event.target.result);

                        if (importSettings(data)) {
                            alert("✅ Settings imported successfully!\nReloading page...");
                            setTimeout(() => location.reload(), 500);
                        } else {
                            alert("❌ Failed to import settings");
                        }
                    } catch (parseError) {
                        log(LogLevel.ERROR, "Failed to parse import file:", parseError);
                        alert("❌ Invalid JSON file");
                    }
                };

                reader.onerror = () => {
                    alert("❌ Failed to read file");
                };

                reader.readAsText(file);
            });

            input.click();

        } catch (e) {
            log(LogLevel.ERROR, "importFromFile failed:", e);
            alert("Failed to import settings");
        }
    }

    /**
     * Export to clipboard
     */
    function exportToClipboard() {
        try {
            const data = exportAllSettings();
            if (!data) {
                throw new Error("Export failed");
            }

            const json = JSON.stringify(data, null, 2);
            navigator.clipboard.writeText(json).then(() => {
                log(LogLevel.INFO, "Settings copied to clipboard");
            }).catch(e => {
                log(LogLevel.ERROR, "Clipboard write failed:", e);
                // Fallback: show in prompt
                prompt("Copy these settings:", json);
            });

            return true;
        } catch (e) {
            log(LogLevel.ERROR, "exportToClipboard failed:", e);
            return false;
        }
    }

    /**
     * Import from clipboard/prompt
     */
    function importFromClipboard() {
        const json = prompt("Paste your settings JSON:");
        if (!json) return false;

        try {
            const data = JSON.parse(json);
            return importSettings(data);
        } catch (e) {
            log(LogLevel.ERROR, "importFromClipboard failed:", e);
            alert("❌ Invalid JSON format");
            return false;
        }
    }

    // ==========================================
    // VALIDATION & DIAGNOSTICS
    // ==========================================

    /**
     * Validate all settings
     * @returns {Object} Validation result
     */
    function validateSettings() {
        const issues = [];
        const warnings = [];

        try {
            // Check storage quota
            const storageUsed = JSON.stringify(localStorage).length;
            const maxStorage = 5 * 1024 * 1024; // 5MB typical limit
            const usagePercent = (storageUsed / maxStorage) * 100;

            if (usagePercent > 80) {
                warnings.push(`Storage usage at ${usagePercent.toFixed(1)}%`);
            }

            // Validate color formats
            Object.entries(CONFIG.skillbarColors || {}).forEach(([key, color]) => {
                if (!isValidHexColor(color)) {
                    issues.push(`Invalid skillbar color for ${key}: ${color}`);
                }
            });

            Object.entries(CONFIG.charmColors || {}).forEach(([key, color]) => {
                if (!isValidHexColor(color)) {
                    issues.push(`Invalid charm color for ${key}: ${color}`);
                }
            });

            if (CONFIG.petColor && !isValidHexColor(CONFIG.petColor)) {
                issues.push(`Invalid pet color: ${CONFIG.petColor}`);
            }

            // Check for duplicate keybinds
            const keybinds = {
                fullscreen: getStorage("deltaUI_fullscreenKey", "o"),
                fameReset: getStorage("deltaUI_fameResetKey", "["),
                partyReset: getStorage("deltaUI_partyResetKey", "]")
            };

            const keybindValues = Object.values(keybinds);
            const uniqueValues = new Set(keybindValues);

            if (uniqueValues.size !== keybindValues.length) {
                warnings.push("Duplicate keybinds detected");
            }

            // Validate canvas scale
            const canvasScale = parseFloat(getStorage("deltaUI_canvasScale", "1.0"));
            if (isNaN(canvasScale) || canvasScale < 0.1 || canvasScale > 2.5) {
                issues.push(`Invalid canvas scale: ${canvasScale}`);
            }

        } catch (e) {
            log(LogLevel.ERROR, "validateSettings failed:", e);
            issues.push("Validation error: " + e.message);
        }

        return {
            valid: issues.length === 0,
            issues,
            warnings
        };
    }

    // ==========================================
    // EVENT LISTENER MANAGEMENT
    // ==========================================

    /**
     * Add an event listener and track it for cleanup
     * @param {Element} element - Target element
     * @param {string} event - Event type
     * @param {Function} handler - Event handler
     * @param {Object} options - Event options
     */
    function addTrackedListener(element, event, handler, options = false) {
        if (!element) return;

        try {
            element.addEventListener(event, handler, options);
            eventListeners.push({ element, event, handler, options });
        } catch (e) {
            log(LogLevel.ERROR, "addTrackedListener failed:", e);
        }
    }

    /**
     * Cleanup all tracked event listeners
     */
    function cleanupEventListeners() {
        eventListeners.forEach(({ element, event, handler, options }) => {
            try {
                element.removeEventListener(event, handler, options);
            } catch (e) {
                // Element may have been removed
            }
        });
        eventListeners = [];
    }

    // ==========================================
    // EVENT SETUP
    // ==========================================

    /**
     * Setup all event listeners for the settings window
     */
    function setupEventListeners() {
        if (!settingsWindow) return;

        try {
            // Close button
            const closeBtn = $(SELECTORS.CLOSE_BTN, settingsWindow);
            if (closeBtn) {
                addTrackedListener(closeBtn, "click", closeWindow);
            }

            // Tab navigation
            setupTabNavigation();

            // Toggle checkboxes
            setupToggleCheckboxes();

            // Buff checkboxes
            setupBuffCheckboxes();

            // FPS checkboxes
            setupFPSCheckboxes();

            // CC inputs
            setupCCInputs();

            // Color inputs
            setupColorInputs();

            // Priority inputs
            setupPriorityInputs();

            // Keybind inputs
            setupKeybindInputs();

            // Canvas scale slider
            setupCanvasScaleSlider();

            // Action buttons
            setupActionButtons();

            // Drag functionality
            setupDragFunctionality();

            log(LogLevel.DEBUG, "Event listeners setup complete");

        } catch (e) {
            log(LogLevel.ERROR, "setupEventListeners failed:", e);
        }
    }

    /**
     * Setup tab navigation
     */
    function setupTabNavigation() {
        $$(SELECTORS.NAV_CHOICE, settingsWindow).forEach(choice => {
            addTrackedListener(choice, "click", () => {
                try {
                    const targetTab = choice.dataset.tab;

                    // Update nav active state
                    $$(SELECTORS.NAV_CHOICE, settingsWindow).forEach(c => {
                        c.classList.remove("active");
                    });
                    choice.classList.add("active");

                    // Update panel visibility
                    $$(SELECTORS.TAB_PANEL, settingsWindow).forEach(panel => {
                        panel.classList.toggle("active", panel.dataset.panel === targetTab);
                    });

                } catch (e) {
                    log(LogLevel.ERROR, "Tab navigation error:", e);
                }
            });
        });
    }

    /**
     * Setup toggle checkboxes
     */
    function setupToggleCheckboxes() {
        $$(SELECTORS.TOGGLE_CHECKBOX, settingsWindow).forEach(checkbox => {
            addTrackedListener(checkbox, "click", () => {
                try {
                    const toggleId = checkbox.dataset.toggle;
                    const isNowActive = !checkbox.classList.contains("active");

                    checkbox.classList.toggle("active");
                    setStorage(`deltaUI_${toggleId}`, isNowActive.toString());

                    DeltaUI?.applyToggle?.(toggleId, isNowActive);

                    // Update customization visibility for related toggles
                    const customizationToggles = ["hideBuffs", "ccIndicator", "fpsMode", "partyAutoSort"];
                    if (customizationToggles.includes(toggleId)) {
                        updateCustomizationVisibility(toggleId, isNowActive);
                    }

                    log(LogLevel.DEBUG, `Toggle ${toggleId} = ${isNowActive}`);

                } catch (e) {
                    log(LogLevel.ERROR, "Toggle checkbox error:", e);
                }
            });
        });
    }

    /**
     * Setup buff checkboxes
     */
    function setupBuffCheckboxes() {
        $$(SELECTORS.BUFF_CHECKBOX, settingsWindow).forEach(checkbox => {
            addTrackedListener(checkbox, "click", () => {
                try {
                    const buffId = checkbox.dataset.buffId;
                    const isNowActive = !checkbox.classList.contains("active");

                    checkbox.classList.toggle("active");

                    const hiddenBuffs = getHiddenBuffs();
                    hiddenBuffs[buffId] = isNowActive;
                    saveHiddenBuffs(hiddenBuffs);

                } catch (e) {
                    log(LogLevel.ERROR, "Buff checkbox error:", e);
                }
            });
        });
    }

    /**
     * Setup FPS checkboxes
     */
    function setupFPSCheckboxes() {
        $$(SELECTORS.FPS_CHECKBOX, settingsWindow).forEach(checkbox => {
            addTrackedListener(checkbox, "click", () => {
                try {
                    const fpsId = checkbox.dataset.fpsId;
                    const isNowActive = !checkbox.classList.contains("active");

                    checkbox.classList.toggle("active");

                    const fpsSettings = getFPSSettings();
                    fpsSettings[fpsId] = isNowActive;
                    debouncedSaveFPSSettings(fpsSettings);

                } catch (e) {
                    log(LogLevel.ERROR, "FPS checkbox error:", e);
                }
            });
        });
    }

    /**
     * Setup CC inputs (color and priority)
     */
    function setupCCInputs() {
        // CC color inputs
        $$(SELECTORS.CC_COLOR_INPUT, settingsWindow).forEach(input => {
            addTrackedListener(input, "input", (e) => {
                try {
                    const ccId = e.target.dataset.ccId;
                    const color = e.target.value;

                    if (!isValidHexColor(color)) return;

                    updateColorPreview(e.target);

                    const ccSettings = getCCSettings();
                    if (!ccSettings[ccId]) {
                        ccSettings[ccId] = { color, priority: 1 };
                    } else {
                        ccSettings[ccId].color = color;
                    }

                    debouncedSaveCCSettings(ccSettings);

                } catch (e) {
                    log(LogLevel.ERROR, "CC color input error:", e);
                }
            });
        });

        // CC priority inputs
        $$(SELECTORS.CC_PRIORITY_INPUT, settingsWindow).forEach(input => {
            addTrackedListener(input, "input", (e) => {
                try {
                    const ccId = e.target.dataset.ccId;
                    const priority = parseInt(e.target.value, 10) || 0;

                    if (!isValidPriority(priority, 0, 10)) return;

                    const ccSettings = getCCSettings();
                    if (!ccSettings[ccId]) {
                        ccSettings[ccId] = { color: "#ffffff", priority };
                    } else {
                        ccSettings[ccId].priority = priority;
                    }

                    debouncedSaveCCSettings(ccSettings);

                } catch (e) {
                    log(LogLevel.ERROR, "CC priority input error:", e);
                }
            });
        });
    }

    /**
     * Setup color inputs (skillbar, charm, pet)
     */
    function setupColorInputs() {
        // Skillbar colors
        $$(SELECTORS.SKILL_COLOR_INPUT, settingsWindow).forEach(input => {
            addTrackedListener(input, "input", (e) => {
                try {
                    const skillId = e.target.dataset.skillId;
                    const color = e.target.value;

                    if (!isValidHexColor(color)) return;

                    CONFIG.skillbarColors[skillId] = color;
                    updateColorPreview(e.target);
                    debouncedSaveSkillbarColors();

                } catch (e) {
                    log(LogLevel.ERROR, "Skill color input error:", e);
                }
            });
        });

        // Charm colors
        $$(SELECTORS.CHARM_COLOR_INPUT, settingsWindow).forEach(input => {
            addTrackedListener(input, "input", (e) => {
                try {
                    const charmId = e.target.dataset.charmId;
                    const color = e.target.value;

                    if (!isValidHexColor(color)) return;

                    CONFIG.charmColors[charmId] = color;
                    updateColorPreview(e.target);
                    debouncedSaveCharmColors();

                } catch (e) {
                    log(LogLevel.ERROR, "Charm color input error:", e);
                }
            });
        });

        // Pet color
        const petInput = $(SELECTORS.PET_COLOR_INPUT, settingsWindow);
        if (petInput) {
            addTrackedListener(petInput, "input", (e) => {
                try {
                    const color = e.target.value;

                    if (!isValidHexColor(color)) return;

                    CONFIG.petColor = color;

                    const preview = $("#pet-preview", settingsWindow);
                    if (preview) preview.style.background = color;

                    debouncedSavePetColor();

                } catch (e) {
                    log(LogLevel.ERROR, "Pet color input error:", e);
                }
            });
        }
    }

    /**
     * Setup priority inputs
     */
    function setupPriorityInputs() {
        $$(SELECTORS.PRIORITY_INPUT, settingsWindow).forEach(input => {
            addTrackedListener(input, "input", (e) => {
                try {
                    const className = e.target.dataset.class;
                    const priority = parseInt(e.target.value, 10) || 1;

                    if (!isValidPriority(priority, 1, 4)) {
                        e.target.value = Math.max(1, Math.min(4, priority));
                        return;
                    }

                    // Update via DeltaPartyArranger if available
                    if (window.DeltaPartyArranger?.setPriority) {
                        window.DeltaPartyArranger.setPriority(className, priority);
                    } else {
                        // Fallback: save directly
                        const priorities = getPartyPriorities();
                        priorities[className] = priority;
                        debouncedSavePartyPriorities(priorities);
                    }

                } catch (e) {
                    log(LogLevel.ERROR, "Priority input error:", e);
                }
            });
        });
    }

    /**
     * Setup keybind inputs
     */
    function setupKeybindInputs() {
        const keybindConfigs = [
            { inputId: "fullscreen-key-input", clearId: "clear-fullscreen-key", storageKey: "deltaUI_fullscreenKey", default: "o", setter: DeltaUI?.setFullscreenKey },
            { inputId: "fame-reset-key-input", clearId: "clear-fame-reset-key", storageKey: "deltaUI_fameResetKey", default: "[", setter: window.FameNotifier?.setResetKey },
            { inputId: "party-reset-key-input", clearId: "clear-party-reset-key", storageKey: "deltaUI_partyResetKey", default: "]", setter: window.DeltaPartyArranger?.setResetKey }
        ];

        keybindConfigs.forEach(config => {
            const input = $(`#${config.inputId}`, settingsWindow);
            const clearBtn = $(`#${config.clearId}`, settingsWindow);

            if (input) {
                // Click to start capture
                addTrackedListener(input, "click", () => {
                    input.value = "";
                    input.placeholder = "Press a key...";
                    input.classList.add("capturing");
                });

                // Capture key press
                addTrackedListener(input, "keydown", (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    const key = e.key.toLowerCase();

                    if (!isValidKeybind(key)) return;

                    const displayKey = key.length === 1 ? key.toUpperCase() : key;
                    input.value = displayKey;
                    input.classList.remove("capturing");

                    setStorage(config.storageKey, key);
                    config.setter?.(key);

                    input.blur();
                });

                // Restore on blur if empty
                addTrackedListener(input, "blur", () => {
                    input.classList.remove("capturing");
                    const currentKey = getStorage(config.storageKey, config.default);
                    if (!input.value) {
                        input.value = currentKey.length === 1 ? currentKey.toUpperCase() : currentKey;
                    }
                    input.placeholder = "Press a key";
                });
            }

            // Clear button
            if (clearBtn) {
                addTrackedListener(clearBtn, "click", () => {
                    if (input) {
                        input.value = config.default.length === 1 ? config.default.toUpperCase() : config.default;
                    }
                    setStorage(config.storageKey, config.default);
                    config.setter?.(config.default);
                });
            }
        });
    }

    /**
     * Setup canvas scale slider
     */
    function setupCanvasScaleSlider() {
        const slider = $("#canvas-scale-slider", settingsWindow);
        const valueDisplay = $("#canvas-scale-value", settingsWindow);

        if (slider) {
            addTrackedListener(slider, "input", (e) => {
                try {
                    const value = parseFloat(e.target.value);

                    if (isNaN(value) || value < 0.1 || value > 2.5) return;

                    if (valueDisplay) {
                        valueDisplay.textContent = value.toFixed(1) + "x";
                    }

                    setStorage("deltaUI_canvasScale", value.toString());

                    if (window.DeltaCanvasScaler?.setScale) {
                        window.DeltaCanvasScaler.setScale(value);
                    }

                } catch (e) {
                    log(LogLevel.ERROR, "Canvas scale slider error:", e);
                }
            });
        }
    }

    /**
     * Setup action buttons
     */
    function setupActionButtons() {
        // Export to clipboard
        const exportBtn = $("#export-colors", settingsWindow);
        if (exportBtn) {
            addTrackedListener(exportBtn, "click", () => {
                if (exportToClipboard()) {
                    showButtonFeedback(exportBtn, "Copied!");
                }
            });
        }

        // Import from clipboard
        const importBtn = $("#import-colors", settingsWindow);
        if (importBtn) {
            addTrackedListener(importBtn, "click", () => {
                if (importFromClipboard()) {
                    showButtonFeedback(importBtn, "Imported!");
                    setTimeout(() => createWindow(), 500); // Refresh window
                }
            });
        }

        // Export to file
        const exportFileBtn = $("#export-to-file", settingsWindow);
        if (exportFileBtn) {
            addTrackedListener(exportFileBtn, "click", () => {
                exportToFile();
                showButtonFeedback(exportFileBtn, "Downloaded!");
            });
        }

        // Import from file
        const importFileBtn = $("#import-from-file", settingsWindow);
        if (importFileBtn) {
            addTrackedListener(importFileBtn, "click", importFromFile);
        }

        // Reset to defaults
        const resetBtn = $("#reset-all-colors", settingsWindow);
        if (resetBtn) {
            addTrackedListener(resetBtn, "click", () => {
                if (confirm("Reset all colors to defaults? This cannot be undone.")) {
                    DeltaUI?.resetToDefaults?.();
                    DeltaUI?.updateDynamicStyles?.();
                    showButtonFeedback(resetBtn, "Reset!");
                    setTimeout(() => createWindow(), 500); // Refresh window
                }
            });
        }

        // Validate settings
        const validateBtn = $("#validate-settings", settingsWindow);
        if (validateBtn) {
            addTrackedListener(validateBtn, "click", () => {
                const result = validateSettings();
                let message = "";

                if (result.valid && result.warnings.length === 0) {
                    message = "✅ All settings valid!";
                } else {
                    if (result.issues.length > 0) {
                        message += "❌ Issues:\n" + result.issues.join("\n") + "\n\n";
                    }
                    if (result.warnings.length > 0) {
                        message += "⚠️ Warnings:\n" + result.warnings.join("\n");
                    }
                }

                alert(message);
            });
        }
    }

    /**
     * Setup drag functionality
     */
    function setupDragFunctionality() {
        const titleframe = $(SELECTORS.TITLEFRAME, settingsWindow);
        if (!titleframe) return;

        addTrackedListener(titleframe, "mousedown", (e) => {
            // Ignore clicks on buttons
            if (e.target.closest(".close-btn") || e.target.closest(".btn")) return;

            isDragging = true;

            const rect = settingsWindow.getBoundingClientRect();
            dragOffset.x = e.clientX - rect.left;
            dragOffset.y = e.clientY - rect.top;

            // Remove centering transform
            settingsWindow.style.transform = "none";
            settingsWindow.style.left = rect.left + "px";
            settingsWindow.style.top = rect.top + "px";

            e.preventDefault();
        });

        // Document-level mouse move (tracked separately for cleanup)
        const mouseMoveHandler = (e) => {
            if (!isDragging || !settingsWindow) return;

            let x = e.clientX - dragOffset.x;
            let y = e.clientY - dragOffset.y;

            // Bound to window
            const rect = settingsWindow.getBoundingClientRect();
            x = Math.max(0, Math.min(x, window.innerWidth - rect.width));
            y = Math.max(0, Math.min(y, window.innerHeight - rect.height));

            settingsWindow.style.left = x + "px";
            settingsWindow.style.top = y + "px";
        };

        const mouseUpHandler = () => {
            isDragging = false;
        };

        document.addEventListener("mousemove", mouseMoveHandler);
        document.addEventListener("mouseup", mouseUpHandler);

        // Track for cleanup
        eventListeners.push(
            { element: document, event: "mousemove", handler: mouseMoveHandler, options: false },
            { element: document, event: "mouseup", handler: mouseUpHandler, options: false }
        );
    }

    // ==========================================
    // WINDOW CREATION
    // ==========================================

    /**
     * Create the settings window
     */
    function createWindow() {
        // Close existing window
        if (settingsWindow) {
            closeWindow();
        }

        try {
            settingsWindow = document.createElement("div");
            settingsWindow.className = "window-pos";
            settingsWindow.id = "delta-settings-window";
            settingsWindow.style.cssText = "z-index: 100; position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);";

            // Gather current state
            const skillbarSlots = scanSkillbar();
            const currentFullscreenKey = getStorage("deltaUI_fullscreenKey", "o");
            const currentFameResetKey = getStorage("deltaUI_fameResetKey", "[");
            const currentPartyResetKey = getStorage("deltaUI_partyResetKey", "]");
            const canvasScale = getStorage("deltaUI_canvasScale", "1.0");

            // Toggle states
            const hideBuffsEnabled = getToggle("hideBuffs", false);
            const ccIndicatorEnabled = getToggle("ccIndicator", true);
            const fpsModeEnabled = getToggle("fpsMode", false);
            const partyAutoSortEnabled = getToggle("partyAutoSort", false);

            settingsWindow.innerHTML = `
                <div class="window panel-black svelte-1f1v3u3">
                    <div class="titleframe svelte-1f1v3u3" style="cursor: move;">
                        <img src="/data/ui/icons/cog.svg" class="titleicon svgicon svelte-1f1v3u3">
                        <div class="textprimary title svelte-1f1v3u3">
                            <div>Delta UI <small style="color: #5b858e;">v${CONFIG.version}</small></div>
                        </div>
                        <img src="/data/ui/icons/cross.svg" class="btn black svgicon close-btn">
                    </div>
                    <div class="slot svelte-1f1v3u3">
                        <div class="divide svelte-13nnce4">
                            <div class="delta-nav">
                                <div class="choice active" data-tab="${TABS.FEATURES}">Features</div>
                                <div class="choice" data-tab="${TABS.CONTROLS}">Controls</div>
                                <div class="choice" data-tab="${TABS.COLORS}">Colors</div>
                                <div class="choice" data-tab="${TABS.CUSTOMIZATION}">Customization</div>
                                <div class="choice" data-tab="${TABS.ABOUT}">About</div>
                            </div>
                            <div class="menu panel-black scrollbar svelte-13nnce4">
                                
                                <!-- FEATURES TAB -->
                                <div class="tab-panel active" data-panel="${TABS.FEATURES}">
                                    <h3 class="textprimary">Gameplay</h3>
                                    <div class="settings svelte-13nnce4">
                                        <div>CC Indicator<br><small class="textgrey">Colored borders on CC'd party members</small></div>
                                        <div class="btn checkbox ${getToggle("ccIndicator", true) ? "active" : ""}" data-toggle="ccIndicator"></div>
                                        
                                        <div>Hide Buffs<br><small class="textgrey">Hide selected buff icons</small></div>
                                        <div class="btn checkbox ${getToggle("hideBuffs", false) ? "active" : ""}" data-toggle="hideBuffs"></div>
                                        
                                        <div>FPS Mode<br><small class="textgrey">Hide UI elements for performance</small></div>
                                        <div class="btn checkbox ${getToggle("fpsMode", false) ? "active" : ""}" data-toggle="fpsMode"></div>
                                        
                                        <div>Mouseover<br><small class="textgrey">Cast skills on mouseover targets</small></div>
                                        <div class="btn checkbox ${getToggle("mouseover", false) ? "active" : ""}" data-toggle="mouseover"></div>
                                        
                                        <div>Party UI Editor<br><small class="textgrey">Drag and reorder party frames</small></div>
                                        <div class="btn checkbox ${getToggle("partyUIEditor", false) ? "active" : ""}" data-toggle="partyUIEditor"></div>
                                        
                                        <div>Party Auto Sort<br><small class="textgrey">Auto-sort party by class priority</small></div>
                                        <div class="btn checkbox ${getToggle("partyAutoSort", false) ? "active" : ""}" data-toggle="partyAutoSort"></div>
                                    </div>
                                    
                                    <h3 class="textprimary">Chat</h3>
                                    <div class="settings svelte-13nnce4">
                                        <div>Chat Tweaks<br><small class="textgrey">Resizable chat & controls</small></div>
                                        <div class="btn checkbox ${getToggle("chatTweaks", true) ? "active" : ""}" data-toggle="chatTweaks"></div>
                                    </div>
                                    
                                    <h3 class="textprimary">Visual</h3>
                                    <div class="settings svelte-13nnce4">
                                        <div>Item Recolor<br><small class="textgrey">Quality-based item borders</small></div>
                                        <div class="btn checkbox ${getToggle("itemRecolor", true) ? "active" : ""}" data-toggle="itemRecolor"></div>
                                        
                                        <div>Charm Colors<br><small class="textgrey">Custom charm border colors</small></div>
                                        <div class="btn checkbox ${getToggle("charmColors", true) ? "active" : ""}" data-toggle="charmColors"></div>
                                    </div>
                                    
                                    <h3 class="textprimary">Stats Display</h3>
                                    <div class="settings svelte-13nnce4">
                                        <div>Playtime Labels<br><small class="textgrey">Session & total time</small></div>
                                        <div class="btn checkbox ${getToggle("playtimeLabels", true) ? "active" : ""}" data-toggle="playtimeLabels"></div>
                                        
                                        <div>Fame Labels<br><small class="textgrey">Fame gained/lost counters</small></div>
                                        <div class="btn checkbox ${getToggle("fameLabels", true) ? "active" : ""}" data-toggle="fameLabels"></div>
                                    </div>
                                </div>
                                
                                <!-- CONTROLS TAB -->
                                <div class="tab-panel" data-panel="${TABS.CONTROLS}">
                                    <h3 class="textprimary">Keybinds</h3>
                                    <div class="settings svelte-13nnce4">
                                        <div>Fullscreen Toggle<br><small class="textgrey">Press key to toggle fullscreen</small></div>
                                        <div class="keybind-input-wrapper">
                                            <input type="text" id="fullscreen-key-input" class="keybind-input" 
                                                   value="${currentFullscreenKey.toUpperCase()}" maxlength="1" readonly placeholder="Press a key">
                                            <div class="btn small" id="clear-fullscreen-key">✕</div>
                                        </div>
                                        
                                        <div>Fame Reset<br><small class="textgrey">Press key to reset fame counters</small></div>
                                        <div class="keybind-input-wrapper">
                                            <input type="text" id="fame-reset-key-input" class="keybind-input" 
                                                   value="${currentFameResetKey.length === 1 ? currentFameResetKey.toUpperCase() : currentFameResetKey}" 
                                                   maxlength="1" readonly placeholder="Press a key">
                                            <div class="btn small" id="clear-fame-reset-key">✕</div>
                                        </div>
                                        
                                        <div>Party Reset<br><small class="textgrey">Press key to reset party order</small></div>
                                        <div class="keybind-input-wrapper">
                                            <input type="text" id="party-reset-key-input" class="keybind-input" 
                                                   value="${currentPartyResetKey.length === 1 ? currentPartyResetKey.toUpperCase() : currentPartyResetKey}" 
                                                   maxlength="1" readonly placeholder="Press a key">
                                            <div class="btn small" id="clear-party-reset-key">✕</div>
                                        </div>
                                    </div>
                                    
                                    <div class="keybind-hint">
                                        <small class="textgrey">Click the input box and press any key to set a new keybind.</small>
                                    </div>
                                    
                                    <h3 class="textprimary">Canvas Scale</h3>
                                    <div class="settings svelte-13nnce4">
                                        <div>UI Scale<br><small class="textgrey">Adjust game UI canvas size</small></div>
                                        <div class="slider-wrapper">
                                            <input type="range" id="canvas-scale-slider" class="delta-slider" 
                                                   min="0.1" max="2.5" step="0.1" value="${canvasScale}">
                                            <span id="canvas-scale-value" class="slider-value">${canvasScale}x</span>
                                        </div>
                                        
                                        <div>Enable Canvas Scaler<br><small class="textgrey">Apply custom UI scale</small></div>
                                        <div class="btn checkbox ${getToggle("canvasScaler", false) ? "active" : ""}" data-toggle="canvasScaler"></div>
                                    </div>
                                </div>
                                
                                <!-- COLORS TAB -->
                                <div class="tab-panel" data-panel="${TABS.COLORS}">
                                    <h3 class="textprimary">Skillbar Colors</h3>
                                    <div class="settings svelte-13nnce4">
                                        ${generateSkillbarColorRows(skillbarSlots)}
                                    </div>
                                    
                                    <h3 class="textprimary">Charm Colors</h3>
                                    <div class="settings svelte-13nnce4">
                                        ${generateCharmColorRows()}
                                    </div>
                                    
                                    <h3 class="textprimary">Pet Color</h3>
                                    <div class="settings svelte-13nnce4">
                                        <div>Pet Border Glow</div>
                                        <div class="color-input-wrapper">
                                            <div class="color-preview" id="pet-preview" style="background: ${CONFIG.petColor};"></div>
                                            <input type="color" id="pet-color-input" value="${CONFIG.petColor}">
                                        </div>
                                    </div>
                                    
                                    <h3 class="textprimary">Actions</h3>
                                    <div class="settings svelte-13nnce4">
                                        <div>Export to Clipboard</div>
                                        <div class="btn blue" id="export-colors">Export</div>
                                        
                                        <div>Import from Clipboard</div>
                                        <div class="btn blue" id="import-colors">Import</div>
                                        
                                        <div>Export to File</div>
                                        <div class="btn blue" id="export-to-file">Download</div>
                                        
                                        <div>Import from File</div>
                                        <div class="btn blue" id="import-from-file">Upload</div>
                                        
                                        <div>Reset to Defaults</div>
                                        <div class="btn orange" id="reset-all-colors">Reset</div>
                                    </div>
                                </div>
                                
                                <!-- CUSTOMIZATION TAB -->
                                <div class="tab-panel" data-panel="${TABS.CUSTOMIZATION}">
                                    <h3 class="textprimary">Hide Buffs Customization</h3>
                                    <div class="customization-notice" data-for="hideBuffs" ${hideBuffsEnabled ? 'style="display:none;"' : ''}>
                                        <small class="textgrey">⚠️ Enable "Hide Buffs" in Features tab to use this section.</small>
                                    </div>
                                    <div class="customization-section" data-for="hideBuffs" ${!hideBuffsEnabled ? 'style="opacity:0.5;pointer-events:none;"' : ''}>
                                        ${generateBuffToggleRows()}
                                    </div>
                                    
                                    <h3 class="textprimary">CC Indicator Customization</h3>
                                    <div class="customization-notice" data-for="ccIndicator" ${ccIndicatorEnabled ? 'style="display:none;"' : ''}>
                                        <small class="textgrey">⚠️ Enable "CC Indicator" in Features tab to use this section.</small>
                                    </div>
                                    <div class="customization-section" data-for="ccIndicator" ${!ccIndicatorEnabled ? 'style="opacity:0.5;pointer-events:none;"' : ''}>
                                        <div class="cc-header">
                                            <small class="textgrey">Priority 0 = disabled. Higher priority shows first.</small>
                                        </div>
                                        <div class="settings cc-settings">
                                            ${generateCCRows()}
                                        </div>
                                    </div>
                                    
                                    <h3 class="textprimary">FPS Mode Customization</h3>
                                    <div class="customization-notice" data-for="fpsMode" ${fpsModeEnabled ? 'style="display:none;"' : ''}>
                                        <small class="textgrey">⚠️ Enable "FPS Mode" in Features tab to use this section.</small>
                                    </div>
                                    <div class="customization-section" data-for="fpsMode" ${!fpsModeEnabled ? 'style="opacity:0.5;pointer-events:none;"' : ''}>
                                        <div class="fps-header">
                                            <small class="textgrey">Choose which UI elements to hide when FPS Mode is active.</small>
                                        </div>
                                        <div class="settings fps-settings">
                                            ${generateFPSRows()}
                                        </div>
                                    </div>
                                    
                                    <h3 class="textprimary">Party Auto Sort Priorities</h3>
                                    <div class="customization-notice" data-for="partyAutoSort" ${partyAutoSortEnabled ? 'style="display:none;"' : ''}>
                                        <small class="textgrey">⚠️ Enable "Party Auto Sort" in Features tab to use this section.</small>
                                    </div>
                                    <div class="customization-section" data-for="partyAutoSort" ${!partyAutoSortEnabled ? 'style="opacity:0.5;pointer-events:none;"' : ''}>
                                        <div class="priority-header">
                                            <small class="textgrey">Lower number = higher priority (sorted first)</small>
                                        </div>
                                        <div class="settings priority-settings">
                                            ${generatePartyPriorityRows()}
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- ABOUT TAB -->
                                <div class="tab-panel" data-panel="${TABS.ABOUT}">
                                    <h3 class="textprimary">Delta UI</h3>
                                    <div class="about-content">
                                        <div class="about-logo">Δ</div>
                                        <div class="about-version">Version ${CONFIG.version}</div>
                                        <div class="about-author">Made with ♥ by <span class="textprimary">lordwar222</span></div>
                                        <div class="about-desc">
                                            A private UI enhancement mod for Hordes.io featuring customizable skillbar colors, 
                                            charm colors, CC indicators, and more.
                                        </div>
                                    </div>
                                    
                                    <h3 class="textprimary">Diagnostics</h3>
                                    <div class="settings svelte-13nnce4">
                                        <div>Validate Settings<br><small class="textgrey">Check for configuration issues</small></div>
                                        <div class="btn blue" id="validate-settings">Validate</div>
                                    </div>
                                    
                                    <div class="about-footer">
                                        <small class="textgrey">
                                            Modules: ${getLoadedModules().join(", ")}
                                        </small>
                                    </div>
                                </div>
                                
                            </div>
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(settingsWindow);
            setupEventListeners();

            log(LogLevel.DEBUG, "Settings window created");

        } catch (e) {
            log(LogLevel.ERROR, "createWindow failed:", e);
        }
    }

    /**
     * Get list of loaded modules
     * @returns {string[]}
     */
    function getLoadedModules() {
        const modules = [];
        if (window.DELTA_CONFIG) modules.push("Config");
        if (window.DeltaLib) modules.push("Lib");
        if (window.DeltaUI) modules.push("Main");
        if (window.DeltaSettings) modules.push("Settings");
        if (window.FameNotifier) modules.push("Fame");
        if (window.ChatResizer) modules.push("Chat");
        if (window.DeltaCanvasScaler) modules.push("Canvas");
        if (window.DeltaMouseover) modules.push("Mouseover");
        if (window.DeltaPartyArranger) modules.push("Party");
        return modules;
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
                if (window.DELTA_CONFIG && window.DeltaUI) {
                    CONFIG = window.DELTA_CONFIG;
                    DeltaUI = window.DeltaUI;
                    DeltaLib = window.DeltaLib || null;

                    log(LogLevel.INFO, "Dependencies ready");
                    resolve(true);
                    return;
                }

                waited += DEP_CHECK_INTERVAL;

                if (waited >= DEP_MAX_WAIT) {
                    log(LogLevel.ERROR, "Dependency timeout");
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
     * Initialize the settings module
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

        // Initialize debounced functions
        initDebouncedFunctions();

        log(LogLevel.INFO, "Initialization complete");
    }

    /**
     * Destroy and cleanup
     */
    function destroy() {
        closeWindow();
        cleanupEventListeners();
        isInitialized = false;
        log(LogLevel.INFO, "Destroyed");
    }

    // ==========================================
    // STARTUP
    // ==========================================

    // Wait for document ready, then initialize
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }

    // ==========================================
    // PUBLIC API
    // ==========================================

    window.DeltaSettings = Object.freeze({
        // Version
        version: MODULE_VERSION,

        // Window control
        toggle: toggleWindow,
        open: openWindow,
        close: closeWindow,

        // Export/Import
        exportSettings: exportAllSettings,
        importSettings,
        exportToFile,
        importFromFile,

        // Validation
        validateSettings,

        // Lifecycle
        destroy,

        // Debug
        setDebugMode,
        getLoadedModules
    });

})();
