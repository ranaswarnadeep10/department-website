// ===== APPLICATION MANAGER =====
class AppManager {
    constructor(apiService, authManager, toastManager) {
        this.api = apiService;
        this.auth = authManager;
        this.toast = toastManager;
        
        this.currentSection = 'home';
        this.sections = [];
        this.navLinks = document.querySelectorAll('.nav-link');
        this.sectionLoaders = {};
        this.dashboardContainers = new Map();
        
        // Properties to prevent redundant operations
        this.isLoadingSection = null;
        this.sectionDataLoaded = {};
        this.loadingDashboards = {};
        this.navigationInProgress = false;
        
        this.init();
    }
    
    init() {
        this.initNavigation();
        this.initDashboard();
        this.initDataLoaders();
        this.initFilters();
        this.initForms();
        this.setCurrentYear();
        this.fixButtonTypes();
        
        // Initial scan for sections
        this.refreshSections();
        
        // Make sure only home is visible at start
        this.showOnlySection('home');
        
        // Check for hash in URL and show that section
        this.handleInitialHash();
        
        if (typeof AOS !== 'undefined') {
            AOS.init({ duration: 1000, once: true, offset: 100 });
        }
        
        setTimeout(() => {
            const loadingScreen = document.getElementById('loading-screen');
            if (loadingScreen) {
                loadingScreen.style.display = 'none';
            }
        }, 1000);
    }
    
    // Helper method to hide all sections and show only one
    showOnlySection(sectionId) {
        // Get ALL sections
        const allSections = document.querySelectorAll('.content-section, .dashboard-section');
        
        // Hide EVERY section
        allSections.forEach(section => {
            section.classList.remove('active');
            console.log(`Hidden: ${section.id}`);
        });
        
        // Show the requested section
        const sectionToShow = document.getElementById(sectionId);
        if (sectionToShow) {
            sectionToShow.classList.add('active');
            this.currentSection = sectionId;
            console.log(`Showing: ${sectionId}`);
            
            // Update URL hash
            if (window.location.hash !== `#${sectionId}`) {
                window.location.hash = sectionId;
            }
            
            return true;
        }
        
        console.warn(`Section ${sectionId} not found`);
        return false;
    }
    
    // Refresh the list of sections
    refreshSections() {
        this.sections = document.querySelectorAll('.content-section, .dashboard-section');
        console.log(`Found ${this.sections.length} sections:`, 
            Array.from(this.sections).map(s => s.id).join(', '));
        return this.sections;
    }
    
    handleInitialHash() {
        const hash = window.location.hash.substring(1);
        if (hash && document.getElementById(hash)) {
            setTimeout(() => {
                this.showSection(hash);
                this.updateActiveNavLink(hash);
            }, 300);
        } else {
            // Ensure home is active
            this.showOnlySection('home');
            this.updateActiveNavLink('home');
        }
    }
    
    fixButtonTypes() {
        document.querySelectorAll('button[type="submit"]').forEach(btn => {
            if (!btn.id || (btn.id !== 'login-submit-btn' && btn.id !== 'register-submit-btn' && 
                btn.id !== 'forgot-password-submit-btn' && btn.id !== 'verify-otp-btn')) {
                btn.type = 'button';
            }
        });
    }
    
    initNavigation() {
        // Remove existing event listeners and add new ones
        this.navLinks.forEach(link => {
            const newLink = link.cloneNode(true);
            link.parentNode.replaceChild(newLink, link);
        });
        
        this.navLinks = document.querySelectorAll('.nav-link');
        
        this.navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const section = link.dataset.section;
                if (section && !this.navigationInProgress) {
                    this.navigationInProgress = true;
                    
                    // Show the section
                    this.showSection(section);
                    
                    // Update active states
                    this.navLinks.forEach(nl => nl.classList.remove('active'));
                    link.classList.add('active');
                    
                    this.navigationInProgress = false;
                    
                    // Close mobile menu if open
                    const navMenu = document.getElementById('nav-menu');
                    if (navMenu && navMenu.classList.contains('active')) {
                        this.toggleMobileMenu();
                    }
                }
            });
        });
        
        const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
        if (mobileMenuToggle) {
            const newToggle = mobileMenuToggle.cloneNode(true);
            mobileMenuToggle.parentNode.replaceChild(newToggle, mobileMenuToggle);
            
            newToggle.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleMobileMenu();
            });
        }
        
        // Handle browser back/forward buttons
        window.addEventListener('popstate', (e) => {
            const hash = window.location.hash.substring(1);
            if (hash && document.getElementById(hash)) {
                this.showSection(hash);
                this.updateActiveNavLink(hash);
            } else {
                this.showSection('home');
                this.updateActiveNavLink('home');
            }
        });
        
        window.addEventListener('scroll', () => this.handleScroll());
    }
    
    updateActiveNavLink(sectionId) {
        this.navLinks.forEach(link => {
            if (link.dataset.section === sectionId) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }
    
    toggleMobileMenu() {
        const navMenu = document.getElementById('nav-menu');
        const toggle = document.getElementById('mobile-menu-toggle');
        if (navMenu) navMenu.classList.toggle('active');
        if (toggle) toggle.classList.toggle('active');
    }
    
    handleScroll() {
        const navbar = document.getElementById('navbar');
        if (navbar) {
            if (window.scrollY > 100) {
                navbar.style.background = 'var(--bg-primary)';
                navbar.style.boxShadow = 'var(--shadow)';
            } else {
                navbar.style.background = 'transparent';
                navbar.style.boxShadow = 'none';
            }
        }
    }
    
    async showSection(sectionId) {
        // Prevent redundant calls
        if (this.isLoadingSection === sectionId) {
            return;
        }
        
        console.log(`showSection called for: ${sectionId}`);
        this.isLoadingSection = sectionId;
        
        // First, check if the section exists
        let section = document.getElementById(sectionId);
        
        // If it's a dashboard section that doesn't exist yet, load it
        if (!section && this.isDashboardSection(sectionId)) {
            console.log(`Loading dashboard: ${sectionId}`);
            const loaded = await this.loadDashboardSection(sectionId);
            if (loaded) {
                await new Promise(resolve => setTimeout(resolve, 200));
                section = document.getElementById(sectionId);
            }
        }
        
        if (section) {
            // Hide ALL sections first
            const allSections = document.querySelectorAll('.content-section, .dashboard-section');
            allSections.forEach(s => {
                s.classList.remove('active');
            });
            
            // Show the requested section
            section.classList.add('active');
            this.currentSection = sectionId;
            
            // Update URL hash
            if (window.location.hash !== `#${sectionId}`) {
                window.location.hash = sectionId;
            }
            
            // Refresh sections list
            this.refreshSections();
            
            // Load data if needed
            if (!this.sectionDataLoaded[sectionId]) {
                this.sectionDataLoaded[sectionId] = true;
                setTimeout(() => this.loadSectionData(sectionId), 100);
            }
            
            console.log(`✓ Now showing: ${sectionId}`);
        } else {
            console.error(`Cannot find section: ${sectionId}`);
            
            // Fallback to home
            if (sectionId !== 'home') {
                this.showSection('home');
                this.updateActiveNavLink('home');
            }
        }
        
        setTimeout(() => {
            this.isLoadingSection = null;
        }, 500);
    }
    
    isDashboardSection(sectionId) {
        const dashboardSections = [
            'student-dashboard', 'student-profile', 'student-edit-profile', 'student-projects', 'student-events',
            'faculty-dashboard', 'faculty-profile', 'faculty-edit-profile', 'faculty-students', 'faculty-courses', 'faculty-projects',
            'admin-dashboard', 'admin-users', 'admin-faculty', 'admin-programs', 'admin-projects', 'admin-events',
            'admin-messages', 'admin-analytics', 'admin-settings', 'admin-toppers'
        ];
        return dashboardSections.includes(sectionId);
    }
    
    async loadDashboardSection(sectionId) {
        if (this.loadingDashboards[sectionId]) {
            return this.loadingDashboards[sectionId];
        }
        
        try {
            if (window.loadDashboardComponent) {
                this.loadingDashboards[sectionId] = window.loadDashboardComponent(sectionId);
                const loaded = await this.loadingDashboards[sectionId];
                
                if (loaded) {
                    await new Promise(resolve => setTimeout(resolve, 200));
                    this.refreshSections();
                    return true;
                }
            }
            return false;
        } catch (error) {
            console.error(`Error loading dashboard ${sectionId}:`, error);
            return false;
        } finally {
            delete this.loadingDashboards[sectionId];
        }
    }
    
    initDashboard() {
        // Handle sidebar navigation
        document.querySelectorAll('.sidebar-menu a').forEach(link => {
            const newLink = link.cloneNode(true);
            link.parentNode.replaceChild(newLink, link);
        });
        
        document.querySelectorAll('.sidebar-menu a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const section = link.dataset.section;
                if (section && !this.navigationInProgress) {
                    this.navigationInProgress = true;
                    
                    document.querySelectorAll('.sidebar-menu a').forEach(a => a.classList.remove('active'));
                    link.classList.add('active');
                    
                    this.showSection(section);
                    
                    setTimeout(() => {
                        this.navigationInProgress = false;
                    }, 500);
                }
            });
        });
        
        document.querySelectorAll('.dashboard-sidebar').forEach(sidebar => {
            sidebar.addEventListener('click', (e) => {
                if (window.innerWidth <= 1200) {
                    sidebar.classList.toggle('active');
                }
            });
        });
    }
    
    initDataLoaders() {
        // Load initial data
        this.loadStats();
        this.loadAboutData();
        this.loadPrograms();
        this.loadContactInfo();
        
        // Define section loaders
        this.sectionLoaders = {
            'faculty': () => this.loadFacultyData(),
            'projects': () => this.loadProjectsData(),
            'events': () => this.loadEventsData(),
            'toppers': () => this.loadToppersData(),
            
            // Student dashboard loaders
            'student-dashboard': () => this.loadStudentDashboard(),
            'student-profile': () => this.loadStudentProfile(),
            
            // Faculty dashboard loaders
            'faculty-dashboard': () => this.loadFacultyDashboard(),
            'faculty-profile': () => this.loadFacultyProfile(),
            
            // Admin dashboard loaders
            'admin-dashboard': () => this.loadAdminDashboard(),
            'admin-users': () => this.loadAdminUsers(),
            'admin-faculty': () => this.loadAdminFaculty(),
            'admin-programs': () => this.loadAdminPrograms(),
            'admin-projects': () => this.loadAdminProjects(),
            'admin-events': () => this.loadAdminEvents(),
            'admin-messages': () => this.loadAdminMessages(),
            'admin-settings': () => this.loadAdminSettings()
        };
    }
    
    loadSectionData(sectionId) {
        const loader = this.sectionLoaders[sectionId];
        if (loader) {
            console.log(`Loading data for: ${sectionId}`);
            loader();
        }
    }
    
    async loadStats() {
        try {
            const data = await this.api.getStats();
            this.updateStats(data);
            this.animateCounters();
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }
    
    updateStats(stats) {
        const counters = [
            { id: 'count-students', value: stats.students || 0 },
            { id: 'count-faculty', value: stats.faculty || 0 },
            { id: 'count-projects', value: stats.projects || 0 },
            { id: 'count-placement', value: stats.placement || 0 }
        ];
        
        counters.forEach(counter => {
            const element = document.getElementById(counter.id);
            if (element) {
                element.setAttribute('data-count', counter.value);
            }
        });
    }
    
    animateCounters() {
        const counters = document.querySelectorAll('.stat-number');
        let animated = false;
        
        const animate = () => {
            if (animated) return;
            
            counters.forEach(counter => {
                const target = parseInt(counter.getAttribute('data-count') || '0');
                const duration = 2000;
                const step = target / (duration / 16);
                let current = 0;
                
                const update = () => {
                    current += step;
                    if (current < target) {
                        counter.textContent = Math.ceil(current);
                        requestAnimationFrame(update);
                    } else {
                        counter.textContent = target;
                    }
                };
                
                update();
            });
            
            animated = true;
        };
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    animate();
                }
            });
        }, { threshold: 0.5 });
        
        const statsSection = document.querySelector('.hero-stats');
        if (statsSection) observer.observe(statsSection);
    }
    
    async loadAboutData() {
        try {
            const data = await this.api.getAbout();
            
            const universityInfo = document.getElementById('university-info');
            const departmentInfo = document.getElementById('department-info');
            const visionInfo = document.getElementById('vision-info');
            const missionInfo = document.getElementById('mission-info');
            const heroDescription = document.getElementById('hero-description');
            const footerDescription = document.getElementById('footer-description');
            
            if (universityInfo) universityInfo.textContent = data.university || 'University of Technology & Sciences';
            if (departmentInfo) departmentInfo.textContent = data.department || 'Department of Computer Science & Engineering';
            if (visionInfo) visionInfo.textContent = data.vision || 'To be a center of excellence in Computer Science education and research.';
            if (missionInfo) missionInfo.textContent = data.mission || 'To provide quality education in Computer Science, foster innovation through research.';
            if (heroDescription) heroDescription.textContent = data.description || 'Empowering students with cutting-edge technology education and research opportunities in Data Science and MCA programs.';
            if (footerDescription) footerDescription.textContent = data.description || 'Empowering students with cutting-edge technology education and research opportunities.';
            
        } catch (error) {
            console.error('Error loading about data:', error);
        }
    }
    
    async loadPrograms() {
        try {
            const data = await this.api.getPrograms();
            
            if (data.length > 0) {
                const programsGrid = document.getElementById('programs-grid');
                const footerPrograms = document.getElementById('footer-programs');
                
                if (programsGrid) {
                    programsGrid.innerHTML = data.map(program => `
                        <div class="program-card" data-aos="fade-up">
                            <div class="program-header">
                                <i class="fas ${program.icon || 'fa-laptop-code'}"></i>
                                <h4>${program.name}</h4>
                            </div>
                            <div class="program-details">
                                <p>${program.description}</p>
                                <ul>
                                    ${program.highlights ? program.highlights.map(h => `<li>${h}</li>`).join('') : ''}
                                </ul>
                                <div class="program-stats">
                                    <span><i class="fas fa-clock"></i> ${program.duration || '4 Years'}</span>
                                    <span><i class="fas fa-users"></i> ${program.seats || 60} Seats</span>
                                </div>
                            </div>
                        </div>
                    `).join('');
                }
                
                if (footerPrograms) {
                    footerPrograms.innerHTML = data.map(program => `
                        <li><a href="#about" data-section="about">${program.name}</a></li>
                    `).join('');
                }
            }
        } catch (error) {
            console.error('Error loading programs:', error);
        }
    }
    
    async loadFacultyData() {
        try {
            const data = await this.api.getFaculty();
            
            if (data.length > 0) {
                const facultyGrid = document.getElementById('faculty-grid');
                
                if (facultyGrid) {
                    facultyGrid.innerHTML = data.map(member => `
                        <div class="faculty-card" data-aos="fade-up">
                            <img src="${member.image || this.getAvatarUrl(member.name)}" alt="${member.name}" class="faculty-image">
                            <div class="faculty-info">
                                <h3 class="faculty-name">${member.name}</h3>
                                <p class="faculty-designation">${member.designation}</p>
                                <p class="faculty-qualification">${member.qualification}</p>
                                <div class="faculty-expertise">
                                    ${member.expertise ? member.expertise.map(exp => `<span class="expertise-tag">${exp}</span>`).join('') : ''}
                                </div>
                                <div class="faculty-social">
                                    ${member.linkedin ? `<a href="${member.linkedin}" target="_blank"><i class="fab fa-linkedin"></i></a>` : ''}
                                    ${member.email ? `<a href="mailto:${member.email}"><i class="fas fa-envelope"></i></a>` : ''}
                                </div>
                            </div>
                        </div>
                    `).join('');
                }
            }
        } catch (error) {
            console.error('Error loading faculty:', error);
        }
    }
    
    getAvatarUrl(name) {
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=4361ee&color=fff`;
    }
    
    async loadProjectsData() {
        try {
            const data = await this.api.getProjects();
            
            if (data.length > 0) {
                const projectsGrid = document.getElementById('projects-grid');
                
                if (projectsGrid) {
                    projectsGrid.innerHTML = data.map(project => `
                        <div class="project-card" data-category="${project.category}" data-aos="fade-up">
                            <img src="${project.image || 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400&h=200&fit=crop'}" alt="${project.title}" class="project-image">
                            <div class="project-info">
                                <h3 class="project-title">${project.title}</h3>
                                <p class="project-category">${project.category}</p>
                                <p class="project-description">${project.description.substring(0, 100)}${project.description.length > 100 ? '...' : ''}</p>
                                <div class="project-tech">
                                    ${project.technologies ? project.technologies.map(tech => `<span class="tech-tag">${tech}</span>`).join('') : ''}
                                </div>
                                <div class="project-links">
                                    ${project.github ? `<a href="${project.github}" class="project-link" target="_blank"><i class="fab fa-github"></i> View Code</a>` : ''}
                                    ${project.demo ? `<a href="${project.demo}" class="project-link" target="_blank"><i class="fas fa-external-link-alt"></i> Live Demo</a>` : ''}
                                </div>
                            </div>
                        </div>
                    `).join('');
                }
            }
        } catch (error) {
            console.error('Error loading projects:', error);
        }
    }
    
    async loadEventsData() {
        try {
            const data = await this.api.getEvents();
            
            if (data.length > 0) {
                const now = new Date();
                const upcoming = data.filter(event => new Date(event.date) >= now);
                const past = data.filter(event => new Date(event.date) < now);
                const cultural = data.filter(event => event.type === 'cultural');
                
                const eventsContent = document.getElementById('events-content');
                if (eventsContent) {
                    eventsContent.innerHTML = `
                        <div class="events-list" data-tab="upcoming" style="display: block;">
                            ${upcoming.map(event => this.createEventCard(event)).join('')}
                        </div>
                        <div class="events-list" data-tab="past" style="display: none;">
                            ${past.map(event => this.createEventCard(event)).join('')}
                        </div>
                        <div class="events-list" data-tab="cultural" style="display: none;">
                            ${cultural.map(event => this.createEventCard(event)).join('')}
                        </div>
                    `;
                }
            }
        } catch (error) {
            console.error('Error loading events:', error);
        }
    }
    
    createEventCard(event) {
        const date = new Date(event.date);
        const day = date.getDate();
        const month = date.toLocaleString('default', { month: 'short' });
        
        return `
            <div class="event-card" data-aos="fade-up">
                <div class="event-date">
                    <div class="event-day">${day}</div>
                    <div class="event-month">${month}</div>
                </div>
                <div class="event-details">
                    <h4>${event.title}</h4>
                    <div class="event-time">
                        <i class="fas fa-clock"></i> ${event.time}
                    </div>
                    <div class="event-location">
                        <i class="fas fa-map-marker-alt"></i> ${event.location}
                    </div>
                    <p class="event-description">${event.description.substring(0, 100)}${event.description.length > 100 ? '...' : ''}</p>
                    <div class="event-actions">
                        <button class="btn btn-outline" onclick="window.app.registerForEvent('${event.id}')">Register</button>
                        ${event.link ? `<a href="${event.link}" class="btn btn-primary" target="_blank">Learn More</a>` : ''}
                    </div>
                </div>
            </div>
        `;
    }
    
    async loadToppersData() {
        try {
            const data = await this.api.getToppers();
            
            if (data.length > 0) {
                const years = [...new Set(data.map(t => t.year))].sort().reverse();
                const yearFilter = document.getElementById('academic-year-filter');
                if (yearFilter) {
                    yearFilter.innerHTML = '<option value="">Select Academic Year</option>' +
                        years.map(year => `<option value="${year}">${year}</option>`).join('');
                }
                
                this.renderToppers(data);
            }
        } catch (error) {
            console.error('Error loading toppers:', error);
        }
    }
    
    renderToppers(toppers) {
        const toppersGrid = document.getElementById('toppers-grid');
        
        if (toppersGrid) {
            toppersGrid.innerHTML = toppers.map((topper, index) => `
                <div class="topper-card" data-year="${topper.year}" data-course="${topper.course}" data-aos="fade-up">
                    <div class="topper-badge">${index + 1}</div>
                    <img src="${topper.image || this.getAvatarUrl(topper.name)}" alt="${topper.name}" class="topper-image">
                    <div class="topper-info">
                        <h3 class="topper-name">${topper.name}</h3>
                        <p class="topper-course">${topper.course}</p>
                        <div class="topper-cgpa">${topper.cgpa} CGPA</div>
                        <p class="topper-achievements">${topper.achievements || 'Outstanding academic performance'}</p>
                        <div class="topper-social">
                            ${topper.linkedin ? `<a href="${topper.linkedin}" target="_blank"><i class="fab fa-linkedin"></i></a>` : ''}
                            ${topper.github ? `<a href="${topper.github}" target="_blank"><i class="fab fa-github"></i></a>` : ''}
                            ${topper.email ? `<a href="mailto:${topper.email}"><i class="fas fa-envelope"></i></a>` : ''}
                        </div>
                    </div>
                </div>
            `).join('');
        }
    }
    
    async loadContactInfo() {
        try {
            const data = await this.api.getContact();
            
            const contactInfo = document.getElementById('contact-info');
            if (contactInfo) {
                contactInfo.innerHTML = `
                    <div class="contact-card" data-aos="fade-up">
                        <div class="contact-icon">
                            <i class="fas fa-map-marker-alt"></i>
                        </div>
                        <h4>Visit Us</h4>
                        <p>${data.address || 'University Campus, Tech City'}</p>
                    </div>
                    <div class="contact-card" data-aos="fade-up" data-aos-delay="100">
                        <div class="contact-icon">
                            <i class="fas fa-phone"></i>
                        </div>
                        <h4>Call Us</h4>
                        <p>${data.phone || '+91-123-456-7890'}</p>
                    </div>
                    <div class="contact-card" data-aos="fade-up" data-aos-delay="200">
                        <div class="contact-icon">
                            <i class="fas fa-envelope"></i>
                        </div>
                        <h4>Email Us</h4>
                        <p>${data.email || 'cse.department@university.edu'}</p>
                    </div>
                    <div class="contact-card" data-aos="fade-up" data-aos-delay="300">
                        <div class="contact-icon">
                            <i class="fas fa-clock"></i>
                        </div>
                        <h4>Office Hours</h4>
                        <p>${data.hours || 'Mon-Fri: 9:00 AM - 5:00 PM'}</p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error loading contact info:', error);
        }
    }
    
    async loadStudentDashboard() {
        if (!this.auth.isAuthenticated || this.auth.currentUser.role !== 'student') {
            console.log('Not authorized to view student dashboard');
            return;
        }
        
        if (this.loadingStudentDashboard) return;
        this.loadingStudentDashboard = true;
        
        try {
            console.log('Loading student dashboard data...');
            const data = await this.api.getStudentDashboard();
            
            const studentWelcomeName = document.getElementById('student-welcome-name');
            if (studentWelcomeName) {
                studentWelcomeName.textContent = this.auth.currentUser.fullName;
            }
            
            const statsContainer = document.getElementById('student-dashboard-stats');
            if (statsContainer) {
                statsContainer.innerHTML = `
                    <div class="dashboard-stat-card">
                        <div class="dashboard-stat-number">${data.cgpa || 'N/A'}</div>
                        <div class="dashboard-stat-label">CGPA</div>
                    </div>
                    <div class="dashboard-stat-card">
                        <div class="dashboard-stat-number">${data.attendance || '0'}%</div>
                        <div class="dashboard-stat-label">Attendance</div>
                    </div>
                    <div class="dashboard-stat-card">
                        <div class="dashboard-stat-number">${data.projects || '0'}</div>
                        <div class="dashboard-stat-label">Projects</div>
                    </div>
                    <div class="dashboard-stat-card">
                        <div class="dashboard-stat-number">${data.events || '0'}</div>
                        <div class="dashboard-stat-label">Events</div>
                    </div>
                `;
            }
            
            const content = document.getElementById('student-dashboard-content');
            if (content) {
                content.innerHTML = this.renderStudentDashboardContent(data);
            }
        } catch (error) {
            console.error('Error loading student dashboard:', error);
            this.toast.error('Failed to load student dashboard');
        } finally {
            this.loadingStudentDashboard = false;
        }
    }
    
    renderStudentDashboardContent(data) {
        return `
            <h2>Recent Activities</h2>
            <div class="activity-list" style="margin-bottom: 2rem;">
                ${data.activities && data.activities.length > 0 ? 
                    data.activities.map(activity => `
                        <div class="activity-item" style="display: flex; gap: 1rem; padding: 1rem; background: var(--bg-primary); border-radius: var(--border-radius); margin-bottom: 1rem;">
                            <div class="activity-icon" style="font-size: 1.5rem; color: var(--primary-color);">
                                <i class="fas ${activity.icon || 'fa-bell'}"></i>
                            </div>
                            <div class="activity-content">
                                <h4 style="margin: 0 0 0.5rem 0;">${activity.title}</h4>
                                <p style="margin: 0 0 0.5rem 0; color: var(--text-secondary);">${activity.description}</p>
                                <small style="color: var(--text-muted);">${activity.date}</small>
                            </div>
                        </div>
                    `).join('') :
                    '<p>No recent activities</p>'
                }
            </div>
            
            <h2 style="margin-top: 2rem;">Upcoming Events</h2>
            <div class="event-list">
                ${data.upcomingEvents && data.upcomingEvents.length > 0 ?
                    data.upcomingEvents.map(event => `
                        <div class="event-item" style="display: flex; align-items: center; gap: 1rem; padding: 1rem; background: var(--bg-primary); border-radius: var(--border-radius); margin-bottom: 1rem;">
                            <div class="event-date" style="text-align: center; min-width: 60px;">
                                <span class="event-day" style="display: block; font-size: 1.5rem; font-weight: bold; color: var(--primary-color);">${new Date(event.date).getDate()}</span>
                                <span class="event-month" style="display: block; font-size: 0.9rem; color: var(--text-muted);">${new Date(event.date).toLocaleString('default', { month: 'short' })}</span>
                            </div>
                            <div class="event-details" style="flex: 1;">
                                <h4 style="margin: 0 0 0.25rem 0;">${event.title}</h4>
                                <p style="margin: 0; color: var(--text-secondary);">${event.location} • ${event.time}</p>
                            </div>
                            <button class="btn btn-outline" onclick="window.app.registerForEvent('${event.id}')">Register</button>
                        </div>
                    `).join('') :
                    '<p>No upcoming events</p>'
                }
            </div>
        `;
    }
    
    async loadStudentProfile() {
        if (!this.auth.isAuthenticated || this.auth.currentUser.role !== 'student') return;
        
        if (this.loadingStudentProfile) return;
        this.loadingStudentProfile = true;
        
        try {
            const data = await this.api.getStudentProfile();
            
            const content = document.getElementById('student-profile-content');
            if (content) {
                content.innerHTML = this.renderStudentProfile(data);
            }
            
            this.populateStudentEditForm(data);
        } catch (error) {
            console.error('Error loading student profile:', error);
        } finally {
            this.loadingStudentProfile = false;
        }
    }
    
    renderStudentProfile(data) {
        return `
            <div class="profile-header">
                <img src="${data.avatar || this.getAvatarUrl(data.fullName)}" alt="Profile" class="profile-avatar">
                <div class="profile-info">
                    <h2>${data.fullName}</h2>
                    <span class="profile-badge">${data.course || 'Student'}</span>
                    <p><i class="fas fa-envelope"></i> ${data.email}</p>
                    <p><i class="fas fa-id-card"></i> ${data.registrationNo || 'N/A'}</p>
                </div>
            </div>
            
            <div class="profile-details">
                <div class="detail-group">
                    <h4>Personal Information</h4>
                    <div class="detail-item">
                        <span class="detail-label">Date of Birth</span>
                        <span class="detail-value">${data.dob || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Gender</span>
                        <span class="detail-value">${data.gender || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Phone</span>
                        <span class="detail-value">${data.phone || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Address</span>
                        <span class="detail-value">${data.address || 'N/A'}</span>
                    </div>
                </div>
                
                <div class="detail-group">
                    <h4>Academic Information</h4>
                    <div class="detail-item">
                        <span class="detail-label">Year</span>
                        <span class="detail-value">${data.year || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Semester</span>
                        <span class="detail-value">${data.semester || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">CGPA</span>
                        <span class="detail-value">${data.cgpa || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Attendance</span>
                        <span class="detail-value">${data.attendance || '0'}%</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    populateStudentEditForm(data) {
        const editFullname = document.getElementById('edit-fullname');
        if (editFullname && data.fullName) editFullname.value = data.fullName;
        
        const editEmail = document.getElementById('edit-email');
        if (editEmail && data.email) editEmail.value = data.email;
        
        const editPhone = document.getElementById('edit-phone');
        if (editPhone && data.phone) editPhone.value = data.phone;
        
        const editDob = document.getElementById('edit-dob');
        if (editDob && data.dob) editDob.value = data.dob;
        
        const editGender = document.getElementById('edit-gender');
        if (editGender && data.gender) editGender.value = data.gender;
        
        const editAddress = document.getElementById('edit-address');
        if (editAddress && data.address) editAddress.value = data.address;
        
        const editRegistration = document.getElementById('edit-registration');
        if (editRegistration && data.registrationNo) editRegistration.value = data.registrationNo;
        
        const editCourse = document.getElementById('edit-course');
        if (editCourse && data.course) editCourse.value = data.course;
        
        const editYear = document.getElementById('edit-year');
        if (editYear && data.year) editYear.value = data.year;
        
        const editSemester = document.getElementById('edit-semester');
        if (editSemester && data.semester) editSemester.value = data.semester;
    }
    
    async loadFacultyDashboard() {
        if (!this.auth.isAuthenticated || this.auth.currentUser.role !== 'teacher') return;
        
        if (this.loadingFacultyDashboard) return;
        this.loadingFacultyDashboard = true;
        
        try {
            const data = await this.api.getFacultyDashboard();
            
            const facultyWelcomeName = document.getElementById('faculty-welcome-name');
            if (facultyWelcomeName) {
                facultyWelcomeName.textContent = this.auth.currentUser.fullName;
            }
            
            const statsContainer = document.getElementById('faculty-dashboard-stats');
            if (statsContainer) {
                statsContainer.innerHTML = `
                    <div class="dashboard-stat-card">
                        <div class="dashboard-stat-number">${data.courses || '0'}</div>
                        <div class="dashboard-stat-label">Courses</div>
                    </div>
                    <div class="dashboard-stat-card">
                        <div class="dashboard-stat-number">${data.students || '0'}</div>
                        <div class="dashboard-stat-label">Students</div>
                    </div>
                    <div class="dashboard-stat-card">
                        <div class="dashboard-stat-number">${data.projects || '0'}</div>
                        <div class="dashboard-stat-label">Projects</div>
                    </div>
                    <div class="dashboard-stat-card">
                        <div class="dashboard-stat-number">${data.publications || '0'}</div>
                        <div class="dashboard-stat-label">Publications</div>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error loading faculty dashboard:', error);
        } finally {
            this.loadingFacultyDashboard = false;
        }
    }
    
    async loadFacultyProfile() {
        if (!this.auth.isAuthenticated || this.auth.currentUser.role !== 'teacher') return;
        
        if (this.loadingFacultyProfile) return;
        this.loadingFacultyProfile = true;
        
        try {
            const data = await this.api.getFacultyProfile();
            
            const content = document.getElementById('faculty-profile-content');
            if (content) {
                content.innerHTML = this.renderFacultyProfile(data);
            }
            
            this.populateFacultyEditForm(data);
        } catch (error) {
            console.error('Error loading faculty profile:', error);
        } finally {
            this.loadingFacultyProfile = false;
        }
    }
    
    renderFacultyProfile(data) {
        return `
            <div class="profile-header">
                <img src="${data.avatar || this.getAvatarUrl(data.fullName)}" alt="Profile" class="profile-avatar">
                <div class="profile-info">
                    <h2>${data.fullName}</h2>
                    <span class="profile-badge">${data.designation || 'Faculty'}</span>
                    <p><i class="fas fa-envelope"></i> ${data.email}</p>
                    <p><i class="fas fa-graduation-cap"></i> ${data.qualification || 'N/A'}</p>
                </div>
            </div>
            
            <div class="profile-details">
                <div class="detail-group">
                    <h4>Professional Information</h4>
                    <div class="detail-item">
                        <span class="detail-label">Experience</span>
                        <span class="detail-value">${data.experience || '0'} years</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Specialization</span>
                        <span class="detail-value">${data.specialization || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Research Interests</span>
                        <span class="detail-value">${data.researchInterests || 'N/A'}</span>
                    </div>
                </div>
                
                <div class="detail-group">
                    <h4>Contact Information</h4>
                    <div class="detail-item">
                        <span class="detail-label">Phone</span>
                        <span class="detail-value">${data.phone || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Office</span>
                        <span class="detail-value">${data.office || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Office Hours</span>
                        <span class="detail-value">${data.officeHours || 'N/A'}</span>
                    </div>
                </div>
            </div>
            
            ${data.bio ? `
                <div class="detail-group" style="grid-column: 1 / -1;">
                    <h4>Bio</h4>
                    <p>${data.bio}</p>
                </div>
            ` : ''}
        `;
    }
    
    populateFacultyEditForm(data) {
        const editFacultyName = document.getElementById('edit-faculty-name');
        if (editFacultyName && data.fullName) editFacultyName.value = data.fullName;
        
        const editFacultyEmail = document.getElementById('edit-faculty-email');
        if (editFacultyEmail && data.email) editFacultyEmail.value = data.email;
        
        const editFacultyPhone = document.getElementById('edit-faculty-phone');
        if (editFacultyPhone && data.phone) editFacultyPhone.value = data.phone;
        
        const editFacultyDob = document.getElementById('edit-faculty-dob');
        if (editFacultyDob && data.dob) editFacultyDob.value = data.dob;
        
        const editFacultyDesignation = document.getElementById('edit-faculty-designation');
        if (editFacultyDesignation && data.designation) editFacultyDesignation.value = data.designation;
        
        const editFacultyQualification = document.getElementById('edit-faculty-qualification');
        if (editFacultyQualification && data.qualification) editFacultyQualification.value = data.qualification;
        
        const editFacultyExperience = document.getElementById('edit-faculty-experience');
        if (editFacultyExperience && data.experience) editFacultyExperience.value = data.experience;
        
        const editFacultySpecialization = document.getElementById('edit-faculty-specialization');
        if (editFacultySpecialization && data.specialization) editFacultySpecialization.value = data.specialization;
        
        const editFacultyResearch = document.getElementById('edit-faculty-research');
        if (editFacultyResearch && data.researchInterests) editFacultyResearch.value = data.researchInterests;
        
        const editFacultyBio = document.getElementById('edit-faculty-bio');
        if (editFacultyBio && data.bio) editFacultyBio.value = data.bio;
    }
    
    async loadAdminDashboard() {
        if (!this.auth.isAuthenticated || this.auth.currentUser.role !== 'admin') return;
        
        if (this.loadingAdminDashboard) return;
        this.loadingAdminDashboard = true;
        
        try {
            const data = await this.api.getAdminDashboard();
            
            const adminWelcomeName = document.getElementById('admin-welcome-name');
            if (adminWelcomeName) {
                adminWelcomeName.textContent = this.auth.currentUser.fullName;
            }
            
            const statsContainer = document.getElementById('admin-dashboard-stats');
            if (statsContainer) {
                statsContainer.innerHTML = `
                    <div class="dashboard-stat-card">
                        <div class="dashboard-stat-number">${data.stats?.totalStudents || 0}</div>
                        <div class="dashboard-stat-label">Total Students</div>
                    </div>
                    <div class="dashboard-stat-card">
                        <div class="dashboard-stat-number">${data.stats?.totalTeachers || 0}</div>
                        <div class="dashboard-stat-label">Total Teachers</div>
                    </div>
                    <div class="dashboard-stat-card">
                        <div class="dashboard-stat-number">${data.stats?.totalProjects || 0}</div>
                        <div class="dashboard-stat-label">Total Projects</div>
                    </div>
                    <div class="dashboard-stat-card">
                        <div class="dashboard-stat-number">${data.stats?.unreadMessages || 0}</div>
                        <div class="dashboard-stat-label">Unread Messages</div>
                    </div>
                `;
            }
            
            const content = document.getElementById('admin-dashboard-content');
            if (content) {
                content.innerHTML = this.renderAdminDashboardContent(data);
                
                if (data.analytics && typeof Chart !== 'undefined') {
                    setTimeout(() => this.initAnalyticsChart(data.analytics), 100);
                }
            }
        } catch (error) {
            console.error('Error loading admin dashboard:', error);
        } finally {
            this.loadingAdminDashboard = false;
        }
    }
    
    renderAdminDashboardContent(data) {
        return `
            <div class="admin-card-grid">
                <div class="admin-card">
                    <i class="fas fa-user-graduate"></i>
                    <div class="number">${data.summary?.totalUsers || 0}</div>
                    <div class="label">Total Users</div>
                </div>
                <div class="admin-card">
                    <i class="fas fa-user-check"></i>
                    <div class="number">${data.summary?.verifiedUsers || 0}</div>
                    <div class="label">Verified Users</div>
                </div>
                <div class="admin-card">
                    <i class="fas fa-user-clock"></i>
                    <div class="number">${data.summary?.activeUsers || 0}</div>
                    <div class="label">Active Users</div>
                </div>
                <div class="admin-card">
                    <i class="fas fa-eye"></i>
                    <div class="number">${data.summary?.todayVisits || 0}</div>
                    <div class="label">Today's Visits</div>
                </div>
            </div>
            
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Recent Students</h3>
                    <a href="#admin-users" data-section="admin-users" class="btn btn-outline">View All</a>
                </div>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Registration No</th>
                            <th>Course</th>
                            <th>Joined</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.recentStudents?.map(student => `
                            <tr>
                                <td>${student.name}</td>
                                <td>${student.registrationNo}</td>
                                <td>${student.course}</td>
                                <td>${student.joined}</td>
                            </tr>
                        `).join('') || '<tr><td colspan="4">No data available</td></tr>'}
                    </tbody>
                </table>
            </div>
            
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Analytics Chart</h3>
                </div>
                <div class="chart-container">
                    <canvas id="analytics-chart"></canvas>
                </div>
            </div>
        `;
    }
    
    initAnalyticsChart(analytics) {
        const canvas = document.getElementById('analytics-chart');
        if (!canvas) return;
        
        const existingChart = Chart.getChart(canvas);
        if (existingChart) {
            existingChart.destroy();
        }
        
        const ctx = canvas.getContext('2d');
        const labels = analytics.dates || [];
        const studentData = analytics.students || [];
        const teacherData = analytics.teachers || [];
        const projectData = analytics.projects || [];
        
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Students',
                        data: studentData,
                        borderColor: '#4361ee',
                        backgroundColor: 'rgba(67, 97, 238, 0.1)',
                        tension: 0.4
                    },
                    {
                        label: 'Teachers',
                        data: teacherData,
                        borderColor: '#f72585',
                        backgroundColor: 'rgba(247, 37, 133, 0.1)',
                        tension: 0.4
                    },
                    {
                        label: 'Projects',
                        data: projectData,
                        borderColor: '#4cc9f0',
                        backgroundColor: 'rgba(76, 201, 240, 0.1)',
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
    
    async loadAdminUsers() {
        if (!this.auth.isAuthenticated || this.auth.currentUser.role !== 'admin') return;
        
        if (this.loadingAdminUsers) return;
        this.loadingAdminUsers = true;
        
        try {
            const data = await this.api.getAdminUsers();
            
            const content = document.getElementById('admin-users-content');
            if (content) {
                content.innerHTML = this.renderAdminUsers(data);
            }
        } catch (error) {
            console.error('Error loading admin users:', error);
        } finally {
            this.loadingAdminUsers = false;
        }
    }
    
    renderAdminUsers(data) {
        return `
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">User Management</h3>
                    <button class="btn btn-primary" onclick="window.app.addUser()">Add User</button>
                </div>
                <div class="search-filter-bar">
                    <div class="search-box">
                        <input type="text" id="user-search" placeholder="Search users...">
                    </div>
                    <div class="filter-select">
                        <select id="role-filter">
                            <option value="">All Roles</option>
                            <option value="student">Student</option>
                            <option value="teacher">Teacher</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>
                </div>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Status</th>
                            <th>Joined</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.users?.map(user => `
                            <tr>
                                <td>
                                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                                        <img src="${user.avatar || this.getAvatarUrl(user.fullName)}" 
                                             alt="${user.fullName}" style="width: 32px; height: 32px; border-radius: 50%;">
                                        ${user.fullName}
                                    </div>
                                </td>
                                <td>${user.email}</td>
                                <td><span class="badge badge-info">${user.role}</span></td>
                                <td>
                                    ${user.isVerified ? 
                                        '<span class="badge badge-success">Verified</span>' : 
                                        '<span class="badge badge-warning">Pending</span>'}
                                    ${user.isActive ? 
                                        '<span class="badge badge-success">Active</span>' : 
                                        '<span class="badge badge-danger">Inactive</span>'}
                                </td>
                                <td>${new Date(user.createdAt).toLocaleDateString()}</td>
                                <td class="table-actions">
                                    <button class="btn btn-outline" onclick="window.app.editUser('${user.id}')">Edit</button>
                                    <button class="btn btn-danger" onclick="window.app.deleteUser('${user.id}')">Delete</button>
                                </td>
                            </tr>
                        `).join('') || '<tr><td colspan="6">No users found</td></tr>'}
                    </tbody>
                </table>
            </div>
        `;
    }
    
    async loadAdminFaculty() {
        if (!this.auth.isAuthenticated || this.auth.currentUser.role !== 'admin') return;
        
        if (this.loadingAdminFaculty) return;
        this.loadingAdminFaculty = true;
        
        try {
            const data = await this.api.getFaculty();
            
            const content = document.getElementById('admin-faculty-content');
            if (content) {
                content.innerHTML = this.renderAdminFaculty(data);
            }
        } catch (error) {
            console.error('Error loading admin faculty:', error);
        } finally {
            this.loadingAdminFaculty = false;
        }
    }
    
    renderAdminFaculty(data) {
        return `
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Faculty Management</h3>
                    <button class="btn btn-primary" onclick="window.app.addFaculty()">Add Faculty</button>
                </div>
                <div class="faculty-grid">
                    ${data.map(faculty => `
                        <div class="faculty-card">
                            <img src="${faculty.image || this.getAvatarUrl(faculty.name)}" alt="${faculty.name}" class="faculty-image">
                            <div class="faculty-info">
                                <h3 class="faculty-name">${faculty.name}</h3>
                                <p class="faculty-designation">${faculty.designation}</p>
                                <p class="faculty-qualification">${faculty.qualification}</p>
                                <div class="faculty-expertise">
                                    ${faculty.expertise ? faculty.expertise.map(exp => `<span class="expertise-tag">${exp}</span>`).join('') : ''}
                                </div>
                                <div class="table-actions" style="margin-top: 1rem;">
                                    <button class="btn btn-outline" onclick="window.app.editFaculty('${faculty.id}')">Edit</button>
                                    <button class="btn btn-danger" onclick="window.app.deleteFaculty('${faculty.id}')">Delete</button>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    async loadAdminPrograms() {
        if (!this.auth.isAuthenticated || this.auth.currentUser.role !== 'admin') return;
        
        if (this.loadingAdminPrograms) return;
        this.loadingAdminPrograms = true;
        
        try {
            const data = await this.api.getPrograms();
            
            const content = document.getElementById('admin-programs-content');
            if (content) {
                content.innerHTML = this.renderAdminPrograms(data);
            }
        } catch (error) {
            console.error('Error loading admin programs:', error);
        } finally {
            this.loadingAdminPrograms = false;
        }
    }
    
    renderAdminPrograms(data) {
        return `
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Programs Management</h3>
                    <button class="btn btn-primary" onclick="window.app.addProgram()">Add Program</button>
                </div>
                <div class="programs-grid">
                    ${data.map(program => `
                        <div class="program-card">
                            <div class="program-header">
                                <i class="fas ${program.icon || 'fa-laptop-code'}"></i>
                                <h4>${program.name}</h4>
                            </div>
                            <div class="program-details">
                                <p>${program.description}</p>
                                <ul>
                                    ${program.highlights ? program.highlights.map(h => `<li>${h}</li>`).join('') : ''}
                                </ul>
                                <div class="program-stats">
                                    <span><i class="fas fa-clock"></i> ${program.duration || '4 Years'}</span>
                                    <span><i class="fas fa-users"></i> ${program.seats || 60} Seats</span>
                                    <span><i class="fas ${program.isActive ? 'fa-check text-success' : 'fa-times text-danger'}"></i></span>
                                </div>
                                <div class="table-actions" style="margin-top: 1rem;">
                                    <button class="btn btn-outline" onclick="window.app.editProgram('${program.id}')">Edit</button>
                                    <button class="btn btn-danger" onclick="window.app.deleteProgram('${program.id}')">Delete</button>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    async loadAdminProjects() {
        if (!this.auth.isAuthenticated || this.auth.currentUser.role !== 'admin') return;
        
        if (this.loadingAdminProjects) return;
        this.loadingAdminProjects = true;
        
        try {
            const data = await this.api.getAdminProjects();
            
            const content = document.getElementById('admin-projects-content');
            if (content) {
                content.innerHTML = this.renderAdminProjects(data);
            }
        } catch (error) {
            console.error('Error loading admin projects:', error);
        } finally {
            this.loadingAdminProjects = false;
        }
    }
    
    renderAdminProjects(data) {
        return `
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Projects Management</h3>
                    <button class="btn btn-primary" onclick="window.app.addProject()">Add Project</button>
                </div>
                <div class="projects-grid">
                    ${data.map(project => `
                        <div class="project-card">
                            <img src="${project.image || 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400&h=200&fit=crop'}" alt="${project.title}" class="project-image">
                            <div class="project-info">
                                <h3 class="project-title">${project.title}</h3>
                                <p class="project-category">${project.category}</p>
                                <p class="project-description">${project.description.substring(0, 100)}${project.description.length > 100 ? '...' : ''}</p>
                                <div class="project-tech">
                                    ${project.technologies ? project.technologies.map(tech => `<span class="tech-tag">${tech}</span>`).join('') : ''}
                                </div>
                                <div class="table-actions" style="margin-top: 1rem;">
                                    <button class="btn btn-outline" onclick="window.app.editProject('${project.id}')">Edit</button>
                                    <button class="btn btn-danger" onclick="window.app.deleteProject('${project.id}')">Delete</button>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    async loadAdminEvents() {
        if (!this.auth.isAuthenticated || this.auth.currentUser.role !== 'admin') return;
        
        if (this.loadingAdminEvents) return;
        this.loadingAdminEvents = true;
        
        try {
            const data = await this.api.getAdminEvents();
            
            const content = document.getElementById('admin-events-content');
            if (content) {
                content.innerHTML = this.renderAdminEvents(data);
            }
        } catch (error) {
            console.error('Error loading admin events:', error);
        } finally {
            this.loadingAdminEvents = false;
        }
    }
    
    renderAdminEvents(data) {
        return `
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Events Management</h3>
                    <button class="btn btn-primary" onclick="window.app.addEvent()">Add Event</button>
                </div>
                <div class="events-list">
                    ${data.map(event => `
                        <div class="event-card">
                            <div class="event-date">
                                <div class="event-day">${new Date(event.date).getDate()}</div>
                                <div class="event-month">${new Date(event.date).toLocaleString('default', { month: 'short' })}</div>
                            </div>
                            <div class="event-details">
                                <h4>${event.title}</h4>
                                <div class="event-time">
                                    <i class="fas fa-clock"></i> ${event.time}
                                </div>
                                <div class="event-location">
                                    <i class="fas fa-map-marker-alt"></i> ${event.location}
                                </div>
                                <p class="event-description">${event.description.substring(0, 100)}${event.description.length > 100 ? '...' : ''}</p>
                                <div class="event-actions">
                                    <span class="badge ${event.isActive ? 'badge-success' : 'badge-danger'}">
                                        ${event.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                    <span class="badge badge-info">
                                        ${event.currentParticipants}/${event.maxParticipants || '∞'} Participants
                                    </span>
                                </div>
                                <div class="table-actions" style="margin-top: 1rem;">
                                    <button class="btn btn-outline" onclick="window.app.editEvent('${event.id}')">Edit</button>
                                    <button class="btn btn-danger" onclick="window.app.deleteEvent('${event.id}')">Delete</button>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    async loadAdminMessages() {
        if (!this.auth.isAuthenticated || this.auth.currentUser.role !== 'admin') return;
        
        if (this.loadingAdminMessages) return;
        this.loadingAdminMessages = true;
        
        try {
            const data = await this.api.getAdminMessages(true);
            
            const content = document.getElementById('admin-messages-content');
            if (content) {
                content.innerHTML = this.renderAdminMessages(data);
            }
        } catch (error) {
            console.error('Error loading admin messages:', error);
        } finally {
            this.loadingAdminMessages = false;
        }
    }
    
    renderAdminMessages(data) {
        return `
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Contact Messages</h3>
                    <span class="badge badge-danger">${data.unreadCount || 0} Unread</span>
                </div>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Subject</th>
                            <th>Status</th>
                            <th>Received</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.messages?.map(message => `
                            <tr style="${!message.isRead ? 'background: rgba(67, 97, 238, 0.1);' : ''}">
                                <td>${message.name}</td>
                                <td>${message.email}</td>
                                <td>${message.subject}</td>
                                <td>
                                    ${message.isRead ? 
                                        '<span class="badge badge-success">Read</span>' : 
                                        '<span class="badge badge-warning">Unread</span>'}
                                    ${message.replied ? 
                                        '<span class="badge badge-success">Replied</span>' : 
                                        '<span class="badge badge-warning">Pending</span>'}
                                </td>
                                <td>${new Date(message.createdAt).toLocaleDateString()}</td>
                                <td class="table-actions">
                                    <button class="btn btn-outline" onclick="window.app.viewMessage('${message.id}')">View</button>
                                    ${!message.replied ? 
                                        `<button class="btn btn-success" onclick="window.app.replyToMessage('${message.id}')">Reply</button>` : ''}
                                    ${!message.isRead ? 
                                        `<button class="btn btn-primary" onclick="window.app.markMessageRead('${message.id}')">Mark Read</button>` : ''}
                                </td>
                            </tr>
                        `).join('') || '<tr><td colspan="6">No messages found</td></tr>'}
                    </tbody>
                </table>
            </div>
        `;
    }
    
    async loadAdminSettings() {
        if (!this.auth.isAuthenticated || this.auth.currentUser.role !== 'admin') return;
        
        if (this.loadingAdminSettings) return;
        this.loadingAdminSettings = true;
        
        try {
            const data = await this.api.getDepartmentInfo();
            
            const adminUniversity = document.getElementById('admin-university');
            if (adminUniversity && data.university) adminUniversity.value = data.university;
            
            const adminDepartment = document.getElementById('admin-department');
            if (adminDepartment && data.department) adminDepartment.value = data.department;
            
            const adminAddress = document.getElementById('admin-address');
            if (adminAddress && data.address) adminAddress.value = data.address;
            
            const adminPhone = document.getElementById('admin-phone');
            if (adminPhone && data.phone) adminPhone.value = data.phone;
            
            const adminEmail = document.getElementById('admin-email');
            if (adminEmail && data.email) adminEmail.value = data.email;
            
            const adminOfficeHours = document.getElementById('admin-office-hours');
            if (adminOfficeHours && data.officeHours) adminOfficeHours.value = data.officeHours;
            
            const adminVision = document.getElementById('admin-vision');
            if (adminVision && data.vision) adminVision.value = data.vision;
            
            const adminMission = document.getElementById('admin-mission');
            if (adminMission && data.mission) adminMission.value = data.mission;
            
            const adminDescription = document.getElementById('admin-description');
            if (adminDescription && data.description) adminDescription.value = data.description;
            
        } catch (error) {
            console.error('Error loading admin settings:', error);
        } finally {
            this.loadingAdminSettings = false;
        }
    }
    
    initFilters() {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.filterProjects(btn.dataset.filter);
            });
        });
        
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.filterEvents(btn.dataset.tab);
            });
        });
        
        const academicYearFilter = document.getElementById('academic-year-filter');
        const courseFilter = document.getElementById('course-filter');
        
        if (academicYearFilter) {
            academicYearFilter.addEventListener('change', () => this.filterToppers());
        }
        if (courseFilter) {
            courseFilter.addEventListener('change', () => this.filterToppers());
        }
    }
    
    filterProjects(filter) {
        const projects = document.querySelectorAll('.project-card');
        projects.forEach(project => {
            if (filter === 'all' || project.dataset.category === filter) {
                project.style.display = 'block';
            } else {
                project.style.display = 'none';
            }
        });
    }
    
    filterEvents(tab) {
        const eventLists = document.querySelectorAll('.events-list');
        eventLists.forEach(list => {
            list.style.display = list.dataset.tab === tab ? 'block' : 'none';
        });
    }
    
    filterToppers() {
        const year = document.getElementById('academic-year-filter')?.value;
        const course = document.getElementById('course-filter')?.value;
        const toppers = document.querySelectorAll('.topper-card');
        
        toppers.forEach(topper => {
            const yearMatch = !year || topper.dataset.year === year;
            const courseMatch = !course || topper.dataset.course === course;
            
            topper.style.display = yearMatch && courseMatch ? 'block' : 'none';
        });
    }
    
    initForms() {
        const contactForm = document.getElementById('contact-form');
        if (contactForm) {
            contactForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleContactForm(e);
            });
        }
        
        const studentEditForm = document.getElementById('student-edit-form');
        const cancelEdit = document.getElementById('cancel-edit');
        
        if (studentEditForm) {
            studentEditForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleStudentEdit(e);
            });
        }
        if (cancelEdit) {
            cancelEdit.addEventListener('click', (e) => {
                e.preventDefault();
                this.showSection('student-profile');
            });
        }
        
        const facultyEditForm = document.getElementById('faculty-edit-form');
        const cancelFacultyEdit = document.getElementById('cancel-faculty-edit');
        
        if (facultyEditForm) {
            facultyEditForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleFacultyEdit(e);
            });
        }
        if (cancelFacultyEdit) {
            cancelFacultyEdit.addEventListener('click', (e) => {
                e.preventDefault();
                this.showSection('faculty-profile');
            });
        }
        
        const adminSettingsForm = document.getElementById('admin-settings-form');
        if (adminSettingsForm) {
            adminSettingsForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAdminSettings(e);
            });
        }
        
        const exploreBtn = document.getElementById('explore-btn');
        if (exploreBtn) {
            exploreBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showSection('about');
                this.updateActiveNavLink('about');
            });
        }
    }
    
    async handleContactForm(e) {
        const formData = new FormData(e.target);
        const data = {
            name: formData.get('name'),
            email: formData.get('email'),
            subject: formData.get('subject'),
            message: formData.get('message')
        };
        
        try {
            await this.api.submitContact(data);
            this.toast.success('Message sent successfully!');
            e.target.reset();
        } catch (error) {
            console.error('Contact form error:', error);
            this.toast.error(error.message || 'Failed to send message');
        }
    }
    
    async handleStudentEdit(e) {
        if (!this.auth.isAuthenticated) return;
        
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData);
        
        try {
            await this.api.updateStudentProfile(data);
            this.toast.success('Profile updated successfully!');
            this.showSection('student-profile');
        } catch (error) {
            console.error('Edit profile error:', error);
            this.toast.error(error.message || 'Failed to update profile');
        }
    }
    
    async handleFacultyEdit(e) {
        if (!this.auth.isAuthenticated) return;
        
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData);
        
        try {
            await this.api.updateFacultyProfile(data);
            this.toast.success('Profile updated successfully!');
            this.showSection('faculty-profile');
        } catch (error) {
            console.error('Edit faculty profile error:', error);
            this.toast.error(error.message || 'Failed to update profile');
        }
    }
    
    async handleAdminSettings(e) {
        if (!this.auth.isAuthenticated || this.auth.currentUser.role !== 'admin') return;
        
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData);
        
        try {
            await this.api.updateDepartmentInfo(data);
            this.toast.success('Settings updated successfully!');
        } catch (error) {
            console.error('Update settings error:', error);
            this.toast.error(error.message || 'Failed to update settings');
        }
    }
    
    async registerForEvent(eventId) {
        if (!this.auth.isAuthenticated) {
            this.auth.openModal('login-modal');
            this.toast.info('Please login to register for events');
            return;
        }
        
        try {
            await this.api.registerForEvent(eventId);
            this.toast.success('Successfully registered for event!');
        } catch (error) {
            console.error('Event registration error:', error);
            this.toast.error(error.message || 'Failed to register for event');
        }
    }
    
    setCurrentYear() {
        const currentYear = document.getElementById('current-year');
        if (currentYear) {
            currentYear.textContent = new Date().getFullYear();
        }
    }
    
    // Admin CRUD methods
    addUser() {
        this.toast.info('Add user functionality coming soon');
    }
    
    async editUser(userId) {
        this.toast.info('Edit user functionality coming soon');
    }
    
    async deleteUser(userId) {
        if (!confirm('Are you sure you want to delete this user?')) return;
        
        try {
            await this.api.deleteUser(userId);
            this.toast.success('User deleted successfully!');
            this.loadAdminUsers();
        } catch (error) {
            console.error('Delete user error:', error);
            this.toast.error(error.message || 'Failed to delete user');
        }
    }
    
    async addFaculty() {
        this.toast.info('Add faculty functionality coming soon');
    }
    
    async editFaculty(facultyId) {
        this.toast.info('Edit faculty functionality coming soon');
    }
    
    async deleteFaculty(facultyId) {
        if (!confirm('Are you sure you want to delete this faculty member?')) return;
        
        try {
            await this.api.deleteFacultyMember(facultyId);
            this.toast.success('Faculty member deleted successfully!');
            this.loadAdminFaculty();
        } catch (error) {
            console.error('Delete faculty error:', error);
            this.toast.error(error.message || 'Failed to delete faculty member');
        }
    }
    
    async addProgram() {
        this.toast.info('Add program functionality coming soon');
    }
    
    async editProgram(programId) {
        this.toast.info('Edit program functionality coming soon');
    }
    
    async deleteProgram(programId) {
        if (!confirm('Are you sure you want to delete this program?')) return;
        
        try {
            await this.api.deleteProgram(programId);
            this.toast.success('Program deleted successfully!');
            this.loadAdminPrograms();
        } catch (error) {
            console.error('Delete program error:', error);
            this.toast.error(error.message || 'Failed to delete program');
        }
    }
    
    async addProject() {
        this.toast.info('Add project functionality coming soon');
    }
    
    async editProject(projectId) {
        this.toast.info('Edit project functionality coming soon');
    }
    
    async deleteProject(projectId) {
        if (!confirm('Are you sure you want to delete this project?')) return;
        
        try {
            await this.api.deleteProject(projectId);
            this.toast.success('Project deleted successfully!');
            this.loadAdminProjects();
        } catch (error) {
            console.error('Delete project error:', error);
            this.toast.error(error.message || 'Failed to delete project');
        }
    }
    
    async addEvent() {
        this.toast.info('Add event functionality coming soon');
    }
    
    async editEvent(eventId) {
        this.toast.info('Edit event functionality coming soon');
    }
    
    async deleteEvent(eventId) {
        if (!confirm('Are you sure you want to delete this event?')) return;
        
        try {
            await this.api.deleteEvent(eventId);
            this.toast.success('Event deleted successfully!');
            this.loadAdminEvents();
        } catch (error) {
            console.error('Delete event error:', error);
            this.toast.error(error.message || 'Failed to delete event');
        }
    }
    
    async viewMessage(messageId) {
        this.toast.info('View message functionality coming soon');
    }
    
    async replyToMessage(messageId) {
        this.toast.info('Reply to message functionality coming soon');
    }
    
    async markMessageRead(messageId) {
        try {
            await this.api.markMessageRead(messageId);
            this.toast.success('Message marked as read');
            this.loadAdminMessages();
        } catch (error) {
            console.error('Mark message read error:', error);
            this.toast.error(error.message || 'Failed to mark message as read');
        }
    }
    
    showError(message) {
        this.toast.error(message);
    }
}