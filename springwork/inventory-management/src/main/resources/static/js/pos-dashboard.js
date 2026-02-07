// POS Dashboard JavaScript - Handles dashboard initialization, menu loading, and display type switching

const API_BASE_URL = '/api';
const DASHBOARD_API = `${API_BASE_URL}/dashboard`;

let currentDashboard = null;
let currentCompanyId = null;
let currentDisplayType = 'D';

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const isAuthenticated = await checkAuthentication();
        //alert(isAuthenticated);
        if (!isAuthenticated) {
			//alert('authentication failed');
            window.location.href = '/login.html';
            return;
        }
        await loadDashboard();
        await loadHeaderMenu();
        updateBreadcrumb();
        setupEventListeners();
        await loadUserCompanies();
    } catch (error) {
        showErrorMessage('Failed to load dashboard. Please refresh the page.');
    }
});

// Load header menu from screens with display type D or HD and user company role
async function loadHeaderMenu() {
    try {
        // Extract roleId from JWT (client side)
        let roleId = null;
        const token = localStorage.getItem('jwtToken') || (JSON.parse(localStorage.getItem('loginResponse')||'{}').token || '');
      // alert(token);
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                //alert(payload.roleId);
                if (!payload.roleId) alert(payload.roleId);
                if (payload.roleId) roleId = payload.roleId;
                
                
            
            } catch {
            	alert('paload roleid catch');
            }
        }
        let url = '/api/dashboard/load';
        if (roleId) {
            url += `?roleId=${encodeURIComponent(roleId)}`;
        }
        let dashboardData = null;
        let screens = [];
        let userRoleId = roleId;
       // alert(url);
        let res = await fetch(url);
        
        if (res.ok) {
        	
            const result = await res.json();
            //alert(result.success);
            if (result.success && result.data) {
                dashboardData = result.data;
                // Try to get roleScreens from dashboardData
                if (dashboardData.roleScreens && Array.isArray(dashboardData.roleScreens)) {
                    screens = dashboardData.roleScreens;
                } else if (dashboardData.screens && Array.isArray(dashboardData.screens)) {
                    screens = dashboardData.screens;
                }
            }
        }
        if (!screens.length) {
            // fallback to /api/dashboard/screens (legacy)
            let fallbackRes = await fetch('/api/dashboard/screens');
            if (fallbackRes.ok) {
                const fallbackResult = await fallbackRes.json();
                if (fallbackResult.success && Array.isArray(fallbackResult.data)) {
                    screens = fallbackResult.data;
                }
            }
        }
        if (!screens.length) {
            // fallback to /screens (public, if available)
            let fallbackRes = await fetch('/screens');
            screens = await fallbackRes.json();
        }

        // Filter screens with display type D or HD
        let headerScreens = screens.filter(s =>
            s.displayType && (s.displayType.name === 'D' || s.displayType.name === 'HD' || s.displayType === 'D' || s.displayType === 'HD')
        );

        // If roleId is available and screens have roles, filter by user role
        if (userRoleId) {
            headerScreens = headerScreens.filter(s => {
                if (!s.roles) return true;
                if (Array.isArray(s.roles)) {
                    return s.roles.includes(userRoleId) || s.roles.some(r => r.id === userRoleId);
                }
                return true;
            });
        }

        // Render menu in header
        let navMenu = document.getElementById('headerMenu');
        if (navMenu) {
            navMenu.innerHTML = '';
        }

        // Group screens by group (group.id or 'nogroup')
        const groups = new Map();
        headerScreens.forEach(s => {
            const grp = s.group ? `${s.group.id}::${s.group.name}` : 'nogroup::';
            if (!groups.has(grp)) groups.set(grp, []);
            groups.get(grp).push(s);
        });

        // Render groups: grouped menus become dropdowns; 'nogroup' items are top-level links
        for (const [grpKey, items] of groups) {
            if (grpKey === 'nogroup::') {
                // render each ungrouped screen as top-level link
                items.forEach(screen => {
                    const li = document.createElement('li');
                    li.className = 'nav-item';
                    const link = document.createElement('a');
                    link.className = 'nav-link';
                    link.href = screen.path || '#';
                    link.textContent = screen.name;
                    li.appendChild(link);
                    navMenu.appendChild(li);
                });
                continue;
            }

            // groupKey is "id::name"
            const [gid, gname] = grpKey.split('::');
            const li = document.createElement('li');
            li.className = 'nav-item dropdown';

            const toggleId = `menuGroup${gid}`;
            const anchor = document.createElement('a');
            anchor.className = 'nav-link dropdown-toggle';
            anchor.href = '#';
            anchor.id = toggleId;
            anchor.setAttribute('role', 'button');
            anchor.setAttribute('data-bs-toggle', 'dropdown');
            anchor.setAttribute('aria-expanded', 'false');
            anchor.textContent = gname;

            const ul = document.createElement('ul');
            ul.className = 'dropdown-menu';
            ul.setAttribute('aria-labelledby', toggleId);

            items.forEach(screen => {
                const itemLi = document.createElement('li');
                const a = document.createElement('a');
                a.className = 'dropdown-item';
                a.href = screen.path || '#';
                a.textContent = screen.name;
                itemLi.appendChild(a);
                ul.appendChild(itemLi);
            });

            li.appendChild(anchor);
            li.appendChild(ul);
            navMenu.appendChild(li);
        }

        // Add login link at the end
        const loginLi = document.createElement('li');
        loginLi.className = 'nav-item';
        loginLi.innerHTML = `<a class="nav-link" href="login.html"><i class="bi bi-box-arrow-in-right"></i> Login</a>`;
        navMenu.appendChild(loginLi);

    } catch (error) {
        console.error('Error loading header menu:', error);
    }
}
// Update breadcrumb based on current path
function updateBreadcrumb() {
    const breadcrumbCurrent = document.getElementById('breadcrumbCurrent');
    
    if (!breadcrumbCurrent) return;
    
    // Try to use the active menu item as breadcrumb
    const activeMenu = document.querySelector('#headerMenu .nav-link.active, #headerMenu .dropdown-item.active');
   
    if (activeMenu) {
    	
        breadcrumbCurrent.textContent = activeMenu.textContent;
    } else {
        // fallback to page title
        breadcrumbCurrent.textContent = document.title.replace(' | Inventory Pro', '');
        
    }
}
function setupEventListeners() {
    const companySelect = document.getElementById('companySelect');
    if (companySelect) {
        companySelect.addEventListener('change', (e) => {
            currentCompanyId = e.target.value ? parseInt(e.target.value) : null;
            loadDashboard();
        });
    }
    const displayTypeSelect = document.getElementById('displayTypeSelect');
    if (displayTypeSelect) {
        displayTypeSelect.addEventListener('change', (e) => {
            currentDisplayType = e.target.value;
            applyDisplayType(currentDisplayType);
            loadDashboard();
        });
    }
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    const userAvatar = document.getElementById('userAvatar');
    if (userAvatar) {
        userAvatar.addEventListener('click', () => {
            // Profile page navigation (future)
        });
    }
}

async function loadDashboard() {
    try {
        const url = new URL(`${DASHBOARD_API}/load`, window.location.origin);
        url.searchParams.append('displayType', currentDisplayType);
        if (currentCompanyId) {
            url.searchParams.append('companyId', currentCompanyId);
        }
        // Extract roleId from JWT (client side)
        const token = getAuthToken();
        let roleId = null;
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                if (payload.roleId) roleId = payload.roleId;
            } catch {}
        }
        if (roleId) {
            url.searchParams.append('roleId', roleId);
        }
        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) throw new Error(`Dashboard load failed: ${response.statusText}`);
        const result = await response.json();
        if (!result.success) throw new Error(result.message || 'Failed to load dashboard');
        currentDashboard = result.data;
        updateDashboardUI(result.data);
        buildMenuFromDashboard(result.data);
        buildQuickLinks(result.data);
    } catch (error) {
        showErrorMessage(`Error loading dashboard: ${error.message}`);
    }
}

function updateDashboardUI(dashboard) {
    const { user, company, displayType } = dashboard;
    if (user) {
        document.getElementById('userName').textContent = user.username || 'User';
        document.getElementById('userRole').textContent = user.roleName || 'User';
        document.getElementById('userAvatar').textContent = (user.username || 'U').charAt(0).toUpperCase();
        document.getElementById('welcomeMessage').textContent = `Welcome, ${user.username}! You're logged in as ${user.roleName}.`;
    }
    if (company) {
        document.getElementById('companyName').textContent = company.name;
        currentCompanyId = company.id;
        updateCompanySelector(company.id);
    }
    if (displayType) {
        document.getElementById('displayTypeSelect').value = displayType;
        applyDisplayType(displayType);
    }
    loadDashboardStats(company?.id);
}

function buildMenuFromDashboard(dashboard) {
    const menuContainer = document.getElementById('menuContainer');
    const menus = dashboard.menus || [];
    if (!menus || menus.length === 0) {
        menuContainer.innerHTML = '<div class="text-center text-muted py-4">No menu items available</div>';
        return;
    }
    const groupedMenus = {};
    menus.forEach(menu => {
        const groupName = menu.groupName || 'General';
        if (!groupedMenus[groupName]) groupedMenus[groupName] = [];
        groupedMenus[groupName].push(menu);
    });
    let menuHTML = '';
    for (const [groupName, items] of Object.entries(groupedMenus)) {
        menuHTML += `<div class="menu-group">`;
        menuHTML += `<div class="menu-group-title">${groupName}</div>`;
        items.forEach(item => {
            const icon = item.icon || 'bi-square';
            const title = item.name;
            const path = item.path || '#';
            const description = item.description || '';
            menuHTML += `
                <a href="${path}" class="menu-item" title="${description}">
                    <span class="menu-item-icon">
                        <i class="bi ${icon}"></i>
                    </span>
                    <span class="menu-item-text">${title}</span>
                </a>
            `;
        });
        menuHTML += `</div>`;
    }
    menuContainer.innerHTML = menuHTML;
    const currentPath = window.location.pathname;
    document.querySelectorAll('.menu-item').forEach(item => {
        if (item.getAttribute('href') === currentPath) {
            item.classList.add('active');
        }
    });
}

function buildQuickLinks(dashboard) {
    const quickLinksGrid = document.getElementById('quickLinksGrid');
    const menus = dashboard.menus || [];
    const quickMenus = menus.slice(0, 8);
    if (quickMenus.length === 0) {
        quickLinksGrid.innerHTML = '<div class="text-muted">No quick links available</div>';
        return;
    }
    let quickHTML = '';
    quickMenus.forEach(item => {
        const icon = item.icon || 'bi-square';
        const title = item.name;
        const path = item.path || '#';
        quickHTML += `
            <a href="${path}" class="quick-link-btn">
                <span class="quick-link-icon">
                    <i class="bi ${icon}"></i>
                </span>
                <span>${title}</span>
            </a>
        `;
    });
    quickLinksGrid.innerHTML = quickHTML;
}

async function loadUserCompanies() {
    try {
        const token = getAuthToken();
        const response = await fetch(`${DASHBOARD_API}/companies`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) throw new Error('Failed to load companies');
        const result = await response.json();
        if (!result.success || !result.data) return;
        const companies = result.data;
        const companySelect = document.getElementById('companySelect');
        if (companies.length === 0) {
            companySelect.innerHTML = '<option value="">No companies available</option>';
            return;
        }
        let optionsHTML = '';
        companies.forEach(company => {
            optionsHTML += `<option value="${company.id}">${company.name}</option>`;
        });
        companySelect.innerHTML = optionsHTML;
        if (currentCompanyId) {
            companySelect.value = currentCompanyId;
        }
    } catch (error) {
        // ignore
    }
}

function updateCompanySelector(companyId) {
    const companySelect = document.getElementById('companySelect');
    if (companySelect && companyId) {
        companySelect.value = companyId;
    }
}

function applyDisplayType(displayType) {
    const body = document.body;
    body.className = body.className.replace(/display-type-\w+/g, '');
    body.classList.add(`display-type-${displayType.toLowerCase()}`);
    localStorage.setItem('preferredDisplayType', displayType);
}

function loadDashboardStats(companyId) {
    updateStatCard('productCount', Math.floor(Math.random() * 100) + 10);
    updateStatCard('inventoryCount', Math.floor(Math.random() * 500) + 50);
    updateStatCard('poCount', Math.floor(Math.random() * 30) + 5);
    updateStatCard('userCount', Math.floor(Math.random() * 20) + 3);
}

function updateStatCard(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = value;
    }
}

async function checkAuthentication() {
    const token = getAuthToken();
    if (!token) return false;
    try {
        const response = await fetch(`${DASHBOARD_API}/load`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        return response.ok;
    } catch (error) {
        return false;
    }
}

function getAuthToken() {
    /**let loginResponse = localStorage.getItem('loginResponse');
    if (loginResponse) {
        try {
			alert('login response: '+loginResponse);
            const parsed = JSON.parse(loginResponse);
            return parsed.token || null;
        } catch {}
    }**/
    return localStorage.getItem('jwtToken') || null;
}

function logout() {
    localStorage.removeItem('loginResponse');
    localStorage.removeItem('jwtToken');
    window.location.href = '/login.html';
}

function showErrorMessage(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-container';
    errorDiv.textContent = message;
    const container = document.getElementById('dashboardContainer');
    if (container) {
        container.insertBefore(errorDiv, container.firstChild);
        setTimeout(() => { errorDiv.remove(); }, 5000);
    }
}

function loadPreferredDisplayType() {
    const preferred = localStorage.getItem('preferredDisplayType');
    if (preferred) {
        currentDisplayType = preferred;
        applyDisplayType(currentDisplayType);
    }
}

loadPreferredDisplayType();
