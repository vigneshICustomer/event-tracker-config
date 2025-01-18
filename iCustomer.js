/**
 * ICustomer Service - A wrapper around analytics functionality
 */
class ICustomerService {
    constructor() {
        this.isInitialized = false;
        this.privateInstance = null;
        this.initializationQueue = [];
        this.currentUser = null;
        this.config = null;
    }

    /**
     * Initialize the service with configuration
     * @param {Object} config - Configuration object
     * @param {string} config.analyticsUrl - URL for the analytics service
     */
    init(config) {
        if (!config || !config.analyticsUrl) {
            throw new Error('Analytics URL is required');
        }
        this.config = config;
        this._initialize();
        return this;
    }

    /**
     * Private initialization method
     */
    _initialize() {
        if (!this.config) {
            throw new Error('Must call init() with config first');
        }

        // Create a script element for the analytics provider
        const script = document.createElement('script');
        script.src = this.config.analyticsUrl;
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

// Create and export a singleton instance
const iCustomer = new ICustomerService();

// Export the instance with public methods only
window.iCustomer = {
    init: iCustomer.init.bind(iCustomer),
    identify: iCustomer.identify.bind(iCustomer),
    track: iCustomer.track.bind(iCustomer),
    getCurrentUser: iCustomer.getCurrentUser.bind(iCustomer)
};
