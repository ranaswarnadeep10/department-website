// ===== API SERVICE =====
class ApiService {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
        this.defaultHeaders = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
        this.authToken = null;
    }
    
    setAuthToken(token) {
        this.authToken = token;
    }
    
    getHeaders(additionalHeaders = {}) {
        const headers = { ...this.defaultHeaders, ...additionalHeaders };
        if (this.authToken) {
            headers['Authorization'] = `Bearer ${this.authToken}`;
        }
        return headers;
    }
    
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const headers = this.getHeaders(options.headers);
        
        try {
            const response = await fetch(url, {
                ...options,
                headers
            });
            
            // Handle 401 Unauthorized - token expired
            if (response.status === 401) {
                // Don't clear tokens here - let the auth manager handle it
                const error = {
                    status: 401,
                    message: 'Session expired. Please login again.',
                    data: null
                };
                
                // Dispatch an event that auth manager can listen to
                window.dispatchEvent(new CustomEvent('auth:unauthorized'));
                
                throw error;
            }
            
            // Handle other error statuses
            if (!response.ok) {
                let errorData;
                try {
                    errorData = await response.json();
                } catch (e) {
                    errorData = { message: response.statusText };
                }
                
                throw {
                    status: response.status,
                    message: errorData.message || 'Request failed',
                    data: errorData
                };
            }
            
            // Parse successful response
            const data = await response.json();
            return data;
            
        } catch (error) {
            // Re-throw network errors or our custom errors
            if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
                throw {
                    status: 0,
                    message: 'Network error. Please check your connection.',
                    data: null
                };
            }
            throw error;
        }
    }
    
    async get(endpoint, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = queryString ? `${endpoint}?${queryString}` : endpoint;
        return this.request(url, { method: 'GET' });
    }
    
    async post(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }
    
    async put(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }
    
    async patch(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'PATCH',
            body: JSON.stringify(data)
        });
    }
    
    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }
    
    // Auth endpoints
    async login(credentials) {
        return this.post('/auth/login', credentials);
    }
    
    async register(userData) {
        return this.post('/auth/register', userData);
    }
    
    async logout(refreshToken) {
        return this.post('/auth/logout', { refreshToken });
    }
    
    async verifyEmail(email, otp) {
        return this.post('/auth/verify-email', { email, otp });
    }
    
    async resendOtp(email) {
        return this.post('/auth/resend-otp', { email });
    }
    
    async forgotPassword(email) {
        return this.post('/auth/forgot-password', { email });
    }
    
    async refreshToken(token) {
        return this.post('/auth/refresh', { refreshToken: token });
    }
    
    async verifyToken() {
        return this.get('/auth/verify');
    }
    
    // Stats endpoints
    async getStats() {
        return this.get('/stats');
    }
    
    // About endpoints
    async getAbout() {
        return this.get('/about');
    }
    
    // Programs endpoints
    async getPrograms() {
        return this.get('/programs');
    }
    
    // Faculty endpoints
    async getFaculty() {
        return this.get('/faculty');
    }
    
    // Projects endpoints
    async getProjects() {
        return this.get('/projects');
    }
    
    // Events endpoints
    async getEvents() {
        return this.get('/events');
    }
    
    async registerForEvent(eventId) {
        return this.post(`/events/${eventId}/register`);
    }
    
    // Toppers endpoints
    async getToppers() {
        return this.get('/toppers');
    }
    
    // Contact endpoints
    async getContact() {
        return this.get('/contact');
    }
    
    async submitContact(formData) {
        return this.post('/contact/submit', formData);
    }
    
    // Student endpoints
    async getStudentDashboard() {
        return this.get('/student/dashboard');
    }
    
    async getStudentProfile() {
        return this.get('/student/profile');
    }
    
    async updateStudentProfile(data) {
        return this.put('/student/profile', data);
    }
    
    // Faculty endpoints
    async getFacultyDashboard() {
        return this.get('/faculty/dashboard');
    }
    
    async getFacultyProfile() {
        return this.get('/faculty/profile');
    }
    
    async updateFacultyProfile(data) {
        return this.put('/faculty/profile', data);
    }
    
    // Admin endpoints
    async getAdminDashboard() {
        return this.get('/admin/dashboard');
    }
    
    async getAdminUsers() {
        return this.get('/admin/users');
    }
    
    async deleteUser(userId) {
        return this.delete(`/admin/users/${userId}`);
    }
    
    async getDepartmentInfo() {
        return this.get('/admin/department-info');
    }
    
    async updateDepartmentInfo(data) {
        return this.put('/admin/department-info', data);
    }
    
    async getAdminProjects() {
        return this.get('/admin/projects');
    }
    
    async deleteProject(projectId) {
        return this.delete(`/admin/projects/${projectId}`);
    }
    
    async getAdminEvents() {
        return this.get('/admin/events');
    }
    
    async deleteEvent(eventId) {
        return this.delete(`/admin/events/${eventId}`);
    }
    
    async getAdminMessages(unread = false) {
        return this.get(`/admin/messages${unread ? '?unread=true' : ''}`);
    }
    
    async markMessageRead(messageId) {
        return this.put(`/admin/messages/${messageId}/read`);
    }
    
    async deleteFacultyMember(facultyId) {
        return this.delete(`/admin/faculty-members/${facultyId}`);
    }
    
    async deleteProgram(programId) {
        return this.delete(`/admin/programs/${programId}`);
    }
}