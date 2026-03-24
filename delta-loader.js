(function() {
    "use strict";

    if (window.DeltaLoader) return;

    const BASE_URL = "https://github.com/e120391sd/bookish-octo-potato/blob/main";

    const SCRIPTS = [
        "config.js",
        "delta-lib.js",
        "fame-notifier.js",
        "chat-resizer.js",
        "canvas-scaler.js",
        "mouseover.js",
        "party-arranger.js",
        "delta-main.js",
        "delta-settings.js"
    ];

    const CSS_FILE = "styles.css";

    const TIMING = {
        GAME_CHECK_INTERVAL: 200,
        GAME_CHECK_TIMEOUT: 30000,
        SCRIPT_LOAD_DELAY: 100,
        DEPENDENCY_WAIT: 50,
        TOAST_SUCCESS: 2500,
        TOAST_ERROR: 4000
    };

    let isInitialized = false;
    let loadedScripts = new Set();
    let failedScripts = new Set();
    let cssContent = null;

    const TOAST_CSS = `
        #delta-loader-toast {
            position: fixed;
            bottom: 20px;
            left: 20px;
            z-index: 999999;
            background: rgba(20, 24, 35, 0.95);
            border: 1px solid rgba(245, 194, 71, 0.4);
            border-radius: 8px;
            padding: 12px 16px;
            display: flex;
            align-items: center;
            gap: 10px;
            font-family: system-ui, -apple-system, sans-serif;
            font-size: 13px;
            color: #e5e7eb;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
            opacity: 0;
            transform: translateY(20px);
            transition: opacity 0.3s ease, transform 0.3s ease;
            pointer-events: none;
        }
        #delta-loader-toast.visible { opacity: 1; transform: translateY(0); }
        #delta-loader-toast.success { border-color: rgba(74, 222, 128, 0.4); }
        #delta-loader-toast.error { border-color: rgba(248, 113, 113, 0.4); }
        #delta-loader-toast .delta-spinner {
            width: 16px;
            height: 16px;
            border: 2px solid rgba(245, 194, 71, 0.3);
            border-top-color: #F5C247;
            border-radius: 50%;
            animation: delta-loader-spin 0.8s linear infinite;
        }
        @keyframes delta-loader-spin { to { transform: rotate(360deg); } }
        #delta-loader-toast .delta-icon { font-size: 16px; line-height: 1; }
        #delta-loader-toast .delta-icon.success { color: #4ade80; }
        #delta-loader-toast .delta-icon.error { color: #f87171; }
        #delta-loader-toast .delta-logo { color: #F5C247; font-weight: bold; font-size: 16px; }
        #delta-loader-toast .delta-text { color: #e5e7eb; }
        #delta-loader-toast .delta-subtext { color: #9ca3af; font-size: 11px; margin-left: 4px; }
    `;

    function injectStyles() {
        if (document.getElementById("delta-loader-css")) return;
        const style = document.createElement("style");
        style.id = "delta-loader-css";
        style.textContent = TOAST_CSS;
        document.head.appendChild(style);
    }

    function removeStyles() {
        document.getElementById("delta-loader-css")?.remove();
    }

    function getToast() {
        let toast = document.getElementById("delta-loader-toast");
        if (!toast) {
            toast = document.createElement("div");
            toast.id = "delta-loader-toast";
            document.body.appendChild(toast);
        }
        return toast;
    }

    function showToast(message, type = "loading", subtext = "") {
        const toast = getToast();
        toast.className = "";
        let iconHTML = "";
        if (type === "loading") {
            iconHTML = '<div class="delta-spinner"></div>';
        } else if (type === "success") {
            iconHTML = '<span class="delta-icon success">✓</span>';
            toast.classList.add("success");
        } else if (type === "error") {
            iconHTML = '<span class="delta-icon error">✕</span>';
            toast.classList.add("error");
        }
        const subtextHTML = subtext ? `<span class="delta-subtext">${subtext}</span>` : "";
        toast.innerHTML = `<span class="delta-logo">Δ</span>${iconHTML}<span class="delta-text">${message}${subtextHTML}</span>`;
        requestAnimationFrame(() => toast.classList.add("visible"));
    }

    function hideToast(delay = 0) {
        setTimeout(() => {
            const toast = document.getElementById("delta-loader-toast");
            if (toast) {
                toast.classList.remove("visible");
                setTimeout(() => {
                    toast.remove();
                    setTimeout(removeStyles, 100);
                }, 300);
            }
        }, delay);
    }

    function toastSuccess(message, subtext = "") {
        showToast(message, "success", subtext);
        hideToast(TIMING.TOAST_SUCCESS);
    }

    function toastError(message, subtext = "") {
        showToast(message, "error", subtext);
        hideToast(TIMING.TOAST_ERROR);
    }

    function isGameReady() {
        const hasSkillbar = document.querySelector("#skillbar");
        const hasChat = document.querySelector("#chat");
        const hasCorner = document.querySelector(".l-corner-ur");
        const hasBtnBar = document.querySelector(".btnbar");
        const hasUI = hasSkillbar || hasChat || hasCorner || hasBtnBar;
        const loadingEl = document.querySelector(".loading");
        const isLoading = loadingEl && getComputedStyle(loadingEl).display !== "none" && getComputedStyle(loadingEl).visibility !== "hidden";
        return hasUI && !isLoading;
    }

    function waitForGame() {
        return new Promise((resolve) => {
            if (isGameReady()) { resolve(true); return; }
            const startTime = Date.now();
            const check = () => {
                if (isGameReady()) { resolve(true); return; }
                if (Date.now() - startTime > TIMING.GAME_CHECK_TIMEOUT) { resolve(false); return; }
                setTimeout(check, TIMING.GAME_CHECK_INTERVAL);
            };
            setTimeout(check, TIMING.GAME_CHECK_INTERVAL);
        });
    }

    async function loadScript(filename) {
        if (loadedScripts.has(filename)) return true;
        const fullUrl = `${BASE_URL}/${filename}?v=${Date.now()}`;
        try {
            const response = await fetch(fullUrl);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const code = await response.text();
            const script = document.createElement("script");
            script.textContent = code;
            script.dataset.deltaScript = filename;
            document.head.appendChild(script);
            loadedScripts.add(filename);
            return true;
        } catch (error) {
            failedScripts.add(filename);
            return false;
        }
    }

    async function loadCSS(filename) {
        const fullUrl = `${BASE_URL}/${filename}?v=${Date.now()}`;
        try {
            const response = await fetch(fullUrl);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            cssContent = await response.text();
            injectCSS();
            return true;
        } catch (error) {
            return false;
        }
    }

    function injectCSS() {
        if (!cssContent) return;
        document.getElementById("delta-external-css")?.remove();
        const style = document.createElement("style");
        style.id = "delta-external-css";
        style.textContent = cssContent;
        document.body.appendChild(style);
    }

    function waitForDependency(globalName, timeout = 5000) {
        return new Promise((resolve) => {
            if (window[globalName]) { resolve(true); return; }
            const startTime = Date.now();
            const check = () => {
                if (window[globalName]) { resolve(true); return; }
                if (Date.now() - startTime > timeout) { resolve(false); return; }
                setTimeout(check, TIMING.DEPENDENCY_WAIT);
            };
            setTimeout(check, TIMING.DEPENDENCY_WAIT);
        });
    }

    async function loadAllScripts() {
        let successCount = 0;
        let failedCount = 0;
        for (const script of SCRIPTS) {
            showToast("Loading...", "loading", script);
            const success = await loadScript(script);
            if (success) {
                successCount++;
                if (script === "config.js") await waitForDependency("DELTA_CONFIG", 3000);
                else if (script === "delta-lib.js") await waitForDependency("DeltaLib", 3000);
                await new Promise(r => setTimeout(r, TIMING.SCRIPT_LOAD_DELAY));
            } else {
                failedCount++;
            }
        }
        return { success: successCount, failed: failedCount };
    }

    async function init() {
        if (isInitialized) return;
        isInitialized = true;
        injectStyles();
        showToast("Waiting for game...", "loading");

        try {
            const gameReady = await waitForGame();
            if (!gameReady) showToast("Loading anyway...", "loading");

            showToast("Loading styles...", "loading");
            await loadCSS(CSS_FILE);

            const result = await loadAllScripts();

            // Re-inject CSS after scripts to ensure it overrides everything
            setTimeout(injectCSS, 500);
            setTimeout(injectCSS, 1500);
            setTimeout(injectCSS, 3000);

            const total = SCRIPTS.length;
            if (result.failed === 0) {
                toastSuccess("Delta UI loaded!", `${result.success} modules`);
            } else if (result.success > 0) {
                toastSuccess("Delta UI loaded", `${result.success}/${total} modules (${result.failed} failed)`);
            } else {
                toastError("Failed to load Delta UI");
            }
        } catch (error) {
            toastError("Initialization failed");
        }
    }

    async function reload() {
        loadedScripts.clear();
        failedScripts.clear();
        document.querySelectorAll("script[data-delta-script]").forEach(s => s.remove());
        document.getElementById("delta-external-css")?.remove();
        delete window.DELTA_CONFIG;
        delete window.DeltaLib;
        delete window.DeltaUI;
        delete window.DeltaSettings;
        delete window.DeltaMouseover;
        delete window.DeltaPartyArranger;
        delete window.DeltaCanvasScaler;
        delete window.FameNotifier;
        delete window.ChatResizer;
        isInitialized = false;
        cssContent = null;
        await init();
    }

    function getStatus() {
        return {
            initialized: isInitialized,
            loaded: Array.from(loadedScripts),
            failed: Array.from(failedScripts),
            total: SCRIPTS.length
        };
    }

    function reinjectCSS() {
        injectCSS();
    }

    window.DeltaLoader = Object.freeze({
        reload,
        getStatus,
        reinjectCSS,
        showToast,
        hideToast,
        toastSuccess,
        toastError,
        BASE_URL,
        SCRIPTS
    });

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
