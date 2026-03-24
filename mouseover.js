// ==========================================
// MOUSEOVER MODULE v2.0
// ==========================================

(function() {
    "use strict";

    if (window.DeltaMouseover) {
        return;
    }

    function getDeps() {
        return {
            lib: window.DeltaLib,
            config: window.DELTA_CONFIG
        };
    }

    const SELECT_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];
    const SHOW_HOVER_EFFECT = true;

    let isInitialized = false;
    let isEnabled = false;
    let cleanup = null;
    let hoveredFrame = null;
    let isRedispatching = false;

    function injectStyles() {
        const { lib } = getDeps();
        
        const css = `
            .partyframes .grid.left.mo-hover {
                outline: 2px solid rgba(52, 152, 219, 0.8) !important;
                outline-offset: 1px !important;
                background: rgba(52, 152, 219, 0.1) !important;
                transition: all 0.1s ease !important;
            }
            
            .partyframes .grid.left.mo-hover .barsInner {
                box-shadow: inset 0 0 10px rgba(52, 152, 219, 0.3) !important;
            }
        `;

        if (lib) {
            lib.injectStyle("mouse-over-styles", css);
        } else {
            let style = document.getElementById("mouse-over-styles");
            if (!style) {
                style = document.createElement("style");
                style.id = "mouse-over-styles";
                document.head.appendChild(style);
            }
            style.textContent = css;
        }
    }

    function handleMouseover(e) {
        if (!isEnabled) return;
        
        const frame = e.target.closest(".partyframes .grid.left");
        
        if (hoveredFrame && hoveredFrame !== frame) {
            hoveredFrame.classList.remove("mo-hover");
        }
        
        if (frame) {
            hoveredFrame = frame;
            if (SHOW_HOVER_EFFECT) {
                frame.classList.add("mo-hover");
            }
        }
    }

    function handleMouseout(e) {
        if (!isEnabled) return;
        
        const frame = e.target.closest(".partyframes .grid.left");
        if (!frame) return;
        
        const related = e.relatedTarget;
        if (!related || !frame.contains(related)) {
            if (frame === hoveredFrame) {
                frame.classList.remove("mo-hover");
                hoveredFrame = null;
            }
        }
    }

    function simulateKey(key, code, keyCode) {
        const targets = [document, document.body, document.documentElement];
        
        targets.forEach(target => {
            target.dispatchEvent(new KeyboardEvent("keydown", {
                key: key,
                code: code,
                keyCode: keyCode,
                which: keyCode,
                bubbles: true,
                cancelable: true,
                view: window
            }));
            
            target.dispatchEvent(new KeyboardEvent("keypress", {
                key: key,
                code: code,
                keyCode: keyCode,
                which: keyCode,
                bubbles: true,
                cancelable: true,
                view: window
            }));
        });
        
        setTimeout(() => {
            targets.forEach(target => {
                target.dispatchEvent(new KeyboardEvent("keyup", {
                    key: key,
                    code: code,
                    keyCode: keyCode,
                    which: keyCode,
                    bubbles: true,
                    cancelable: true,
                    view: window
                }));
            });
        }, 20);
    }

    function handleKeydown(e) {
        if (!isEnabled) return;
        if (isRedispatching) return;
        
        const tag = document.activeElement?.tagName?.toLowerCase();
        if (tag === "input" || tag === "textarea") return;
        
        if (!SELECT_KEYS.includes(e.key)) return;
        
        if (hoveredFrame) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            
            const clickable = hoveredFrame.querySelector(".barsInner.targetable") || 
                            hoveredFrame.querySelector(".barsInner") || 
                            hoveredFrame;
            
            clickable.dispatchEvent(new MouseEvent("mousedown", {
                bubbles: true,
                cancelable: true,
                view: window
            }));
            
            clickable.dispatchEvent(new MouseEvent("mouseup", {
                bubbles: true,
                cancelable: true,
                view: window
            }));
            
            clickable.dispatchEvent(new MouseEvent("click", {
                bubbles: true,
                cancelable: true,
                view: window
            }));
            
            isRedispatching = true;
            
            setTimeout(() => {
                simulateKey(e.key, e.code, e.keyCode);
                
                setTimeout(() => {
                    isRedispatching = false;
                }, 100);
            }, 30);
        }
    }

    function enable() {
        if (isEnabled) return;
        isEnabled = true;
        
        const { lib } = getDeps();

        injectStyles();

        if (lib && cleanup) {
            cleanup.trackEvent(lib.events.on(document, "mouseover", handleMouseover));
            cleanup.trackEvent(lib.events.on(document, "mouseout", handleMouseout));
            cleanup.trackEvent(lib.events.on(document, "keydown", handleKeydown, true));
            lib.storage.setToggle("mouseover", true);
        } else {
            document.addEventListener("mouseover", handleMouseover);
            document.addEventListener("mouseout", handleMouseout);
            document.addEventListener("keydown", handleKeydown, true);

            try {
                localStorage.setItem("deltaUI_mouseover", "true");
            } catch (e) {}

            if (cleanup) {
                cleanup.trackCustom(() => {
                    document.removeEventListener("mouseover", handleMouseover);
                    document.removeEventListener("mouseout", handleMouseout);
                    document.removeEventListener("keydown", handleKeydown, true);
                });
            }
        }
    }

    function disable() {
        if (!isEnabled) return;
        isEnabled = false;
        
        const { lib } = getDeps();

        if (hoveredFrame) {
            hoveredFrame.classList.remove("mo-hover");
            hoveredFrame = null;
        }

        if (lib) {
            lib.storage.setToggle("mouseover", false);
        } else {
            try {
                localStorage.setItem("deltaUI_mouseover", "false");
            } catch (e) {}
        }
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

        let shouldEnable = false;
        if (lib) {
            shouldEnable = lib.storage.getToggle("mouseover", false);
        } else {
            try {
                shouldEnable = localStorage.getItem("deltaUI_mouseover") === "true";
            } catch (e) {}
        }

        if (shouldEnable) {
            enable();
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

    window.DeltaMouseover = Object.freeze({
        enable,
        disable,
        isEnabled: () => isEnabled,
        getHoveredFrame: () => hoveredFrame,
        destroy,
        reinit: () => {
            destroy();
            init();
        }
    });

})();
