// ===== AUTHENTICATION MANAGER =====
class AuthManager {
    constructor(apiService, toastManager) {
        this.api = apiService;
        this.toast = toastManager;
        
        this.isAuthenticated = false;
        this.currentUser = null;
        this.accessToken = null;
        this.refreshTokenValue = null;
        this.pendingVerificationEmail = null;
        this.resendCooldown = 0;
        this.tokenRefreshPromise = null;
        
        this.init();
    }
    
    init() {
        this.loadTokens();
        this.setupEventListeners();
        this.checkAuthStatus();
        this.preventFormSubmission();
        
        window.addEventListener('auth:unauthorized', () => {
            this.handleUnauthorized();
        });
    }
    
    preventFormSubmission() {
        document.querySelectorAll('form').forEach(form => {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                e.stopPropagation();
                return false;
            });
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const target = e.target;
                if (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA') {
                    e.preventDefault();
                    
                    if (target.closest('#login-modal')) {
                        document.getElementById('login-submit-btn')?.click();
                    }
                    if (target.closest('#register-modal')) {
                        document.getElementById('register-submit-btn')?.click();
                    }
                }
            }
        });
    }
    
    loadTokens() {
        this.accessToken = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
        this.refreshTokenValue = localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken');
        const userData = localStorage.getItem('userData');
        
        if (this.accessToken) {
            this.api.setAuthToken(this.accessToken);
        }
        
        if (userData) {
            try {
                this.currentUser = JSON.parse(userData);
                this.isAuthenticated = true;
            } catch (e) {
                console.error('Error parsing user data:', e);
                this.clearAuthData();
            }
        }
    }
    
    setupEventListeners() {
        const loginBtn = document.getElementById('login-btn');
        const registerBtn = document.getElementById('register-btn');
        const logoutBtn = document.getElementById('logout-btn');
        const forgotPasswordLink = document.getElementById('forgot-password-link');
        
        if (loginBtn) loginBtn.addEventListener('click', () => this.openModal('login-modal'));
        if (registerBtn) registerBtn.addEventListener('click', () => this.openModal('register-modal'));
        if (logoutBtn) logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.logout();
        });
        
        if (forgotPasswordLink) {
            forgotPasswordLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.closeModal('login-modal');
                this.openModal('forgot-password-modal');
            });
        }
        
        const switchToRegister = document.getElementById('switch-to-register');
        const switchToLogin = document.getElementById('switch-to-login');
        const switchToLoginFromForgot = document.getElementById('switch-to-login-from-forgot');
        
        if (switchToRegister) {
            switchToRegister.addEventListener('click', () => {
                this.closeModal('login-modal');
                this.openModal('register-modal');
            });
        }
        
        if (switchToLogin) {
            switchToLogin.addEventListener('click', () => {
                this.closeModal('register-modal');
                this.openModal('login-modal');
            });
        }
        
        if (switchToLoginFromForgot) {
            switchToLoginFromForgot.addEventListener('click', () => {
                this.closeModal('forgot-password-modal');
                this.openModal('login-modal');
            });
        }
        
        const loginSubmitBtn = document.getElementById('login-submit-btn');
        const registerSubmitBtn = document.getElementById('register-submit-btn');
        const forgotPasswordSubmitBtn = document.getElementById('forgot-password-submit-btn');
        const verifyOtpBtn = document.getElementById('verify-otp-btn');
        
        if (loginSubmitBtn) loginSubmitBtn.addEventListener('click', (e) => this.handleLogin(e));
        if (registerSubmitBtn) registerSubmitBtn.addEventListener('click', (e) => this.handleRegister(e));
        if (forgotPasswordSubmitBtn) forgotPasswordSubmitBtn.addEventListener('click', (e) => this.handleForgotPassword(e));
        if (verifyOtpBtn) verifyOtpBtn.addEventListener('click', (e) => this.handleOtpVerification(e));
        
        document.querySelectorAll('input[name="userType"]').forEach(radio => {
            radio.addEventListener('change', (e) => this.toggleUserFields(e.target.value));
        });
        
        document.querySelectorAll('.modal-close, .modal-content [data-modal]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const modalId = e.target.closest('[data-modal]')?.dataset.modal;
                if (modalId) {
                    this.closeModal(modalId);
                }
            });
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const openModal = document.querySelector('.modal.active');
                if (openModal) {
                    this.closeModal(openModal.id);
                }
            }
        });
        
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModal(e.target.id);
            }
        });
        
        const studentPortalBtn = document.getElementById('student-portal-btn');
        if (studentPortalBtn) {
            studentPortalBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (this.isAuthenticated) {
                    const dashboardSection = this.currentUser.role === 'student' ? 'student-dashboard' : 
                                           this.currentUser.role === 'teacher' ? 'faculty-dashboard' :
                                           this.currentUser.role === 'admin' ? 'admin-dashboard' : 'student-dashboard';
                    window.app.showSection(dashboardSection);
                } else {
                    this.openModal('login-modal');
                    this.toast.info('Please login to access portal');
                }
            });
        }
        
        const studentLoginFooter = document.getElementById('student-login-footer');
        if (studentLoginFooter) {
            studentLoginFooter.addEventListener('click', (e) => {
                e.preventDefault();
                if (this.isAuthenticated) {
                    const dashboardSection = this.currentUser.role === 'student' ? 'student-dashboard' : 
                                           this.currentUser.role === 'teacher' ? 'faculty-dashboard' :
                                           this.currentUser.role === 'admin' ? 'admin-dashboard' : 'student-dashboard';
                    window.app.showSection(dashboardSection);
                } else {
                    this.openModal('login-modal');
                }
            });
        }
        
        const dashboardLink = document.getElementById('dashboard-link');
        const profileLink = document.getElementById('profile-link');
        
        if (dashboardLink) {
            dashboardLink.addEventListener('click', (e) => {
                e.preventDefault();
                if (this.isAuthenticated) {
                    const dashboardSection = this.currentUser.role === 'student' ? 'student-dashboard' : 
                                           this.currentUser.role === 'teacher' ? 'faculty-dashboard' :
                                           this.currentUser.role === 'admin' ? 'admin-dashboard' : 'student-dashboard';
                    window.app.showSection(dashboardSection);
                }
            });
        }
        
        if (profileLink) {
            profileLink.addEventListener('click', (e) => {
                e.preventDefault();
                if (this.isAuthenticated) {
                    const profileSection = this.currentUser.role === 'student' ? 'student-profile' : 
                                         this.currentUser.role === 'teacher' ? 'faculty-profile' : 'admin-dashboard';
                    window.app.showSection(profileSection);
                }
            });
        }
        
        const resendOtpBtn = document.getElementById('resend-otp-btn');
        if (resendOtpBtn) {
            resendOtpBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.resendOtp();
            });
        }
        
        this.setupOtpInputs();
    }
    
    handleUnauthorized() {
        this.refreshAccessToken().then(success => {
            if (!success) {
                this.clearAuthData();
                this.toast.warning('Your session has expired. Please login again.');
                this.openModal('login-modal');
            }
        });
    }
    
    toggleUserFields(userType) {
        const studentFields = document.querySelector('.student-fields');
        const teacherFields = document.querySelector('.teacher-fields');
        
        if (userType === 'student') {
            if (studentFields) studentFields.style.display = 'block';
            if (teacherFields) teacherFields.style.display = 'none';
            
            const studentRequired = ['course', 'year', 'semester'];
            studentRequired.forEach(field => {
                const el = document.getElementById(field);
                if (el) el.required = true;
            });
            
            const teacherNotRequired = ['designation', 'qualification', 'experience'];
            teacherNotRequired.forEach(field => {
                const el = document.getElementById(field);
                if (el) el.required = false;
            });
        } else {
            if (studentFields) studentFields.style.display = 'none';
            if (teacherFields) teacherFields.style.display = 'block';
            
            const teacherRequired = ['designation', 'qualification'];
            teacherRequired.forEach(field => {
                const el = document.getElementById(field);
                if (el) el.required = true;
            });
            
            const studentNotRequired = ['course', 'year', 'semester'];
            studentNotRequired.forEach(field => {
                const el = document.getElementById(field);
                if (el) el.required = false;
            });
        }
    }
    
    async handleLogin(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const emailInput = document.getElementById('login-email');
        const passwordInput = document.getElementById('login-password');
        
        if (!emailInput || !passwordInput) {
            this.toast.error('Login form not found');
            return;
        }
        
        const credentials = {
            email: emailInput.value.trim(),
            password: passwordInput.value
        };
        
        if (!credentials.email || !credentials.password) {
            this.toast.error('Email and password are required');
            return;
        }
        
        if (!this.isValidEmail(credentials.email)) {
            this.toast.error('Please enter a valid email address');
            return;
        }
        
        try {
            const loginBtn = document.getElementById('login-submit-btn');
            if (loginBtn) {
                loginBtn.disabled = true;
                loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
            }
            
            const data = await this.api.login(credentials);
            
            this.setAuthData(data);
            this.closeModal('login-modal');
            this.toast.success('Login successful!');
            this.updateUI();
            
        } catch (error) {
            console.error('Login error:', error);
            this.toast.error(error.message || 'Login failed. Please check your credentials.');
        } finally {
            const loginBtn = document.getElementById('login-submit-btn');
            if (loginBtn) {
                loginBtn.disabled = false;
                loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
            }
        }
    }
    
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    async handleRegister(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const formData = {
            userType: document.querySelector('input[name="userType"]:checked')?.value || 'student',
            fullName: document.getElementById('register-fullname')?.value || '',
            email: document.getElementById('register-email')?.value || '',
            password: document.getElementById('register-password')?.value || '',
            confirmPassword: document.getElementById('confirm-password')?.value || '',
            gender: document.getElementById('register-gender')?.value || '',
            registrationNo: document.getElementById('registration-no')?.value || '',
            course: document.getElementById('course')?.value || '',
            year: document.getElementById('year')?.value || '',
            semester: document.getElementById('semester')?.value || '',
            caste: document.getElementById('caste')?.value || '',
            dateOfBirth: document.getElementById('dob')?.value || '',
            designation: document.getElementById('designation')?.value || '',
            qualification: document.getElementById('qualification')?.value || '',
            experienceYears: document.getElementById('experience')?.value || '0',
            bio: document.getElementById('bio')?.value || ''
        };
        
        const requiredFields = ['fullName', 'email', 'password', 'confirmPassword', 'gender'];
        for (const field of requiredFields) {
            if (!formData[field]) {
                this.toast.error(`${field.replace(/([A-Z])/g, ' $1').trim()} is required`);
                return;
            }
        }
        
        if (!this.isValidEmail(formData.email)) {
            this.toast.error('Please enter a valid email address');
            return;
        }
        
        if (formData.password !== formData.confirmPassword) {
            this.toast.error('Passwords do not match');
            return;
        }
        
        if (formData.password.length < 6) {
            this.toast.error('Password must be at least 6 characters');
            return;
        }
        
        const termsCheckbox = document.getElementById('terms-checkbox');
        if (!termsCheckbox || !termsCheckbox.checked) {
            this.toast.error('Please agree to the Terms and Conditions');
            return;
        }
        
        if (formData.userType === 'student') {
            if (!formData.course || !formData.year || !formData.semester) {
                this.toast.error('Course, Year, and Semester are required for students');
                return;
            }
        } else if (formData.userType === 'teacher') {
            if (!formData.designation || !formData.qualification) {
                this.toast.error('Designation and Qualification are required for teachers');
                return;
            }
        }
        
        if (window.imageEditor) {
            const croppedImage = window.imageEditor.getCroppedImage();
            if (croppedImage) {
                formData.profilePic = croppedImage;
            }
        }
        
        delete formData.confirmPassword;
        
        if (formData.year) formData.year = parseInt(formData.year);
        if (formData.semester) formData.semester = parseInt(formData.semester);
        if (formData.experienceYears) formData.experienceYears = parseInt(formData.experienceYears);
        
        try {
            const registerBtn = document.getElementById('register-submit-btn');
            if (registerBtn) {
                registerBtn.disabled = true;
                registerBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Account...';
            }
            
            const data = await this.api.register(formData);
            
            this.closeModal('register-modal');
            this.pendingVerificationEmail = formData.email;
            this.showOtpVerification(formData.email);
            this.toast.success('Registration successful! Please verify your email.');
            
        } catch (error) {
            console.error('Registration error:', error);
            this.toast.error(error.message || 'Registration failed. Please try again.');
        } finally {
            const registerBtn = document.getElementById('register-submit-btn');
            if (registerBtn) {
                registerBtn.disabled = false;
                registerBtn.innerHTML = '<i class="fas fa-user-plus"></i> Create Account';
            }
        }
    }
    
    async handleForgotPassword(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const emailInput = document.getElementById('forgot-email');
        if (!emailInput) return;
        
        const email = emailInput.value.trim();
        if (!email) {
            this.toast.error('Email is required');
            return;
        }
        
        if (!this.isValidEmail(email)) {
            this.toast.error('Please enter a valid email address');
            return;
        }
        
        try {
            const submitBtn = document.getElementById('forgot-password-submit-btn');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
            }
            
            await this.api.forgotPassword(email);
            
            this.closeModal('forgot-password-modal');
            this.toast.success('Password reset link sent to your email');
            this.openModal('login-modal');
            
        } catch (error) {
            console.error('Forgot password error:', error);
            this.toast.error(error.message || 'Failed to send reset link');
        } finally {
            const submitBtn = document.getElementById('forgot-password-submit-btn');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Reset Link';
            }
        }
    }
    
    setAuthData(data) {
        this.accessToken = data.accessToken;
        this.refreshTokenValue = data.refreshToken;
        this.currentUser = data.user;
        this.isAuthenticated = true;
        
        this.api.setAuthToken(this.accessToken);
        
        const rememberMe = document.getElementById('remember-me')?.checked;
        const storage = rememberMe ? localStorage : sessionStorage;
        
        storage.setItem('accessToken', data.accessToken);
        storage.setItem('refreshToken', data.refreshToken);
        storage.setItem('userData', JSON.stringify(data.user));
        
        this.updateUI();
        this.updateDashboardLinks();
        
        // Re-setup navigation listeners to include new dashboard links

    }
    
    async checkAuthStatus() {
        if (!this.accessToken) return;
        
        try {
            await this.api.verifyToken();
        } catch (error) {
            if (error.status === 401) {
                await this.refreshAccessToken();
            } else {
                console.error('Auth check error:', error);
            }
        }
        
        this.updateUI();
    }
    
    async refreshAccessToken() {
        if (this.tokenRefreshPromise) {
            return this.tokenRefreshPromise;
        }
        
        if (!this.refreshTokenValue) {
            this.clearAuthData();
            return false;
        }
        
        this.tokenRefreshPromise = (async () => {
            try {
                const data = await this.api.refreshToken(this.refreshTokenValue);
                this.setAuthData(data);
                return true;
            } catch (error) {
                console.error('Token refresh error:', error);
                this.clearAuthData();
                return false;
            } finally {
                this.tokenRefreshPromise = null;
            }
        })();
        
        return this.tokenRefreshPromise;
    }
    
    clearAuthData() {
        this.isAuthenticated = false;
        this.currentUser = null;
        this.accessToken = null;
        this.refreshTokenValue = null;
        
        this.api.setAuthToken(null);
        
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('userData');
        sessionStorage.removeItem('accessToken');
        sessionStorage.removeItem('refreshToken');
        
        this.updateUI();
        this.clearDashboardLinks();
        
        // Re-setup navigation listeners

    }
    
    async logout() {
        try {
            if (this.refreshTokenValue) {
                await this.api.logout(this.refreshTokenValue);
            }
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            this.clearAuthData();
            this.toast.info('Logged out successfully');
            if (window.app) {
                window.app.showSection('home');
            }
        }
    }
    
    updateUI() {
        const authButtons = document.getElementById('auth-buttons');
        const userMenu = document.getElementById('user-menu');
        
        if (this.isAuthenticated && this.currentUser) {
            if (authButtons) authButtons.style.display = 'none';
            if (userMenu) userMenu.style.display = 'block';
            
            const userName = document.getElementById('user-name');
            const userRole = document.getElementById('user-role');
            const userAvatarImg = document.getElementById('user-avatar-img');
            
            if (userName) userName.textContent = this.currentUser.fullName;
            if (userRole) {
                userRole.textContent = this.currentUser.role.charAt(0).toUpperCase() + this.currentUser.role.slice(1);
            }
            if (userAvatarImg) {
                const avatarUrl = this.currentUser.avatar || 
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(this.currentUser.fullName)}&background=4361ee&color=fff`;
                userAvatarImg.src = avatarUrl;
            }
            
            this.updateDashboardLinks();
            
        } else {
            if (authButtons) authButtons.style.display = 'flex';
            if (userMenu) userMenu.style.display = 'none';
            
            this.clearDashboardLinks();
        }
    }
    
    updateDashboardLinks() {
        this.updateNavbarDashboardLinks();
        this.updateDropdownDashboardLinks();
    }
    
    updateNavbarDashboardLinks() {
        const container = document.getElementById('dynamic-dashboard-links');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (this.isAuthenticated && this.currentUser) {
            const links = this.getDashboardLinksForRole(this.currentUser.role);
            links.forEach(link => {
                const anchor = document.createElement('a');
                anchor.href = `#${link.section}`;
            anchor.className = 'dropdown-item';
            anchor.setAttribute('data-dashboard', link.section);

            anchor.addEventListener('click', (e) => {
                e.preventDefault();

                const section = e.currentTarget.dataset.dashboard;
                if (window.app && section) {
                    window.app.showSection(section);
                }
            });
                anchor.innerHTML = `<i class="fas ${link.icon}"></i> ${link.text}`;
                container.appendChild(anchor);
            });
        }
    }
    
    updateDropdownDashboardLinks() {
        const container = document.getElementById('dropdown-dashboard-links');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (this.isAuthenticated && this.currentUser) {
            const links = this.getDashboardLinksForRole(this.currentUser.role);
            links.forEach(link => {
                const anchor = document.createElement('a');
                anchor.href = `#${link.section}`;
                anchor.className = 'dropdown-item';
                anchor.setAttribute('data-section', link.section);
                anchor.innerHTML = `<i class="fas ${link.icon}"></i> ${link.text}`;
                container.appendChild(anchor);
            });
            
            if (links.length > 0) {
                const divider = document.createElement('div');
                divider.className = 'dropdown-divider';
                container.appendChild(divider);
            }
        }
    }
    
    clearDashboardLinks() {
        const navbarContainer = document.getElementById('dynamic-dashboard-links');
        const dropdownContainer = document.getElementById('dropdown-dashboard-links');
        
        if (navbarContainer) navbarContainer.innerHTML = '';
        if (dropdownContainer) dropdownContainer.innerHTML = '';
    }
    
   getDashboardLinksForRole(role) {
    const links = {
        'student': [
            { section: 'student-dashboard', icon: 'fa-tachometer-alt', text: 'Dashboard' },
            { section: 'student-profile', icon: 'fa-user', text: 'Profile' },
            { section: 'student-projects', icon: 'fa-project-diagram', text: 'My Projects' },
            { section: 'student-events', icon: 'fa-calendar-alt', text: 'Events' }
        ],
        'teacher': [
            { section: 'faculty-dashboard', icon: 'fa-tachometer-alt', text: 'Dashboard' },
            { section: 'faculty-profile', icon: 'fa-user', text: 'Profile' },
            { section: 'faculty-students', icon: 'fa-user-graduate', text: 'Students' },
            { section: 'faculty-courses', icon: 'fa-book', text: 'Courses' },
            { section: 'faculty-projects', icon: 'fa-project-diagram', text: 'Projects' }
        ],
        'admin': [
            { section: 'admin-dashboard', icon: 'fa-tachometer-alt', text: 'Dashboard' },
            { section: 'admin-users', icon: 'fa-users', text: 'Users' },
            { section: 'admin-faculty', icon: 'fa-chalkboard-teacher', text: 'Faculty' },
            { section: 'admin-programs', icon: 'fa-graduation-cap', text: 'Programs' },
            { section: 'admin-projects', icon: 'fa-project-diagram', text: 'Projects' },
            { section: 'admin-events', icon: 'fa-calendar-alt', text: 'Events' },
            { section: 'admin-messages', icon: 'fa-envelope', text: 'Messages' }
        ]
    };
    
    return links[role] || [];
}
    
    getAuthHeaders() {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.accessToken}`
        };
    }
    
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }
    
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = 'auto';
        }
    }
    
    showOtpVerification(email) {
        const otpEmailDisplay = document.getElementById('otp-email-display');
        if (otpEmailDisplay) {
            otpEmailDisplay.textContent = email;
        }
        
        document.querySelectorAll('.otp-input').forEach(input => {
            input.value = '';
        });
        
        this.startResendTimer();
        this.openModal('otp-verification-modal');
        this.setupOtpInputs();
        
        const firstOtpInput = document.querySelector('.otp-input');
        if (firstOtpInput) {
            setTimeout(() => firstOtpInput.focus(), 100);
        }
    }
    
    setupOtpInputs() {
        const inputs = document.querySelectorAll('.otp-input');
        
        inputs.forEach((input, index) => {
            const newInput = input.cloneNode(true);
            input.parentNode.replaceChild(newInput, input);
        });
        
        const newInputs = document.querySelectorAll('.otp-input');
        
        newInputs.forEach((input, index) => {
            input.addEventListener('input', (e) => {
                if (e.target.value && index < newInputs.length - 1) {
                    newInputs[index + 1].focus();
                }
                
                if (Array.from(newInputs).every(input => input.value)) {
                    this.handleOtpVerification(new Event('submit'));
                }
            });
            
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && !e.target.value && index > 0) {
                    newInputs[index - 1].focus();
                }
                
                if (e.key === 'ArrowLeft' && index > 0) {
                    newInputs[index - 1].focus();
                }
                if (e.key === 'ArrowRight' && index < newInputs.length - 1) {
                    newInputs[index + 1].focus();
                }
            });
            
            input.addEventListener('keypress', (e) => {
                if (!/^\d$/.test(e.key)) {
                    e.preventDefault();
                }
            });
        });
    }
    
    async handleOtpVerification(e) {
        e.preventDefault();
        
        const inputs = document.querySelectorAll('.otp-input');
        const otp = Array.from(inputs).map(input => input.value).join('');
        
        if (otp.length !== 6) {
            this.toast.error('Please enter the complete 6-digit code');
            return;
        }
        
        try {
            const verifyBtn = document.getElementById('verify-otp-btn');
            if (verifyBtn) verifyBtn.disabled = true;
            
            const data = await this.api.verifyEmail(this.pendingVerificationEmail, otp);
            
            this.closeModal('otp-verification-modal');
            this.toast.success('Email verified successfully! Account created.');
            
            if (data.accessToken && data.user) {
                this.setAuthData(data);
                this.updateUI();
            }
            
        } catch (error) {
            console.error('OTP verification error:', error);
            this.toast.error(error.message || 'Invalid verification code');
            inputs.forEach(input => input.value = '');
            inputs[0].focus();
        } finally {
            const verifyBtn = document.getElementById('verify-otp-btn');
            if (verifyBtn) verifyBtn.disabled = false;
        }
    }
    
    async resendOtp() {
        if (this.resendCooldown > 0) return;
        
        try {
            await this.api.resendOtp(this.pendingVerificationEmail);
            this.toast.success('Verification code resent to your email');
            this.startResendTimer();
        } catch (error) {
            console.error('Resend OTP error:', error);
            this.toast.error(error.message || 'Failed to resend code');
        }
    }
    
    startResendTimer() {
        this.resendCooldown = 60;
        const resendBtn = document.getElementById('resend-otp-btn');
        const timerDisplay = document.getElementById('resend-timer');
        
        if (resendBtn) resendBtn.disabled = true;
        
        const timer = setInterval(() => {
            this.resendCooldown--;
            
            if (this.resendCooldown <= 0) {
                clearInterval(timer);
                if (resendBtn) resendBtn.disabled = false;
                if (timerDisplay) timerDisplay.textContent = '';
            } else {
                if (timerDisplay) timerDisplay.textContent = `Resend available in ${this.resendCooldown}s`;
            }
        }, 1000);
    }
}