// GitHub OAuth Authentication Module for Docsify
(function () {
    const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:3000'
        : 'https://document-docsify.onrender.com';

    const AUTH_KEYS = {
        TOKEN: 'gh_access_token',
        LOGIN: 'gh_login',
        NAME: 'gh_name',
        AVATAR: 'gh_avatar_url',
    };

    // ── Auth State ──────────────────────────────────────────────
    function isLoggedIn() {
        return !!localStorage.getItem(AUTH_KEYS.TOKEN);
    }

    function getUser() {
        return {
            token: localStorage.getItem(AUTH_KEYS.TOKEN),
            login: localStorage.getItem(AUTH_KEYS.LOGIN),
            name: localStorage.getItem(AUTH_KEYS.NAME),
            avatar: localStorage.getItem(AUTH_KEYS.AVATAR),
        };
    }

    function saveUser(token, login, name, avatar) {
        localStorage.setItem(AUTH_KEYS.TOKEN, token);
        localStorage.setItem(AUTH_KEYS.LOGIN, login);
        localStorage.setItem(AUTH_KEYS.NAME, name);
        localStorage.setItem(AUTH_KEYS.AVATAR, avatar);
    }

    function clearUser() {
        Object.values(AUTH_KEYS).forEach(k => localStorage.removeItem(k));
    }

    // ── Handle OAuth callback params in URL ─────────────────────
    function handleOAuthCallback() {
        const params = new URLSearchParams(window.location.search);

        if (params.has('access_token')) {
            saveUser(
                params.get('access_token'),
                params.get('login'),
                params.get('name'),
                params.get('avatar_url')
            );
            // Clean the URL — remove query string, keep the hash
            const cleanUrl = window.location.origin + window.location.pathname + (window.location.hash || '#/');
            window.history.replaceState({}, '', cleanUrl);
            console.log('Auth: Logged in as', params.get('login'));
        }

        if (params.has('auth_error')) {
            console.error('Auth: Login failed —', params.get('auth_error'));
            // Redirect to login page with error
            window.location.replace('/login.html?auth_error=' + params.get('auth_error'));
            return;
        }
    }

    // ── Gate: Redirect to login if not authenticated ────────────
    function enforceLogin() {
        // Don't redirect if this IS the login page
        if (window.location.pathname.includes('login.html')) return;

        if (!isLoggedIn()) {
            window.location.replace('/login.html');
            return false;
        }
        return true;
    }

    // ── Styles ──────────────────────────────────────────────────
    function injectAuthStyles() {
        if (document.getElementById('auth-styles')) return;
        const style = document.createElement('style');
        style.id = 'auth-styles';
        style.textContent = `
            #gh-auth-container {
                position: fixed;
                top: 14px;
                right: 180px;
                z-index: 9999;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                animation: auth-fade-in 0.3s ease-out;
            }
            @keyframes auth-fade-in {
                from { opacity: 0; transform: translateY(-8px); }
                to   { opacity: 1; transform: translateY(0); }
            }

            /* User Profile */
            #gh-user-profile {
                display: inline-flex;
                align-items: center;
                gap: 10px;
                padding: 5px 14px 5px 5px;
                background: #fff;
                border: 1px solid #e5e7eb;
                border-radius: 24px;
                cursor: pointer;
                box-shadow: 0 4px 12px rgba(0,0,0,0.06);
                transition: all 0.2s ease;
                position: relative;
            }
            #gh-user-profile:hover {
                border-color: #d1d5db;
                transform: translateY(-2px);
                box-shadow: 0 6px 16px rgba(0,0,0,0.1);
            }
            #gh-user-avatar {
                width: 30px;
                height: 30px;
                border-radius: 50%;
                border: 2px solid #e5e7eb;
                object-fit: cover;
            }
            #gh-user-name {
                font-size: 13px;
                font-weight: 600;
                color: #1f2937;
                max-width: 120px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            /* Dropdown */
            #gh-dropdown {
                display: none;
                position: absolute;
                top: calc(100% + 8px);
                right: 0;
                min-width: 200px;
                background: #fff;
                border: 1px solid #e5e7eb;
                border-radius: 14px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.12);
                overflow: hidden;
                animation: auth-dropdown-in 0.2s ease-out;
                z-index: 10001;
            }
            #gh-dropdown.open { display: block; }
            @keyframes auth-dropdown-in {
                from { opacity: 0; transform: translateY(-6px) scale(0.96); }
                to   { opacity: 1; transform: translateY(0) scale(1); }
            }

            .gh-dropdown-header {
                padding: 14px 16px;
                border-bottom: 1px solid #f0f0f0;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .gh-dropdown-header img {
                width: 36px; height: 36px; border-radius: 50%;
                border: 2px solid #e5e7eb;
            }
            .gh-dropdown-header-info {
                display: flex; flex-direction: column;
            }
            .gh-dropdown-header-name {
                font-size: 14px; font-weight: 700; color: #111;
            }
            .gh-dropdown-header-login {
                font-size: 12px; color: #6b7280;
            }

            .gh-dropdown-item {
                display: flex;
                align-items: center;
                gap: 10px;
                width: 100%;
                padding: 11px 16px;
                background: none;
                border: none;
                font-size: 13px;
                font-family: inherit;
                color: #374151;
                cursor: pointer;
                text-decoration: none;
                transition: background 0.15s;
            }
            .gh-dropdown-item:hover { background: #f9fafb; }
            .gh-dropdown-item svg {
                width: 16px; height: 16px; flex-shrink: 0;
            }

            .gh-dropdown-divider {
                height: 1px; background: #f0f0f0; margin: 0;
            }

            .gh-dropdown-item.danger { color: #ef4444; }
            .gh-dropdown-item.danger:hover { background: #fef2f2; }
        `;
        document.head.appendChild(style);
    }

    // ── UI Rendering ────────────────────────────────────────────
    function renderAuthUI() {
        // Remove existing
        const existing = document.getElementById('gh-auth-container');
        if (existing) existing.remove();

        // Only render the profile widget if logged in (no login button here — that's on login.html)
        if (!isLoggedIn()) return;

        const user = getUser();
        const container = document.createElement('div');
        container.id = 'gh-auth-container';
        container.innerHTML = `
            <div id="gh-user-profile">
                <img id="gh-user-avatar" src="${user.avatar}" alt="${user.login}" />
                <span id="gh-user-name">${user.name}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2.5">
                    <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
                <div id="gh-dropdown">
                    <div class="gh-dropdown-header">
                        <img src="${user.avatar}" alt="${user.login}" />
                        <div class="gh-dropdown-header-info">
                            <span class="gh-dropdown-header-name">${user.name}</span>
                            <span class="gh-dropdown-header-login">@${user.login}</span>
                        </div>
                    </div>
                    <a href="https://github.com/${user.login}" target="_blank" class="gh-dropdown-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                        Your Profile
                    </a>
                    <a href="https://github.com/settings/profile" target="_blank" class="gh-dropdown-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                        Settings
                    </a>
                    <div class="gh-dropdown-divider"></div>
                    <button id="gh-logout-btn" class="gh-dropdown-item danger">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                        Sign Out
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(container);
        bindAuthEvents();
    }

    // ── Event Binding ───────────────────────────────────────────
    function bindAuthEvents() {
        // Profile toggle dropdown
        const profile = document.getElementById('gh-user-profile');
        const dropdown = document.getElementById('gh-dropdown');
        if (profile && dropdown) {
            profile.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdown.classList.toggle('open');
            });

            document.addEventListener('click', (e) => {
                if (!profile.contains(e.target)) {
                    dropdown.classList.remove('open');
                }
            });
        }

        // Logout button — clear data and redirect to login page
        const logoutBtn = document.getElementById('gh-logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                clearUser();
                window.location.replace('/login.html');
            });
        }
    }

    // ── Initialize ──────────────────────────────────────────────
    function initAuth() {
        handleOAuthCallback();

        // If not on login page, enforce login
        if (!enforceLogin()) return;

        injectAuthStyles();
        renderAuthUI();
    }

    // Boot
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAuth);
    } else {
        initAuth();
    }

    // Expose for other modules
    window.GHAuth = { isLoggedIn, getUser, clearUser };
})();
