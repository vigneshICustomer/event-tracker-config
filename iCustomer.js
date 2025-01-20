/**
 * ICustomer Service - A wrapper around analytics functionality with anonymous user support
 */
class ICustomerService {
    static instance = null;

    /**
     * Initialize the ICustomer Service
     * @param {Object} options - Configuration options
     * @param {string} options.tenantId - The tenant ID for tracking
     */
    static initialize(options = {}) {
        if (!ICustomerService.instance) {
            ICustomerService.instance = new ICustomerService(options);
        }
        return ICustomerService.instance;
    }

    /**
     * Identify a user
     * @param {string} email - The user's email
     * @param {Object} traits - Additional user properties
     */
    static async identify(email, traits = {}) {
        if (!ICustomerService.instance) {
            throw new Error('ICustomerService must be initialized first');
        }
        return ICustomerService.instance.identify(email, traits);
    }

    /**
     * Track an event
     * @param {string} eventName - Name of the event
     * @param {Object} properties - Event properties
     */
    static async track(eventName, properties = {}) {
        if (!ICustomerService.instance) {
            throw new Error('ICustomerService must be initialized first');
        }
        return ICustomerService.instance.track(eventName, properties);
    }

    /**
     * Get the current user ID
     * @returns {string} The current user ID
     */
    static getCurrentUser() {
        if (!ICustomerService.instance) {
            throw new Error('ICustomerService must be initialized first');
        }
        return ICustomerService.instance.getCurrentUser();
    }

    constructor(options = {}) {
        this.tenantId = options.tenantId;
        
        if (!this.tenantId) {
            throw new Error('ICustomerService requires a tenantId for initialization');
        }

        // Initialize with saved email if exists
        this.currentUserId = localStorage.getItem('user_email');

        // Track page view on initialization using Jitsu
        if (typeof window !== 'undefined') {
            this.track('page_viewed', {
                url: window.location.href,
                title: document.title,
                referrer: document.referrer
            });
        }
    }

    async identify(email, traits = {}) {
        this.currentUserId = email;
        localStorage.setItem('user_email', email);

        await fetch('https://icustomer-tracker-backend.onrender.com/api/identify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: email,
                traits: {
                    ...traits,
                    email: email
                },
                tenantId: this.tenantId
            })
        });
    }

    async track(eventName, properties = {}) {
        await fetch('https://icustomer-tracker-backend.onrender.com/api/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                eventName,
                userId: this.currentUserId || undefined, // Let Jitsu handle anonymous state
                properties,
                tenantId: this.tenantId
            })
        });
    }

    getCurrentUser() {
        return this.currentUserId;
    }
}

// Export the ICustomerService class
window.ICustomerService = ICustomerService;
