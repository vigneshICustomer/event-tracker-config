/**
 * ICustomer Service - A wrapper around analytics functionality with anonymous user support
 */
class ICustomerService {
    static instance = null;

    #generateAnonymousId() {
        return 'anon_' + Math.random().toString(36).substr(2, 9);
    }

    #getAnonymousId() {
        let id = localStorage.getItem('anonymous_id');
        if (!id) {
            id = this.#generateAnonymousId();
            localStorage.setItem('anonymous_id', id);
        }
        return id;
    }

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

        // Initialize with anonymous ID or saved email
        const savedEmail = localStorage.getItem('user_email');
        this.currentUserId = savedEmail || this.#getAnonymousId();

        // Track page view on initialization
        if (typeof window !== 'undefined') {
            this.track('page_viewed', {
                url: window.location.href,
                title: document.title,
                referrer: document.referrer
            });
        }
    }

    async identify(email, traits = {}) {
        const previousId = this.currentUserId;
        this.currentUserId = email;
        localStorage.setItem('user_email', email);

        await fetch('https://resplendent-heliotrope-16c1b5.netlify.app/api/identify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: email,
                previousId: previousId,
                traits: {
                    ...traits,
                    email: email,
                    anonymous_id: previousId
                },
                tenantId: this.tenantId
            })
        });
    }

    async track(eventName, properties = {}) {
        await fetch('https://resplendent-heliotrope-16c1b5.netlify.app/api/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                eventName,
                userId: this.currentUserId,
                properties: {
                    ...properties,
                    user_type: this.currentUserId.startsWith('anon_') ? 'anonymous' : 'identified'
                },
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
