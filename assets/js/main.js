// ===== MAIN ENTRY POINT =====
// Initialize all managers and start the application

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Small delay to ensure components start loading
    setTimeout(() => {
        initializeApp();
    }, 100);
});

// Separate initialization function for better control
async function initializeApp() {
    console.log('Initializing Department Portal...');
    
    try {
        // Wait for core components to load
        await waitForComponents(['navbar-container', 'footer-container']);
        
        // Initialize Toast Manager first
        if (typeof ToastManager !== 'undefined') {
            window.toastManager = new ToastManager();
            console.log('✓ ToastManager initialized');
        } else {
            console.error('ToastManager not loaded');
        }
        
        // Initialize API Service
        if (typeof ApiService !== 'undefined') {
            window.apiService = new ApiService(API_BASE_URL);
            console.log('✓ ApiService initialized');
        } else {
            console.error('ApiService not loaded');
        }
        
        // Initialize Theme Manager
        if (typeof ThemeManager !== 'undefined') {
            window.themeManager = new ThemeManager();
            console.log('✓ ThemeManager initialized');
        } else {
            console.error('ThemeManager not loaded');
        }
        
        // Initialize Auth Manager
        if (typeof AuthManager !== 'undefined' && window.apiService && window.toastManager) {
            window.authManager = new AuthManager(window.apiService, window.toastManager);
            console.log('✓ AuthManager initialized');
        } else {
            console.error('AuthManager dependencies not met');
        }
        
        // Initialize App Manager
        if (typeof AppManager !== 'undefined' && window.apiService && window.authManager && window.toastManager) {
            window.app = new AppManager(window.apiService, window.authManager, window.toastManager);
            console.log('✓ AppManager initialized');
        } else {
            console.error('AppManager dependencies not met');
        }
        
        // Initialize SimpleImageEditor if elements exist
        const profilePicInput = document.getElementById('profile-pic');
        if (profilePicInput && typeof SimpleImageEditor !== 'undefined') {
            window.imageEditor = new SimpleImageEditor();
            console.log('✓ ImageEditor initialized');
        }
        
        // Check if all managers are initialized
        if (window.app && window.authManager) {
            console.log('✓ All managers initialized successfully');
            
            // Handle hash navigation
            const hash = window.location.hash.substring(1);
            if (hash) {
                setTimeout(() => {
                    if (document.getElementById(hash)) {
                        window.app.showSection(hash);
                        window.app.updateActiveNavLink(hash);
                    } else {
                        // If it's a dashboard section, load it first
                        if (isDashboardSection(hash)) {
                            loadDashboardAndShow(hash);
                        }
                    }
                }, 500);
            }
            
            // Dispatch event that app is ready
            window.dispatchEvent(new CustomEvent('app:ready'));
        } else {
            console.error('Failed to initialize all managers');
        }
        
    } catch (error) {
        console.error('Error during app initialization:', error);
        if (window.toastManager) {
            window.toastManager.error('Failed to initialize application. Please refresh the page.');
        }
    }
}

// Helper function to wait for components to load
function waitForComponents(containerIds, timeout = 5000) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        
        function checkComponents() {
            const allLoaded = containerIds.every(id => {
                const container = document.getElementById(id);
                return container && container.children.length > 0;
            });
            
            if (allLoaded) {
                resolve();
            } else if (Date.now() - startTime > timeout) {
                reject(new Error('Timeout waiting for components to load'));
            } else {
                setTimeout(checkComponents, 100);
            }
        }
        
        checkComponents();
    });
}

// Check if section is a dashboard section
function isDashboardSection(sectionId) {
    const dashboardSections = [
        'student-dashboard', 'student-profile', 'student-edit-profile', 'student-projects', 'student-events',
        'faculty-dashboard', 'faculty-profile', 'faculty-edit-profile', 'faculty-students', 'faculty-courses', 'faculty-projects',
        'admin-dashboard', 'admin-users', 'admin-faculty', 'admin-programs', 'admin-projects', 'admin-events',
        'admin-messages', 'admin-analytics', 'admin-settings', 'admin-toppers'
    ];
    return dashboardSections.includes(sectionId);
}

// Load dashboard and show it
async function loadDashboardAndShow(sectionId) {
    if (window.loadDashboardComponent) {
        const loaded = await window.loadDashboardComponent(sectionId);
        if (loaded && window.app) {
            setTimeout(() => {
                window.app.showSection(sectionId);
                window.app.updateActiveNavLink(sectionId);
            }, 100);
        }
    }
}

// ===== GLOBAL ERROR HANDLERS =====

// Handle offline/online events
window.addEventListener('online', () => {
    console.log('App is online');
    if (window.toastManager) {
        window.toastManager.success('You are back online!');
    }
});

window.addEventListener('offline', () => {
    console.log('App is offline');
    if (window.toastManager) {
        window.toastManager.warning('You are offline. Some features may not work.');
    }
});

// Handle uncaught errors
window.addEventListener('error', (event) => {
    console.error('Uncaught error:', event.error || event.message);
    if (window.toastManager && !event.filename?.includes('favicon.ico')) {
        window.toastManager.error('An unexpected error occurred');
    }
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled rejection:', event.reason);
    
    if (event.reason?.status === 401) {
        console.log('Authentication error detected');
        return;
    }
    
    if (window.toastManager) {
        window.toastManager.error('An unexpected error occurred');
    }
});

// ===== UTILITY FUNCTIONS FOR GLOBAL USE =====

// Helper to check if user is authenticated
window.isAuthenticated = function() {
    return window.authManager?.isAuthenticated || false;
};

// Helper to get current user
window.getCurrentUser = function() {
    return window.authManager?.currentUser || null;
};

// Helper to logout
window.logout = function() {
    if (window.authManager) {
        window.authManager.logout();
    }
};

// Helper to show toast messages
window.showToast = function(message, type = 'info') {
    if (window.toastManager) {
        window.toastManager.show(message, type);
    } else {
        alert(message);
    }
};

// Helper to format dates
window.formatDate = function(dateString, format = 'medium') {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Invalid Date';
        
        const options = {
            short: { month: 'numeric', day: 'numeric', year: '2-digit' },
            medium: { month: 'short', day: 'numeric', year: 'numeric' },
            long: { month: 'long', day: 'numeric', year: 'numeric' },
            full: { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }
        };
        
        return date.toLocaleDateString(undefined, options[format] || options.medium);
    } catch (e) {
        console.error('Date formatting error:', e);
        return dateString;
    }
};

// Helper to load dashboard on demand
window.loadDashboard = async function(sectionId) {
    return await loadDashboardAndShow(sectionId);
};

// ===== PERFORMANCE MONITORING =====

window.addEventListener('load', () => {
    setTimeout(() => {
        const performance = window.performance;
        if (performance) {
            const perfData = performance.getEntriesByType('navigation')[0];
            if (perfData) {
                console.log(`Page load time: ${perfData.loadEventEnd - perfData.navigationStart}ms`);
            }
        }
    }, 0);
});

// ===== DEBUGGING HELPERS (Development only) =====

if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.debug = {
        app: () => console.log('App State:', window.app),
        auth: () => console.log('Auth State:', window.authManager),
        theme: () => console.log('Theme:', window.themeManager?.getTheme()),
        toast: (msg) => window.toastManager?.show(msg),
        sections: () => {
            const sections = document.querySelectorAll('.content-section, .dashboard-section');
            console.log('Available sections:', Array.from(sections).map(s => s.id));
        },
        loadDashboard: (section) => window.loadDashboard(section),
        reload: () => {
            localStorage.clear();
            sessionStorage.clear();
            window.location.reload();
        }
    };
    console.log('Debug helpers available. Use window.debug to access them.');
}

// ===== EXPOSE GLOBAL APP OBJECT =====
window.appVersion = '1.0.0';
window.appName = 'CSE Department Portal';

console.log('Department Portal v' + window.appVersion + ' loaded');
console.log('Environment:', window.location.hostname === 'localhost' ? 'Development' : 'Production');