// ===== VALIDATION FUNCTIONS =====

// Validate email
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Validate password strength
function isStrongPassword(password) {
    return password.length >= 6;
}

// Validate phone number
function isValidPhone(phone) {
    const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,4}[-\s.]?[0-9]{1,9}$/;
    return phoneRegex.test(phone);
}

// Validate URL
function isValidUrl(url) {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

// Validate OTP
function isValidOTP(otp) {
    return /^\d{6}$/.test(otp);
}

// Validate file type
function isValidFileType(file, allowedTypes) {
    return allowedTypes.includes(file.type);
}

// Validate file size
function isValidFileSize(file, maxSize) {
    return file.size <= maxSize;
}

// Validate required fields
function validateRequired(data, fields) {
    const errors = {};
    fields.forEach(field => {
        if (!data[field] || data[field].trim() === '') {
            errors[field] = VALIDATION_MESSAGES.REQUIRED_FIELD;
        }
    });
    return errors;
}

// Validate registration data
function validateRegistration(data) {
    const errors = {};
    
    // Required fields
    const required = ['fullName', 'email', 'password', 'confirmPassword', 'gender'];
    required.forEach(field => {
        if (!data[field]) {
            errors[field] = VALIDATION_MESSAGES.REQUIRED_FIELD;
        }
    });
    
    // Email
    if (data.email && !isValidEmail(data.email)) {
        errors.email = VALIDATION_MESSAGES.INVALID_EMAIL;
    }
    
    // Password
    if (data.password && !isStrongPassword(data.password)) {
        errors.password = VALIDATION_MESSAGES.PASSWORD_MIN_LENGTH;
    }
    
    // Password match
    if (data.password && data.confirmPassword && data.password !== data.confirmPassword) {
        errors.confirmPassword = VALIDATION_MESSAGES.PASSWORDS_MATCH;
    }
    
    // Student specific
    if (data.userType === USER_ROLES.STUDENT) {
        if (!data.course) errors.course = VALIDATION_MESSAGES.REQUIRED_FIELD;
        if (!data.year) errors.year = VALIDATION_MESSAGES.REQUIRED_FIELD;
        if (!data.semester) errors.semester = VALIDATION_MESSAGES.REQUIRED_FIELD;
    }
    
    // Teacher specific
    if (data.userType === USER_ROLES.TEACHER) {
        if (!data.designation) errors.designation = VALIDATION_MESSAGES.REQUIRED_FIELD;
        if (!data.qualification) errors.qualification = VALIDATION_MESSAGES.REQUIRED_FIELD;
    }
    
    return errors;
}

// Validate login data
function validateLogin(data) {
    const errors = {};
    
    if (!data.email) {
        errors.email = VALIDATION_MESSAGES.REQUIRED_FIELD;
    } else if (!isValidEmail(data.email)) {
        errors.email = VALIDATION_MESSAGES.INVALID_EMAIL;
    }
    
    if (!data.password) {
        errors.password = VALIDATION_MESSAGES.REQUIRED_FIELD;
    }
    
    return errors;
}

// Validate profile update
function validateProfileUpdate(data) {
    const errors = {};
    
    if (data.email && !isValidEmail(data.email)) {
        errors.email = VALIDATION_MESSAGES.INVALID_EMAIL;
    }
    
    if (data.phone && !isValidPhone(data.phone)) {
        errors.phone = 'Please enter a valid phone number';
    }
    
    return errors;
}

// Validate project data
function validateProject(data) {
    const errors = {};
    
    if (!data.title) errors.title = VALIDATION_MESSAGES.REQUIRED_FIELD;
    if (!data.description) errors.description = VALIDATION_MESSAGES.REQUIRED_FIELD;
    if (!data.category) errors.category = VALIDATION_MESSAGES.REQUIRED_FIELD;
    
    if (data.github && !isValidUrl(data.github)) {
        errors.github = 'Please enter a valid URL';
    }
    
    if (data.demo && !isValidUrl(data.demo)) {
        errors.demo = 'Please enter a valid URL';
    }
    
    return errors;
}

// Validate event data
function validateEvent(data) {
    const errors = {};
    
    if (!data.title) errors.title = VALIDATION_MESSAGES.REQUIRED_FIELD;
    if (!data.description) errors.description = VALIDATION_MESSAGES.REQUIRED_FIELD;
    if (!data.date) errors.date = VALIDATION_MESSAGES.REQUIRED_FIELD;
    if (!data.time) errors.time = VALIDATION_MESSAGES.REQUIRED_FIELD;
    if (!data.location) errors.location = VALIDATION_MESSAGES.REQUIRED_FIELD;
    
    return errors;
}

// Validate contact form
function validateContact(data) {
    const errors = {};
    
    if (!data.name) errors.name = VALIDATION_MESSAGES.REQUIRED_FIELD;
    if (!data.email) {
        errors.email = VALIDATION_MESSAGES.REQUIRED_FIELD;
    } else if (!isValidEmail(data.email)) {
        errors.email = VALIDATION_MESSAGES.INVALID_EMAIL;
    }
    if (!data.subject) errors.subject = VALIDATION_MESSAGES.REQUIRED_FIELD;
    if (!data.message) errors.message = VALIDATION_MESSAGES.REQUIRED_FIELD;
    
    return errors;
}