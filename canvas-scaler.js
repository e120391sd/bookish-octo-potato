// ==========================================
// CANVAS SCALER MODULE v2.0
// ==========================================

(function() {
    "use strict";

    if (window.DeltaCanvasScaler) {
        return;
    }

    function getDeps() {
        return {
            lib: window.DeltaLib,
            config: window.DELTA_CONFIG
        };
    }

    const STORAGE_KEY = "deltaUI_canvasScale";
    const ENABLED_KEY = "deltaUI_canvasScaler";
    const DEFAULT_SCALE = 1.0;
    const MIN_SCALE = 0.5;
    const MAX_SCALE = 2.0;
    const STEP = 0.1;

    let isInitialized = false;
    let isEnabled = false;
    let cleanup = null;
    let currentScale = DEFAULT_SCALE;

    function loadScale() {
        const { lib } = getDeps();
        if (lib) {
            currentScale = parseFloat(lib.storage.get(STORAGE_KEY, String(DEFAULT_SCALE)));
        } else {
            try {
                currentScale = parseFloat(localStorage.getItem(STORAGE_KEY)) || DEFAULT_SCALE;
            } catch (e) {
                currentScale = DEFAULT_SCALE;
            }
        }
    }

    function saveScale() {
        const { lib } = getDeps();
        if (lib) {
            lib.storage.set(STORAGE_KEY, String(currentScale));
        } else {
            try {
                localStorage.setItem(STORAGE_KEY, String(currentScale));
            } catch (e) {}
        }
    }

    function applyScale() {
        const canvases = document.getElementsByClassName("l-canvas");
        if (canvases.length < 2) return;

        const mainCanvas = canvases[0];
        const uiCanvas = canvases[1];

        const width = mainCanvas.getAttribute("width");
        const height = mainCanvas.getAttribute("height");

        if (width && height) {
            uiCanvas.setAttribute("width", parseInt(width) / currentScale);
            uiCanvas.setAttribute("height", parseInt(height) / currentScale);
        }
    }

    function resetScale() {
        const canvases = document.getElementsByClassName("l-canvas");
        if (canvases.length < 2) return;

        const mainCanvas = canvases[0];
        const uiCanvas = canvases[1];

        const width = mainCanvas.getAttribute("width");
        const height = mainCanvas.getAttribute("height");

        if (width && height) {
            uiCanvas.setAttribute("width", width);
            uiCanvas.setAttribute("height", height);
        }
    }

    function onResize() {
        if (isEnabled) {
            setTimeout(applyScale, 1);
        }
    }

    function setScale(newScale) {
        currentScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, parseFloat(newScale) || DEFAULT_SCALE));
        saveScale();
        
        if (isEnabled) {
            applyScale();
        }
    }

    function enable() {
        if (isEnabled) return;
        isEnabled = true;

        const { lib } = getDeps();

        if (lib) {
            lib.storage.setToggle("canvasScaler", true);
            const eventId = lib.events.on(window, "resize", onResize);
            if (cleanup) cleanup.trackEvent(eventId);
        } else {
            try {
                localStorage.setItem(ENABLED_KEY, "true");
            } catch (e) {}
            window.addEventListener("resize", onResize);
            if (cleanup) {
                cleanup.trackCustom(() => window.removeEventListener("resize", onResize));
            }
        }

        applyScale();
    }

    function disable() {
        if (!isEnabled) return;
        isEnabled = false;

        const { lib } = getDeps();

        if (lib) {
            lib.storage.setToggle("canvasScaler", false);
        } else {
            try {
                localStorage.setItem(ENABLED_KEY, "false");
            } catch (e) {}
        }

        resetScale();
    }

    function init() {
        if (isInitialized) return;
        isInitialized = true;

        const { lib } = getDeps();

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

        loadScale();

        let shouldEnable = false;
        if (lib) {
            shouldEnable = lib.storage.getToggle("canvasScaler", false);
        } else {
            try {
                shouldEnable = localStorage.getItem(ENABLED_KEY) === "true";
            } catch (e) {}
        }

        if (shouldEnable) {
            const waitForChat = () => {
                if (document.getElementById("chat")) {
                    enable();
                } else {
                    setTimeout(waitForChat, 100);
                }
            };
            waitForChat();
        }
    }

    function destroy() {
        if (!isInitialized) return;
        isInitialized = false;

        if (isEnabled) {
            disable();
        }

        if (cleanup) {
            cleanup.run();
            cleanup = null;
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }

    window.DeltaCanvasScaler = Object.freeze({
        enable,
        disable,
        isEnabled: () => isEnabled,
        setScale,
        getScale: () => currentScale,
        getMin: () => MIN_SCALE,
        getMax: () => MAX_SCALE,
        getStep: () => STEP,
        destroy,
        reinit: () => {
            destroy();
            init();
        }
    });

})();
