// ===== GLOBAL CONFIGURATION =====
const API_BASE_URL = 'https://dept-backend.vercel.app/api';

// App Constants
const APP_CONSTANTS = {
    TOAST_DURATION: 5000,
    LOADING_DURATION: 1000,
    MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/jpg'],
    OTP_LENGTH: 6,
    RESEND_COOLDOWN: 60, // seconds
    ANIMATION_DURATION: 2000, // ms
    CHART_COLORS: {
        primary: '#4361ee',
        secondary: '#f72585',
        tertiary: '#4cc9f0',
        success: '#06d6a0',
        warning: '#ffd166',
        danger: '#ef476f'
    }
};

// User Roles
const USER_ROLES = {
    STUDENT: 'student',
    TEACHER: 'teacher',
    ADMIN: 'admin'
};

// Event Types
const EVENT_TYPES = {
    UPCOMING: 'upcoming',
    PAST: 'past',
    CULTURAL: 'cultural'
};

// Project Categories
const PROJECT_CATEGORIES = {
    ALL: 'all',
    DATA_SCIENCE: 'data-science',
    WEB_DEV: 'web-dev',
    MOBILE: 'mobile',
    AI_ML: 'ai-ml'
};

// Toast Types
const TOAST_TYPES = {
    SUCCESS: 'success',
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info'
};

// Form Validation Messages
const VALIDATION_MESSAGES = {
    REQUIRED_FIELD: 'This field is required',
    INVALID_EMAIL: 'Please enter a valid email address',
    PASSWORD_MIN_LENGTH: 'Password must be at least 6 characters',
    PASSWORDS_MATCH: 'Passwords do not match',
    INVALID_IMAGE_TYPE: 'Please select a valid image file (JPEG, PNG)',
    IMAGE_TOO_LARGE: 'Image size should be less than 5MB',
    INVALID_OTP: 'Please enter a valid 6-digit OTP'
};

// HTTP Status Codes
const HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    INTERNAL_ERROR: 500
};