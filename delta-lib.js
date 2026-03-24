// ==========================================
// DELTA UI LIBRARY v2.0
// Shared utilities for all Delta UI modules
// ==========================================

(function() {
    "use strict";

    // Prevent double initialization
    if (window.DeltaLib) {
        return;
    }

    // ==========================================
    // DOM UTILITIES
    // ==========================================

    /**
     * Query selector shorthand with error handling
     * @param {string} selector - CSS selector
     * @param {Element|Document} root - Root element to search from
     * @returns {Element|null}
     */
    function $(selector, root = document) {
        if (!selector || !root) return null;
        try {
            return root.querySelector(selector);
        } catch (e) {
            return null;
        }
    }

    /**
     * Query selector all shorthand with error handling
     * @param {string} selector - CSS selector
     * @param {Element|Document} root - Root element to search from
     * @returns {Element[]}
     */
    function $$(selector, root = document) {
        if (!selector || !root) return [];
        try {
            return Array.from(root.querySelectorAll(selector));
        } catch (e) {
            return [];
        }
    }

    /**
     * Wait for an element to appear in the DOM
     * @param {string} selector - CSS selector
     * @param {Object} options - Configuration options
     * @returns {Promise<Element>}
     */
    function waitForElement(selector, options = {}) {
        const { 
            timeout = 5000, 
            interval = 100, 
            root = document 
        } = options;

        return new Promise((resolve, reject) => {
            // Check immediately
            const existing = $(selector, root);
            if (existing) {
                resolve(existing);
                return;
            }

            const startTime = Date.now();

            const check = () => {
                const element = $(selector, root);
                if (element) {
                    resolve(element);
                    return;
                }

                if (Date.now() - startTime >= timeout) {
                    reject(new Error(`Element "${selector}" not found within ${timeout}ms`));
                    return;
                }

                setTimeout(check, interval);
            };

            setTimeout(check, interval);
        });
    }

    /**
     * Set a style property with !important
     * @param {Element} element - Target element
     * @param {string} property - CSS property name
     * @param {string} value - CSS value
     */
    function setStyleImportant(element, property, value) {
        if (!element?.style) return;
        try {
            element.style.setProperty(property, value, "important");
        } catch (e) {
            element.style[property] = value;
        }
    }

    /**
     * Set multiple styles with !important
     * @param {Element} element - Target element
     * @param {Object} styles - Object of property: value pairs
     */
    function setStylesImportant(element, styles) {
        if (!element?.style || !styles) return;
        for (const [property, value] of Object.entries(styles)) {
            setStyleImportant(element, property, value);
        }
    }

    /**
     * Create and inject a style element
     * @param {string} id - Style element ID
     * @param {string} css - CSS content
     * @returns {HTMLStyleElement}
     */
    function injectStyle(id, css) {
        let style = $(`#${id}`);
        if (!style) {
            style = document.createElement("style");
            style.id = id;
            document.head.appendChild(style);
        }
        style.textContent = css;
        return style;
    }

    /**
     * Remove a style element by ID
     * @param {string} id - Style element ID
     */
    function removeStyle(id) {
        $(`#${id}`)?.remove();
    }

    /**
     * Remove an element by ID or selector
     * @param {string} selectorOrId - Element ID or CSS selector
     */
    function removeElement(selectorOrId) {
        const selector = selectorOrId.startsWith("#") || selectorOrId.startsWith(".") 
            ? selectorOrId 
            : `#${selectorOrId}`;
        $(selector)?.remove();
    }

    /**
     * Create element with attributes and children
     * @param {string} tag - HTML tag name
     * @param {Object} attrs - Attributes to set
     * @param {Array|string} children - Child elements or text content
     * @returns {HTMLElement}
     */
    function createElement(tag, attrs = {}, children = null) {
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
    // STORAGE UTILITIES
    // ==========================================

    const storage = {
        /**
         * Get a value from localStorage
         * @param {string} key - Storage key
         * @param {*} defaultValue - Default value if not found
         * @returns {string|null}
         */
        get(key, defaultValue = null) {
            try {
                const value = localStorage.getItem(key);
                return value !== null ? value : defaultValue;
            } catch (e) {
                return defaultValue;
            }
        },

        /**
         * Set a value in localStorage
         * @param {string} key - Storage key
         * @param {string} value - Value to store
         * @returns {boolean} Success
         */
        set(key, value) {
            try {
                localStorage.setItem(key, String(value));
                return true;
            } catch (e) {
                return false;
            }
        },

        /**
         * Get and parse JSON from localStorage
         * @param {string} key - Storage key
         * @param {*} defaultValue - Default value if not found or parse fails
         * @returns {*}
         */
        getJSON(key, defaultValue = null) {
            try {
                const value = localStorage.getItem(key);
                return value !== null ? JSON.parse(value) : defaultValue;
            } catch (e) {
                return defaultValue;
            }
        },

        /**
         * Stringify and set JSON in localStorage
         * @param {string} key - Storage key
         * @param {*} value - Value to store
         * @returns {boolean} Success
         */
        setJSON(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (e) {
                return false;
            }
        },

        /**
         * Get a boolean toggle value (with deltaUI_ prefix)
         * @param {string} key - Storage key (without prefix)
         * @param {boolean} defaultValue - Default value
         * @returns {boolean}
         */
        getToggle(key, defaultValue = false) {
            const saved = this.get(`deltaUI_${key}`);
            return saved !== null ? saved === "true" : defaultValue;
        },

        /**
         * Set a boolean toggle value (with deltaUI_ prefix)
         * @param {string} key - Storage key (without prefix)
         * @param {boolean} value - Value to store
         * @returns {boolean} Success
         */
        setToggle(key, value) {
            return this.set(`deltaUI_${key}`, String(Boolean(value)));
        },

        /**
         * Remove a value from localStorage
         * @param {string} key - Storage key
         * @returns {boolean} Success
         */
        remove(key) {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (e) {
                return false;
            }
        },

        /**
         * Check if a key exists in localStorage
         * @param {string} key - Storage key
         * @returns {boolean}
         */
        has(key) {
            try {
                return localStorage.getItem(key) !== null;
            } catch (e) {
                return false;
            }
        }
    };

    // ==========================================
    // FORMATTING UTILITIES
    // ==========================================

    const format = {
        /**
         * Format seconds into human-readable time
         * @param {number} seconds - Time in seconds
         * @returns {string}
         */
        time(seconds) {
            if (typeof seconds !== "number" || seconds < 0) seconds = 0;
            seconds = Math.floor(seconds);
            
            const days = Math.floor(seconds / 86400);
            const hours = Math.floor((seconds % 86400) / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            const secs = seconds % 60;

            if (days > 0) return `${days}d ${hours}h`;
            if (hours > 0) return `${hours}h ${minutes}m`;
            if (minutes > 0) return `${minutes}m ${secs}s`;
            return `${secs}s`;
        },

        /**
         * Format a number with K/M suffixes
         * @param {number} num - Number to format
         * @returns {string}
         */
        number(num) {
            if (typeof num !== "number") num = Number(num) || 0;
            
            if (num >= 1000000) {
                return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
            }
            if (num >= 1000) {
                return (num / 1000).toFixed(1).replace(/\.0$/, "") + "k";
            }
            return String(Math.floor(num));
        },

        /**
         * Format a number with commas
         * @param {number} num - Number to format
         * @returns {string}
         */
        commas(num) {
            if (typeof num !== "number") num = Number(num) || 0;
            return num.toLocaleString();
        },

        /**
         * Capitalize first letter
         * @param {string} str - String to capitalize
         * @returns {string}
         */
        capitalize(str) {
            if (typeof str !== "string" || !str) return "";
            return str.charAt(0).toUpperCase() + str.slice(1);
        }
    };

    // ==========================================
    // COLOR UTILITIES
    // ==========================================

    const colors = {
        // Quality thresholds
        THRESHOLDS: [
            { min: 109, name: "RED" },
            { min: 99, name: "ORANGE" },
            { min: 90, name: "PURPLE" },
            { min: 70, name: "BLUE" },
            { min: 50, name: "GREEN" },
            { min: 0, name: "GREY" }
        ],

        /**
         * Get color based on item quality percentage
         * @param {number} percent - Quality percentage
         * @param {Object} colorMap - Optional custom color map
         * @returns {string}
         */
        fromPercent(percent, colorMap = null) {
            const defaultColors = {
                RED: "#ff0000",
                ORANGE: "#ff7600",
                PURPLE: "#9E3BF9",
                BLUE: "#0681ea",
                GREEN: "#34CB49",
                GREY: "#5b858e"
            };

            const map = colorMap || defaultColors;
            
            for (const threshold of this.THRESHOLDS) {
                if (percent >= threshold.min) {
                    return map[threshold.name] || defaultColors[threshold.name];
                }
            }
            
            return map.GREY || defaultColors.GREY;
        },

        /**
         * Convert hex color to rgba
         * @param {string} hex - Hex color code (#RGB or #RRGGBB)
         * @param {number} alpha - Alpha value (0-1)
         * @returns {string}
         */
        hexToRgba(hex, alpha = 1) {
            if (!hex || typeof hex !== "string") return hex;
            
            // Remove # if present
            hex = hex.replace(/^#/, "");
            
            // Handle shorthand (#RGB)
            if (hex.length === 3) {
                hex = hex.split("").map(c => c + c).join("");
            }
            
            const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            if (!result) return `#${hex}`;
            
            const r = parseInt(result[1], 16);
            const g = parseInt(result[2], 16);
            const b = parseInt(result[3], 16);
            
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        },

        /**
         * Lighten or darken a hex color
         * @param {string} hex - Hex color code
         * @param {number} amount - Amount to adjust (-100 to 100)
         * @returns {string}
         */
        adjust(hex, amount) {
            if (!hex || typeof hex !== "string") return hex;
            
            hex = hex.replace(/^#/, "");
            
            if (hex.length === 3) {
                hex = hex.split("").map(c => c + c).join("");
            }
            
            const num = parseInt(hex, 16);
            
            let r = (num >> 16) + amount;
            let g = ((num >> 8) & 0x00FF) + amount;
            let b = (num & 0x0000FF) + amount;
            
            r = Math.max(0, Math.min(255, r));
            g = Math.max(0, Math.min(255, g));
            b = Math.max(0, Math.min(255, b));
            
            return "#" + ((r << 16) | (g << 8) | b).toString(16).padStart(6, "0");
        }
    };

    // ==========================================
    // URL UTILITIES
    // ==========================================

    const url = {
        /**
         * Get pathname from a URL or src attribute
         * @param {string} src - URL or src string
         * @returns {string}
         */
        getPath(src) {
            if (!src || typeof src !== "string") return "";
            try {
                return new URL(src, window.location.origin).pathname;
            } catch (e) {
                return src.split("?")[0];
            }
        },

        /**
         * Add cache-busting parameter to URL
         * @param {string} urlStr - Base URL
         * @returns {string}
         */
        cacheBust(urlStr) {
            if (!urlStr) return urlStr;
            const separator = urlStr.includes("?") ? "&" : "?";
            return `${urlStr}${separator}v=${Date.now()}`;
        },

        /**
         * Check if a src path contains a substring
         * @param {string} src - Source URL
         * @param {string} search - String to search for
         * @returns {boolean}
         */
        srcContains(src, search) {
            if (!src || !search) return false;
            const path = this.getPath(src);
            return path.includes(search);
        }
    };

    // ==========================================
    // EVENT UTILITIES
    // ==========================================

    // Track all registered event listeners for cleanup
    const eventRegistry = new Map();
    let eventIdCounter = 0;

    const events = {
        /**
         * Add an event listener with automatic tracking for cleanup
         * @param {EventTarget} target - Target element
         * @param {string} type - Event type
         * @param {Function} handler - Event handler
         * @param {Object|boolean} options - Event options
         * @returns {number} Event ID for removal
         */
        on(target, type, handler, options = false) {
            if (!target || !type || !handler) return -1;
            
            const id = ++eventIdCounter;
            target.addEventListener(type, handler, options);
            
            eventRegistry.set(id, { target, type, handler, options });
            
            return id;
        },

        /**
         * Remove an event listener by ID
         * @param {number} id - Event ID returned from on()
         * @returns {boolean} Success
         */
        off(id) {
            const entry = eventRegistry.get(id);
            if (!entry) return false;
            
            entry.target.removeEventListener(entry.type, entry.handler, entry.options);
            eventRegistry.delete(id);
            
            return true;
        },

        /**
         * Remove multiple event listeners by IDs
         * @param {number[]} ids - Array of event IDs
         */
        offAll(ids) {
            if (!Array.isArray(ids)) return;
            ids.forEach(id => this.off(id));
        },

        /**
         * Add a one-time event listener
         * @param {EventTarget} target - Target element
         * @param {string} type - Event type
         * @param {Function} handler - Event handler
         * @returns {number} Event ID
         */
        once(target, type, handler) {
            const id = ++eventIdCounter;
            
            const wrappedHandler = (e) => {
                this.off(id);
                handler(e);
            };
            
            target.addEventListener(type, wrappedHandler, { once: true });
            eventRegistry.set(id, { target, type, handler: wrappedHandler, options: { once: true } });
            
            return id;
        },

        /**
         * Add a keyboard shortcut listener
         * @param {string} key - Key to listen for (lowercase)
         * @param {Function} callback - Callback function
         * @param {Object} options - Configuration options
         * @returns {number} Event ID
         */
        onKey(key, callback, options = {}) {
            const { 
                ignoreInputs = true, 
                preventDefault = false,
                target = window 
            } = options;

            const handler = (e) => {
                if (ignoreInputs) {
                    const active = document.activeElement;
                    const isTyping = active?.tagName === "INPUT" ||
                                    active?.tagName === "TEXTAREA" ||
                                    active?.isContentEditable ||
                                    active?.classList?.contains("keybind-input");
                    if (isTyping) return;
                }

                if (e.key.toLowerCase() === key.toLowerCase()) {
                    if (preventDefault) e.preventDefault();
                    callback(e);
                }
            };

            return this.on(target, "keydown", handler);
        },

        /**
         * Get count of registered events
         * @returns {number}
         */
        getCount() {
            return eventRegistry.size;
        },

        /**
         * Clear all registered events (use with caution)
         */
        clearAll() {
            eventRegistry.forEach((entry, id) => {
                entry.target.removeEventListener(entry.type, entry.handler, entry.options);
            });
            eventRegistry.clear();
        }
    };

    // ==========================================
    // DRAG UTILITIES
    // ==========================================

    const drag = {
        /**
         * Make an element draggable
         * @param {Element} handle - Element to use as drag handle
         * @param {Element} target - Element to move
         * @param {Object} options - Configuration options
         * @returns {Function} Cleanup function
         */
        makeDraggable(handle, target, options = {}) {
            const { 
                onStart, 
                onMove, 
                onEnd, 
                boundToWindow = true,
                ignoreSelectors = ".btn, button, input, select, .close-btn"
            } = options;
            
            let isDragging = false;
            let offset = { x: 0, y: 0 };
            const eventIds = [];

            const handleMouseDown = (e) => {
                // Ignore clicks on interactive elements
                if (ignoreSelectors && e.target.closest(ignoreSelectors)) return;
                
                isDragging = true;
                const rect = target.getBoundingClientRect();
                offset.x = e.clientX - rect.left;
                offset.y = e.clientY - rect.top;
                
                // Remove transform and set absolute position
                target.style.transform = "none";
                target.style.left = `${rect.left}px`;
                target.style.top = `${rect.top}px`;
                
                document.body.style.userSelect = "none";
                
                onStart?.(e, rect);
                e.preventDefault();
            };

            const handleMouseMove = (e) => {
                if (!isDragging) return;
                
                let x = e.clientX - offset.x;
                let y = e.clientY - offset.y;
                
                if (boundToWindow) {
                    const rect = target.getBoundingClientRect();
                    x = Math.max(0, Math.min(x, window.innerWidth - rect.width));
                    y = Math.max(0, Math.min(y, window.innerHeight - rect.height));
                }
                
                target.style.left = `${x}px`;
                target.style.top = `${y}px`;
                
                onMove?.(e, { x, y });
            };

            const handleMouseUp = (e) => {
                if (!isDragging) return;
                isDragging = false;
                document.body.style.userSelect = "";
                onEnd?.(e);
            };

            eventIds.push(events.on(handle, "mousedown", handleMouseDown));
            eventIds.push(events.on(document, "mousemove", handleMouseMove));
            eventIds.push(events.on(document, "mouseup", handleMouseUp));

            // Return cleanup function
            return () => {
                events.offAll(eventIds);
            };
        }
    };

    // ==========================================
    // OBSERVER UTILITIES
    // ==========================================

    // Track observers for cleanup
    const observerRegistry = new Map();
    let observerIdCounter = 0;

    const observers = {
        /**
         * Create a mutation observer with debouncing
         * @param {Element} target - Element to observe
         * @param {Function} callback - Callback function
         * @param {Object} options - MutationObserver options + debounce
         * @returns {number} Observer ID for cleanup
         */
        create(target, callback, options = {}) {
            if (!target || !callback) return -1;
            
            const { 
                debounce = 0,
                childList = true,
                subtree = false,
                attributes = false,
                attributeFilter,
                characterData = false
            } = options;

            let timeout = null;
            let pendingMutations = [];
            
            const observer = new MutationObserver((mutations) => {
                if (debounce > 0) {
                    pendingMutations.push(...mutations);
                    clearTimeout(timeout);
                    timeout = setTimeout(() => {
                        callback(pendingMutations);
                        pendingMutations = [];
                    }, debounce);
                } else {
                    callback(mutations);
                }
            });

            const observerOptions = { childList, subtree, attributes, characterData };
            if (attributeFilter) observerOptions.attributeFilter = attributeFilter;

            observer.observe(target, observerOptions);
            
            const id = ++observerIdCounter;
            observerRegistry.set(id, { observer, timeout });
            
            return id;
        },

        /**
         * Disconnect and remove an observer by ID
         * @param {number} id - Observer ID
         * @returns {boolean} Success
         */
        disconnect(id) {
            const entry = observerRegistry.get(id);
            if (!entry) return false;
            
            entry.observer.disconnect();
            if (entry.timeout) clearTimeout(entry.timeout);
            observerRegistry.delete(id);
            
            return true;
        },

        /**
         * Disconnect multiple observers
         * @param {number[]} ids - Array of observer IDs
         */
        disconnectAll(ids) {
            if (!Array.isArray(ids)) return;
            ids.forEach(id => this.disconnect(id));
        },

        /**
         * Get count of active observers
         * @returns {number}
         */
        getCount() {
            return observerRegistry.size;
        }
    };

    // ==========================================
    // TIMER UTILITIES
    // ==========================================

    // Track intervals for cleanup
    const intervalRegistry = new Map();
    let intervalIdCounter = 0;

    const timers = {
        /**
         * Create a tracked interval
         * @param {Function} callback - Callback function
         * @param {number} delay - Interval delay in ms
         * @returns {number} Timer ID for cleanup
         */
        setInterval(callback, delay) {
            const nativeId = setInterval(callback, delay);
            const id = ++intervalIdCounter;
            intervalRegistry.set(id, nativeId);
            return id;
        },

        /**
         * Clear a tracked interval
         * @param {number} id - Timer ID
         * @returns {boolean} Success
         */
        clearInterval(id) {
            const nativeId = intervalRegistry.get(id);
            if (nativeId === undefined) return false;
            
            clearInterval(nativeId);
            intervalRegistry.delete(id);
            return true;
        },

        /**
         * Clear multiple intervals
         * @param {number[]} ids - Array of timer IDs
         */
        clearAllIntervals(ids) {
            if (!Array.isArray(ids)) return;
            ids.forEach(id => this.clearInterval(id));
        },

        /**
         * Debounce a function
         * @param {Function} func - Function to debounce
         * @param {number} wait - Wait time in ms
         * @returns {Function} Debounced function
         */
        debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        },

        /**
         * Throttle a function
         * @param {Function} func - Function to throttle
         * @param {number} limit - Time limit in ms
         * @returns {Function} Throttled function
         */
        throttle(func, limit) {
            let inThrottle;
            return function executedFunction(...args) {
                if (!inThrottle) {
                    func(...args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            };
        },

        /**
         * Get count of active intervals
         * @returns {number}
         */
        getCount() {
            return intervalRegistry.size;
        }
    };

    // ==========================================
    // ASYNC UTILITIES
    // ==========================================

    const async = {
        /**
         * Delay execution
         * @param {number} ms - Milliseconds to wait
         * @returns {Promise<void>}
         */
        delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        },

        /**
         * Load a script dynamically
         * @param {string} scriptUrl - Script URL
         * @returns {Promise<boolean>}
         */
        async loadScript(scriptUrl) {
            try {
                const response = await fetch(url.cacheBust(scriptUrl));
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                
                const code = await response.text();
                const script = document.createElement("script");
                script.textContent = code;
                document.head.appendChild(script);
                
                return true;
            } catch (e) {
                return false;
            }
        },

        /**
         * Load CSS dynamically
         * @param {string} cssUrl - CSS URL
         * @param {string} id - Style element ID
         * @returns {Promise<boolean>}
         */
        async loadCSS(cssUrl, id) {
            try {
                const response = await fetch(url.cacheBust(cssUrl));
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                
                const css = await response.text();
                injectStyle(id, css);
                
                return true;
            } catch (e) {
                return false;
            }
        },

        /**
         * Retry a function until it succeeds or max attempts reached
         * @param {Function} fn - Function to retry (should return truthy on success)
         * @param {Object} options - Configuration
         * @returns {Promise<*>}
         */
        async retry(fn, options = {}) {
            const { maxAttempts = 10, delay = 200, onFail } = options;
            
            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                try {
                    const result = await fn();
                    if (result) return result;
                } catch (e) {
                    // Continue to next attempt
                }
                
                if (attempt < maxAttempts) {
                    await this.delay(delay);
                }
            }
            
            onFail?.();
            return null;
        }
    };

    // ==========================================
    // MATH UTILITIES
    // ==========================================

    const math = {
        /**
         * Clamp a value between min and max
         * @param {number} value - Value to clamp
         * @param {number} min - Minimum value
         * @param {number} max - Maximum value
         * @returns {number}
         */
        clamp(value, min, max) {
            return Math.max(min, Math.min(max, value));
        },

        /**
         * Linear interpolation
         * @param {number} start - Start value
         * @param {number} end - End value
         * @param {number} t - Interpolation factor (0-1)
         * @returns {number}
         */
        lerp(start, end, t) {
            return start + (end - start) * this.clamp(t, 0, 1);
        },

        /**
         * Round to decimal places
         * @param {number} value - Value to round
         * @param {number} decimals - Number of decimal places
         * @returns {number}
         */
        round(value, decimals = 0) {
            const factor = Math.pow(10, decimals);
            return Math.round(value * factor) / factor;
        }
    };

    // ==========================================
    // CLEANUP UTILITY
    // ==========================================

    /**
     * Create a cleanup tracker for a module
     * @returns {Object} Cleanup tracker
     */
    function createCleanup() {
        const eventIds = [];
        const observerIds = [];
        const intervalIds = [];
        const customCleanups = [];

        return {
            /**
             * Track an event listener
             * @param {number} id - Event ID
             */
            trackEvent(id) {
                if (id >= 0) eventIds.push(id);
            },

            /**
             * Track an observer
             * @param {number} id - Observer ID
             */
            trackObserver(id) {
                if (id >= 0) observerIds.push(id);
            },

            /**
             * Track an interval
             * @param {number} id - Interval ID
             */
            trackInterval(id) {
                if (id >= 0) intervalIds.push(id);
            },

            /**
             * Track a custom cleanup function
             * @param {Function} fn - Cleanup function
             */
            trackCustom(fn) {
                if (typeof fn === "function") customCleanups.push(fn);
            },

            /**
             * Run all tracked cleanups
             */
            run() {
                events.offAll(eventIds);
                observers.disconnectAll(observerIds);
                timers.clearAllIntervals(intervalIds);
                customCleanups.forEach(fn => fn());
                
                eventIds.length = 0;
                observerIds.length = 0;
                intervalIds.length = 0;
                customCleanups.length = 0;
            },

            /**
             * Get count of tracked items
             * @returns {Object}
             */
            getCount() {
                return {
                    events: eventIds.length,
                    observers: observerIds.length,
                    intervals: intervalIds.length,
                    custom: customCleanups.length
                };
            }
        };
    }

    // ==========================================
    // EXPORT
    // ==========================================

    window.DeltaLib = Object.freeze({
        // Version
        version: "2.0.0",

        // DOM utilities
        $,
        $$,
        waitForElement,
        setStyleImportant,
        setStylesImportant,
        injectStyle,
        removeStyle,
        removeElement,
        createElement,

        // Storage
        storage,

        // Formatting
        format,

        // Colors
        colors,

        // URL utilities
        url,

        // Events
        events,

        // Drag
        drag,

        // Observers
        observers,

        // Timers
        timers,

        // Async
        async,

        // Math
        math,

        // Cleanup
        createCleanup
    });

})();
