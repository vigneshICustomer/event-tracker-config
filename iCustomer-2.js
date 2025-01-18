/**
 * ICustomer Service - A wrapper around analytics functionality
 */
class ICustomerService {
    // Private mapping of tenant IDs to analytics URLs
    static #tenantUrlMap = {
        'zillasecurity-8938439037': 'https://cm60qnthl00002v6orm0kilny.d.jitsu.com/p.js'
        // Add more tenant mappings here as needed
    };

    constructor(options = {}) {
        this.isInitialized = false;
        this.privateInstance = null;
        this.initializationQueue = [];
        this.currentUser = null;
        this.tenantId = options.tenantId;

        if (!this.tenantId) {
            throw new Error('ICustomerService requires a tenantId for initialization');
        }

        if (!ICustomerService.#tenantUrlMap[this.tenantId]) {
            throw new Error(`Invalid tenant ID: ${this.tenantId}`);
        }

        // Initialize the service
        this._initialize();
    }

    /**
     * Private initialization method
     */
    _initialize() {
        // Create a script element for the analytics provider
        const script = document.createElement('script');
        script.src = ICustomerService.#tenantUrlMap[this.tenantId];
        script.async = true;
        
        // Setup the callback for when the provider is loaded
        window.jitsuLoaded = (instance) => {
            this.privateInstance = instance;
            this.isInitialized = true;
            
            // Process any queued events
            this._processQueue();
            
            // Cleanup global variables
            this._cleanupGlobals();
        };

        script.setAttribute('data-onload', 'jitsuLoaded');
        document.head.appendChild(script);
    }

    /**
     * Process any events that were queued before initialization
     */
    _processQueue() {
        while (this.initializationQueue.length > 0) {
            const { method, args } = this.initializationQueue.shift();
            this[method](...args);
        }
    }

    /**
     * Clean up global variables to avoid exposure
     */
    _cleanupGlobals() {
        setTimeout(() => {
            delete window.jitsu;
            delete window.jitsuQ;
            delete window.jitsuConfig;
            delete window.jitsuLoaded;
        }, 0);
    }

    /**
     * Queue an action if the service isn't initialized yet
     */
    _queueIfNotInitialized(method, args) {
        if (!this.isInitialized) {
            this.initializationQueue.push({ method, args });
            return true;
        }
        return false;
    }

    /**
     * Identify a user
     * @param {string} userId - The user's identifier (typically email)
     * @param {Object} traits - Additional user properties
     */
    identify(userId, traits = {}) {
        if (this._queueIfNotInitialized('identify', [userId, traits])) return;

        this.currentUser = userId;
        this.privateInstance.identify(userId, {
            ...traits,
            timeIdentified: new Date().toISOString()
        });
    }

    /**
     * Track an event
     * @param {string} eventName - Name of the event
     * @param {Object} properties - Event properties
     */
    track(eventName, properties = {}) {
        if (this._queueIfNotInitialized('track', [eventName, properties])) return;

        this.privateInstance.track(eventName, {
            ...properties,
            timestamp: new Date().toISOString(),
            userEmail: this.currentUser || 'anonymous'
        });
    }

    /**
     * Get the current user ID
     * @returns {string|null} The current user ID or null if not set
     */
    getCurrentUser() {
        return this.currentUser;
    }
}

// Export the ICustomerService class instead of a singleton instance
window.ICustomerService = ICustomerService;
