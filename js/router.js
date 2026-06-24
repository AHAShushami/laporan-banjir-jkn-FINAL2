/**
 * Simple hash-based SPA Router
 * Routes: #login, #district, #form/:formId, #dashboard, #submissions/:formId, #pps
 */
export class Router {
    constructor() {
        this.routes = {};
        this.currentRoute = null;
        this.params = {};
        this.beforeHooks = [];
        window.addEventListener('hashchange', () => this.resolve());
    }

    /**
     * Register a route handler (alias for add)
     * @param {string} path - Route pattern (e.g., 'form/:formId')
     * @param {Function} handler - Async function that renders the view
     */
    on(path, handler) {
        this.routes[path] = handler;
        return this;
    }

    /**
     * Alias for on to match main.js usage
     */
    add(path, handler) {
        return this.on(path, handler);
    }

    /**
     * Initialize the router and resolve initial hash
     */
    init() {
        this.resolve();
    }

    /**
     * Add a before-navigation hook
     * @param {Function} hook - Function(to, from) => boolean. Return false to cancel.
     */
    before(hook) {
        this.beforeHooks.push(hook);
        return this;
    }

    /**
     * Navigate to a route
     * @param {string} path - The route path
     */
    navigate(path) {
        window.location.hash = path;
    }

    /**
     * Resolve the current hash to a route
     */
    async resolve() {
        const hash = window.location.hash.slice(1) || 'login';
        const parts = hash.split('/');
        const previousRoute = this.currentRoute;

        // Try to match routes
        let matched = false;
        for (const [pattern, handler] of Object.entries(this.routes)) {
            const patternParts = pattern.split('/');
            
            if (patternParts.length !== parts.length) continue;

            const params = {};
            let isMatch = true;

            for (let i = 0; i < patternParts.length; i++) {
                if (patternParts[i].startsWith(':')) {
                    params[patternParts[i].slice(1)] = decodeURIComponent(parts[i]);
                } else if (patternParts[i] !== parts[i]) {
                    isMatch = false;
                    break;
                }
            }

            if (isMatch) {
                // Run before hooks
                let canProceed = true;
                for (const hook of this.beforeHooks) {
                    if (hook(hash, previousRoute) === false) {
                        canProceed = false;
                        break;
                    }
                }

                if (!canProceed) {
                    // Revert hash
                    if (previousRoute) {
                        window.location.hash = previousRoute;
                    }
                    return;
                }

                this.currentRoute = hash;
                this.params = params;
                
                try {
                    await handler(params);
                } catch (err) {
                    console.error(`Route error for ${hash}:`, err);
                }
                
                matched = true;
                break;
            }
        }

        if (!matched) {
            console.warn(`No route matched: ${hash}`);
            // Default to login
            this.navigate('login');
        }
    }

    /**
     * Get current route params
     */
    getParams() {
        return { ...this.params };
    }

    /**
     * Get current route path
     */
    getCurrentRoute() {
        return this.currentRoute;
    }
}

export const router = new Router();
