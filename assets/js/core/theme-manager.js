// ===== THEME MANAGER =====
class ThemeManager {
    constructor() {
        this.themeToggle = document.getElementById('theme-toggle');
        this.themeIcon = this.themeToggle?.querySelector('i');
        this.currentTheme = localStorage.getItem('theme') || 'light';
        this.init();
    }
    
    init() {
        if (this.themeToggle) {
            this.setTheme(this.currentTheme);
            this.themeToggle.addEventListener('click', () => this.toggleTheme());
            this.updateIcon();
        }
        
        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!localStorage.getItem('theme')) {
                this.setTheme(e.matches ? 'dark' : 'light');
            }
        });
    }
    
    setTheme(theme) {
        this.currentTheme = theme;
        localStorage.setItem('theme', theme);
        
        if (theme === 'dark') {
            document.body.classList.add('dark-theme');
            document.documentElement.style.colorScheme = 'dark';
        } else {
            document.body.classList.remove('dark-theme');
            document.documentElement.style.colorScheme = 'light';
        }
        
        this.updateIcon();
        
        // Dispatch theme change event
        window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
    }
    
    updateIcon() {
        if (this.themeIcon) {
            this.themeIcon.className = this.currentTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
    }
    
    toggleTheme() {
        this.setTheme(this.currentTheme === 'dark' ? 'light' : 'dark');
    }
    
    isDarkMode() {
        return this.currentTheme === 'dark';
    }
    
    getTheme() {
        return this.currentTheme;
    }
}