// ==========================================
// FAME NOTIFIER MODULE v2.0
// Tracks fame gained and lost from chat
// ==========================================

(function() {
    "use strict";

    // Prevent double initialization
    if (window.FameNotifier) {
        return;
    }

    // ==========================================
    // DEPENDENCIES
    // ==========================================

    function getDeps() {
        return {
            lib: window.DeltaLib,
            config: window.DELTA_CONFIG
        };
    }

    // ==========================================
    // STATE
    // ==========================================

    let isInitialized = false;
    let cleanup = null;
    let resetKey = "[";

    // Storage keys
    const STORAGE_KEYS = {
        GAINED: "totalFameGained",
        LOST: "totalFameLost",
        RESET_KEY: "deltaUI_fameResetKey"
    };

    // ==========================================
    // STORAGE FUNCTIONS
    // ==========================================

    function getTotal(key) {
        const { lib } = getDeps();
        if (lib) {
            return parseInt(lib.storage.get(key, "0"), 10) || 0;
        }
        try {
            return parseInt(localStorage.getItem(key), 10) || 0;
        } catch (e) {
            return 0;
        }
    }

    function setTotal(key, value) {
        const { lib } = getDeps();
        if (lib) {
            lib.storage.set(key, String(value));
        } else {
            try {
                localStorage.setItem(key, String(value));
            } catch (e) {}
        }
    }

    function addTotal(key, value) {
        setTotal(key, getTotal(key) + value);
    }

    // ==========================================
    // FAME PARSING
    // ==========================================

    function parseFame(text) {
        if (!text || typeof text !== "string") return;

        text = text.replace(/\s+/g, " ").trim();

        const gainMatch = text.match(/Gained\s+([\d,]+)/i);
        if (gainMatch) {
            const value = parseInt(gainMatch[1].replace(/,/g, ""), 10);
            if (value > 0) {
                addTotal(STORAGE_KEYS.GAINED, value);
            }
            return;
        }

        const lossMatch = text.match(/Lost\s+([\d,]+)/i);
        if (lossMatch) {
            const value = parseInt(lossMatch[1].replace(/,/g, ""), 10);
            if (value > 0) {
                addTotal(STORAGE_KEYS.LOST, value);
            }
        }
    }

    function processNode(node) {
        if (!(node instanceof HTMLElement)) return;
        
        if (!node.matches("article.line")) return;

        if (node.dataset.fameProcessed) return;
        node.dataset.fameProcessed = "true";

        const fameSpans = node.querySelectorAll("span.textfame");
        fameSpans.forEach(span => {
            parseFame(span.textContent);
        });
    }

    // ==========================================
    // RESET FUNCTIONS
    // ==========================================

    function reset() {
        setTotal(STORAGE_KEYS.GAINED, 0);
        setTotal(STORAGE_KEYS.LOST, 0);
    }

    function setResetKey(newKey) {
        if (!newKey || typeof newKey !== "string") return;
        
        resetKey = newKey.toLowerCase();
        
        const { lib } = getDeps();
        if (lib) {
            lib.storage.set(STORAGE_KEYS.RESET_KEY, resetKey);
        } else {
            try {
                localStorage.setItem(STORAGE_KEYS.RESET_KEY, resetKey);
            } catch (e) {}
        }
    }

    function getResetKey() {
        return resetKey;
    }

    function loadResetKey() {
        const { lib } = getDeps();
        if (lib) {
            resetKey = lib.storage.get(STORAGE_KEYS.RESET_KEY, "[");
        } else {
            try {
                resetKey = localStorage.getItem(STORAGE_KEYS.RESET_KEY) || "[";
            } catch (e) {
                resetKey = "[";
            }
        }
    }

    // ==========================================
    // KEYBOARD HANDLER
    // ==========================================

    function handleKeydown(e) {
        const active = document.activeElement;
        const isTyping = active?.tagName === "INPUT" ||
                        active?.tagName === "TEXTAREA" ||
                        active?.isContentEditable;

        if (isTyping) return;

        if (e.key.toLowerCase() === resetKey.toLowerCase()) {
            reset();
        }
    }

    // ==========================================
    // OBSERVER SETUP
    // ==========================================

    function setupObserver() {
        const { lib } = getDeps();
        
        const chat = document.querySelector("#chat");
        if (!chat) return false;

        if (lib && cleanup) {
            const observerId = lib.observers.create(chat, (mutations) => {
                mutations.forEach(mutation => {
                    mutation.addedNodes.forEach(node => processNode(node));
                });
            }, {
                childList: true,
                subtree: true,
                debounce: 50
            });

            cleanup.trackObserver(observerId);
        } else {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach(mutation => {
                    mutation.addedNodes.forEach(node => processNode(node));
                });
            });

            observer.observe(chat, { childList: true, subtree: true });

            if (cleanup) {
                cleanup.trackCustom(() => observer.disconnect());
            }
        }

        return true;
    }

    function setupBodyObserver() {
        const { lib } = getDeps();

        if (document.querySelector("#chat")) {
            setupObserver();
            return;
        }

        const checkForChat = () => {
            const chat = document.querySelector("#chat");
            if (chat) {
                setupObserver();
                return true;
            }
            return false;
        };

        if (lib && cleanup) {
            const observerId = lib.observers.create(document.body, () => {
                if (checkForChat()) {
                    lib.observers.disconnect(observerId);
                }
            }, {
                childList: true,
                subtree: true,
                debounce: 100
            });

            cleanup.trackObserver(observerId);
        } else {
            const observer = new MutationObserver(() => {
                if (checkForChat()) {
                    observer.disconnect();
                }
            });

            observer.observe(document.body, { childList: true, subtree: true });

            if (cleanup) {
                cleanup.trackCustom(() => observer.disconnect());
            }
        }
    }

    function setupKeyboard() {
        const { lib } = getDeps();

        if (lib && cleanup) {
            const eventId = lib.events.on(window, "keydown", handleKeydown);
            cleanup.trackEvent(eventId);
        } else {
            window.addEventListener("keydown", handleKeydown);
            
            if (cleanup) {
                cleanup.trackCustom(() => window.removeEventListener("keydown", handleKeydown));
            }
        }
    }

    // ==========================================
    // INITIALIZATION
    // ==========================================

    function init() {
        if (isInitialized) return;
        isInitialized = true;

        const { lib } = getDeps();

        // ✅ FIX: Create cleanup FIRST
        if (lib) {
            cleanup = lib.createCleanup();
        } else {
            const customCleanups = [];
            cleanup = {
                trackEvent: () => {},
                trackObserver: () => {},
                trackInterval: () => {},
                trackCustom: (fn) => customCleanups.push(fn),
                run: () => customCleanups.forEach(fn => fn())
            };
        }

        loadResetKey();
        setupBodyObserver();
        setupKeyboard();
    }

    function destroy() {
        if (!isInitialized) return;
        isInitialized = false;

        if (cleanup) {
            cleanup.run();
            cleanup = null;
        }
    }

    // ==========================================
    // START INITIALIZATION
    // ==========================================

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }

    // ==========================================
    // EXPOSE API
    // ==========================================

    window.FameNotifier = Object.freeze({
        getGained: () => getTotal(STORAGE_KEYS.GAINED),
        getLost: () => getTotal(STORAGE_KEYS.LOST),
        getNet: () => getTotal(STORAGE_KEYS.GAINED) - getTotal(STORAGE_KEYS.LOST),
        reset,
        setResetKey,
        getResetKey,
        destroy,
        reinit: () => {
            destroy();
            init();
        }
    });

})();
