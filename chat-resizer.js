// ==========================================
// CHAT RESIZER MODULE v2.0
// Resizable and draggable chat window
// ==========================================

(function() {
    "use strict";

    // Prevent double initialization
    if (window.ChatResizer) {
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
    // CONSTANTS
    // ==========================================

    const STORAGE_KEY = "hordes_chat_v7";
    const MIN_WIDTH = 250;
    const MAX_WIDTH = 1200;
    const MIN_HEIGHT = 150;
    const MAX_HEIGHT = 900;

    const DEFAULTS = {
        x: 10,
        y: () => window.innerHeight - 420,
        width: 400,
        height: 320
    };

    // ==========================================
    // STATE
    // ==========================================

    let isInitialized = false;
    let cleanup = null;
    let elements = {
        chat: null,
        input: null,
        channels: null,
        controls: null,
        label: null
    };
    let position = null;
    let dragState = null;

    // ==========================================
    // STORAGE
    // ==========================================

    function loadPosition() {
        const { lib } = getDeps();
        
        let data = null;
        if (lib) {
            data = lib.storage.getJSON(STORAGE_KEY);
        } else {
            try {
                const raw = localStorage.getItem(STORAGE_KEY);
                if (raw) data = JSON.parse(raw);
            } catch (e) {}
        }

        if (data?.width && data?.height) {
            position = data;
        } else {
            position = {
                x: DEFAULTS.x,
                y: typeof DEFAULTS.y === "function" ? DEFAULTS.y() : DEFAULTS.y,
                width: DEFAULTS.width,
                height: DEFAULTS.height
            };
        }
    }

    function savePosition() {
        const { lib } = getDeps();
        
        if (lib) {
            lib.storage.setJSON(STORAGE_KEY, position);
        } else {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(position));
            } catch (e) {}
        }
    }

    function resetPosition() {
        position = {
            x: DEFAULTS.x,
            y: typeof DEFAULTS.y === "function" ? DEFAULTS.y() : DEFAULTS.y,
            width: DEFAULTS.width,
            height: DEFAULTS.height
        };
        savePosition();
        applyPosition();
        showSizeLabel(1000);
    }

    // ==========================================
    // POSITIONING
    // ==========================================

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function constrainPosition() {
        position.width = clamp(position.width, MIN_WIDTH, Math.min(MAX_WIDTH, window.innerWidth - 20));
        position.height = clamp(position.height, MIN_HEIGHT, Math.min(MAX_HEIGHT, window.innerHeight - 20));
        position.x = clamp(position.x, 5, window.innerWidth - position.width - 5);
        position.y = clamp(position.y, 5, window.innerHeight - position.height - 5);
    }

    function applyPosition() {
        if (!elements.chat) return;

        constrainPosition();

        const inputHeight = elements.input?.offsetHeight || 34;
        const channelHeight = elements.channels?.offsetHeight || 30;
        const chatHeight = position.height - inputHeight - channelHeight;

        // Chat panel
        elements.chat.style.left = `${position.x}px`;
        elements.chat.style.top = `${position.y}px`;
        elements.chat.style.width = `${position.width}px`;
        elements.chat.style.height = `${chatHeight}px`;

        // Input panel
        if (elements.input) {
            elements.input.style.left = `${position.x}px`;
            elements.input.style.top = `${position.y + chatHeight}px`;
            elements.input.style.width = `${position.width}px`;
        }

        // Channel selector
        if (elements.channels) {
            elements.channels.style.left = `${position.x}px`;
            elements.channels.style.top = `${position.y + chatHeight + inputHeight}px`;
            elements.channels.style.width = `${position.width}px`;
        }

        updateControlsPosition();
    }

    function updateControlsPosition() {
        if (!elements.controls) return;

        elements.controls.style.left = `${position.x + position.width - 76}px`;
        elements.controls.style.top = `${position.y + 4}px`;

        if (elements.label) {
            elements.label.style.left = `${position.x + position.width / 2 - 40}px`;
            elements.label.style.top = `${position.y + position.height / 2 - 12}px`;
            elements.label.textContent = `${Math.round(position.width)} × ${Math.round(position.height)}`;
        }
    }

    // ==========================================
    // VISUAL FEEDBACK
    // ==========================================

    function setInteracting(active) {
        const cls = "resizer-interacting";
        elements.chat?.classList.toggle(cls, active);
        elements.input?.classList.toggle(cls, active);
        elements.channels?.classList.toggle(cls, active);
    }

    function showSizeLabel(duration = 500) {
        if (!elements.label) return;
        elements.label.classList.add("visible");
        updateControlsPosition();
        
        if (duration > 0) {
            setTimeout(() => hideSizeLabel(), duration);
        }
    }

    function hideSizeLabel() {
        elements.label?.classList.remove("visible");
    }

    // ==========================================
    // DRAG HANDLERS
    // ==========================================

    function onMoveStart(e) {
        e.preventDefault();
        e.stopPropagation();

        dragState = {
            type: "move",
            startX: e.clientX,
            startY: e.clientY,
            origX: position.x,
            origY: position.y
        };

        document.body.classList.add("chat-interacting");
        document.body.style.cursor = "move";
        setInteracting(true);
    }

    function onResizeStart(e) {
        e.preventDefault();
        e.stopPropagation();

        dragState = {
            type: "resize",
            startX: e.clientX,
            startY: e.clientY,
            origX: position.x,
            origY: position.y,
            origWidth: position.width,
            origHeight: position.height
        };

        document.body.classList.add("chat-interacting");
        document.body.style.cursor = "ne-resize";
        setInteracting(true);
        showSizeLabel(0);
    }

    function onMouseMove(e) {
        if (!dragState) return;

        const dx = e.clientX - dragState.startX;
        const dy = e.clientY - dragState.startY;

        if (dragState.type === "move") {
            position.x = dragState.origX + dx;
            position.y = dragState.origY + dy;
        } else if (dragState.type === "resize") {
            position.width = clamp(dragState.origWidth + dx, MIN_WIDTH, MAX_WIDTH);
            
            const newHeight = dragState.origHeight - dy;
            if (newHeight >= MIN_HEIGHT && newHeight <= MAX_HEIGHT) {
                position.height = newHeight;
                position.y = dragState.origY + dy;
            }
            
            updateControlsPosition();
        }

        applyPosition();
    }

    function onMouseUp() {
        if (!dragState) return;

        document.body.classList.remove("chat-interacting");
        document.body.style.cursor = "";
        setInteracting(false);

        constrainPosition();
        savePosition();
        applyPosition();

        if (dragState.type === "resize") {
            showSizeLabel(500);
        }

        dragState = null;
    }

    // ==========================================
    // CONTROLS CREATION
    // ==========================================

    function createMoveIcon() {
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("viewBox", "0 0 24 24");
        svg.innerHTML = '<path d="M12 2l3 3h-2v4h4v-2l3 3-3 3v-2h-4v4h2l-3 3-3-3h2v-4H7v2l-3-3 3-3v2h4V5H9l3-3z"/>';
        return svg;
    }

    function createResizeIcon() {
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("viewBox", "0 0 24 24");
        svg.innerHTML = '<path d="M10 4h10v10l-4-4-6 6-2-2 6-6z"/>';
        return svg;
    }

    function createControls() {
        // Remove old controls if they exist
        document.getElementById("chat-controls")?.remove();
        document.getElementById("chat-size-label")?.remove();

        const { lib } = getDeps();

        // Controls container
        const controls = lib?.createElement("div", { id: "chat-controls" }) || 
                        (() => { const el = document.createElement("div"); el.id = "chat-controls"; return el; })();

        // Move handle
        const moveHandle = document.createElement("div");
        moveHandle.id = "chat-move-handle";
        moveHandle.title = "Drag to move";
        moveHandle.appendChild(createMoveIcon());
        moveHandle.addEventListener("mousedown", onMoveStart);

        // Reset button
        const resetBtn = document.createElement("button");
        resetBtn.id = "chat-reset-btn";
        resetBtn.innerHTML = "↺";
        resetBtn.title = "Reset position and size";
        resetBtn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            resetPosition();
        });

        // Resize handle
        const resizeHandle = document.createElement("div");
        resizeHandle.id = "chat-resize-handle";
        resizeHandle.title = "Drag to resize";
        resizeHandle.appendChild(createResizeIcon());
        resizeHandle.addEventListener("mousedown", onResizeStart);

        controls.appendChild(moveHandle);
        controls.appendChild(resetBtn);
        controls.appendChild(resizeHandle);

        // Size label
        const label = document.createElement("div");
        label.id = "chat-size-label";

        document.body.appendChild(controls);
        document.body.appendChild(label);

        elements.controls = controls;
        elements.label = label;
    }

    // ==========================================
    // ELEMENT DETECTION
    // ==========================================

    function findElements() {
        elements.chat = document.getElementById("chat");
        elements.input = document.getElementById("chatinput");
        elements.channels = document.querySelector(".channelselect");
        
        return !!(elements.chat && elements.input);
    }

    function addClasses() {
        const cls = "resizer-active";
        elements.chat?.classList.add(cls);
        elements.input?.classList.add(cls);
        elements.channels?.classList.add(cls);
    }

    function verifySetup() {
        if (!findElements()) return false;
        
        addClasses();
        
        // Check if controls exist
        if (!elements.controls || !document.body.contains(elements.controls)) {
            createControls();
        }
        
        applyPosition();
        return true;
    }

    // ==========================================
    // STYLES
    // ==========================================

    function injectStyles() {
        const { lib } = getDeps();
        
        const css = `
            /* Chat styling */
            #chat.resizer-active {
                position: fixed !important;
                z-index: 10000 !important;
                background: rgba(16, 19, 29, 0.85) !important;
                border: 1px solid rgba(91, 133, 142, 0.4) !important;
                border-bottom: none !important;
                border-radius: 6px 6px 0 0 !important;
                transition: border-color 0.15s !important;
            }

            #chatinput.resizer-active {
                position: fixed !important;
                z-index: 10000 !important;
                border-radius: 0 !important;
                border: 1px solid rgba(91, 133, 142, 0.4) !important;
                border-top: none !important;
                border-bottom: none !important;
                transition: border-color 0.15s !important;
                background: rgba(16, 19, 29, 0.95) !important;
            }

            .channelselect.resizer-active {
                position: fixed !important;
                z-index: 10000 !important;
                border: 1px solid rgba(91, 133, 142, 0.4) !important;
                border-top: none !important;
                border-radius: 0 0 6px 6px !important;
                background: rgba(16, 19, 29, 0.9) !important;
                padding: 4px !important;
                box-sizing: border-box !important;
                transition: border-color 0.15s !important;
                display: flex !important;
            }

            #chat.resizer-interacting,
            #chatinput.resizer-interacting,
            .channelselect.resizer-interacting {
                border-color: #F5C247 !important;
            }

            #chat-controls {
                position: fixed;
                z-index: 10002;
                display: flex;
                align-items: center;
                gap: 4px;
            }

            #chat-move-handle,
            #chat-resize-handle {
                width: 20px;
                height: 20px;
                cursor: move;
                opacity: 0.5;
                transition: opacity 0.15s;
            }

            #chat-resize-handle {
                cursor: ne-resize;
            }

            #chat-move-handle:hover,
            #chat-resize-handle:hover {
                opacity: 1;
            }

            #chat-move-handle svg,
            #chat-resize-handle svg {
                width: 100%;
                height: 100%;
                fill: #5b858e;
                transition: fill 0.15s;
            }

            #chat-move-handle:hover svg,
            #chat-resize-handle:hover svg {
                fill: #F5C247;
            }

            #chat-reset-btn {
                width: 20px;
                height: 20px;
                background: transparent;
                border: none;
                border-radius: 4px;
                font-size: 16px;
                color: #5b858e;
                cursor: pointer;
                opacity: 0.5;
                transition: opacity 0.15s, color 0.15s;
                padding: 0;
                line-height: 20px;
                text-align: center;
            }

            #chat-reset-btn:hover {
                opacity: 1;
                color: #F5C247;
            }

            #chat-size-label {
                position: fixed;
                z-index: 10003;
                background: rgba(16, 19, 29, 0.95);
                color: #F5C247;
                padding: 6px 12px;
                border-radius: 4px;
                font: 13px hordes, sans-serif;
                border: 1px solid #5b858e;
                pointer-events: none;
                display: none;
            }

            #chat-size-label.visible {
                display: block;
            }

            body.chat-interacting,
            body.chat-interacting * {
                user-select: none !important;
            }
        `;

        if (lib) {
            lib.injectStyle("chat-resizer-css", css);
        } else {
            let style = document.getElementById("chat-resizer-css");
            if (!style) {
                style = document.createElement("style");
                style.id = "chat-resizer-css";
                document.head.appendChild(style);
            }
            style.textContent = css;
        }
    }

    // ==========================================
    // INITIALIZATION
    // ==========================================

    function init() {
        if (isInitialized) return;
        isInitialized = true;

        const { lib } = getDeps();

        // Create cleanup tracker
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

        injectStyles();
        loadPosition();

        // Register event listeners
        if (lib && cleanup) {
            cleanup.trackEvent(lib.events.on(document, "mousemove", onMouseMove));
            cleanup.trackEvent(lib.events.on(document, "mouseup", onMouseUp));
            cleanup.trackEvent(lib.events.on(window, "resize", () => {
                constrainPosition();
                applyPosition();
            }));
        } else {
            document.addEventListener("mousemove", onMouseMove);
            document.addEventListener("mouseup", onMouseUp);
            window.addEventListener("resize", () => {
                constrainPosition();
                applyPosition();
            });

            if (cleanup) {
                cleanup.trackCustom(() => {
                    document.removeEventListener("mousemove", onMouseMove);
                    document.removeEventListener("mouseup", onMouseUp);
                });
            }
        }

        // Setup check loop
        const checkInterval = setInterval(() => {
            verifySetup();
        }, 500);

        if (cleanup) {
            cleanup.trackCustom(() => clearInterval(checkInterval));
        }

        // Initial setup attempts
        setTimeout(() => verifySetup(), 1000);
        setTimeout(() => verifySetup(), 2000);
        setTimeout(() => verifySetup(), 3000);
    }

    function destroy() {
        if (!isInitialized) return;
        isInitialized = false;

        if (cleanup) {
            cleanup.run();
            cleanup = null;
        }

        // Remove controls
        elements.controls?.remove();
        elements.label?.remove();

        // Remove classes
        const cls = "resizer-active";
        elements.chat?.classList.remove(cls);
        elements.input?.classList.remove(cls);
        elements.channels?.classList.remove(cls);

        elements = {
            chat: null,
            input: null,
            channels: null,
            controls: null,
            label: null
        };
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

    window.ChatResizer = Object.freeze({
        reset: resetPosition,
        destroy,
        reinit: () => {
            destroy();
            init();
        }
    });

})();
