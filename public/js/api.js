const API_URL = '/api';

async function fetchWithAuth(url, options = {}) {
    const token = localStorage.getItem('token');
    const headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}`
    };

    const response = await fetch(`${API_URL}${url}`, { ...options, headers });

    if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        window.location.href = '/';
    }

    return response;
}

async function loadSettings() {
    try {
        const res = await fetch(`${API_URL}/settings/public`);
        if (res.ok) {
            const settings = await res.json();

            // Apply Theme
            if (localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                document.documentElement.classList.add('dark');
                localStorage.setItem('theme', 'dark');
            } else {
                document.documentElement.classList.remove('dark');
                localStorage.setItem('theme', 'light');
            }

            // Update CSS Variables for White-Label
            if (settings.primary_color) {
                document.documentElement.style.setProperty('--primary-color', settings.primary_color);
            }
            if (settings.secondary_color) {
                document.documentElement.style.setProperty('--secondary-color', settings.secondary_color);
            }

            // Update Logos
            if (settings.logo_path) {
                document.querySelectorAll('.dynamic-logo').forEach(img => {
                    img.src = settings.logo_path;
                });
            }

            // Update Titles
            if (settings.platform_name) {
                document.title = settings.platform_name;
                document.querySelectorAll('.dynamic-title').forEach(el => {
                    el.textContent = settings.platform_name;
                });
            }

            // Update Login Background
            if (settings.login_background_path) {
                const mainBody = document.getElementById('main-body');
                if (mainBody) {
                    mainBody.style.backgroundImage = `url('${settings.login_background_path}')`;
                }
            }

            // LGPD Consent Logic
            if (settings.lgpd_terms && settings.lgpd_terms.trim() !== '') {
                const lgpdBanner = document.getElementById('lgpd-banner');
                const lgpdText = document.getElementById('lgpd-text');
                const lgpdAcceptBtn = document.getElementById('btn-lgpd-accept');

                if (lgpdBanner && lgpdText && lgpdAcceptBtn) {
                    if (localStorage.getItem('lgpd_accepted') !== 'true') {
                        lgpdText.textContent = settings.lgpd_terms;
                        lgpdBanner.classList.remove('hidden');

                        lgpdAcceptBtn.addEventListener('click', () => {
                            localStorage.setItem('lgpd_accepted', 'true');
                            lgpdBanner.classList.add('hidden');
                        });
                    }
                }
            }
        }
    } catch (err) {
        console.error("Failed to load settings", err);
    }
}

// Call on load
document.addEventListener('DOMContentLoaded', loadSettings);

window.toggleDarkMode = function () {
    if (localStorage.getItem('theme') === 'light') {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
    } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
    }
};
