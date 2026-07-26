// Global state
const apiUrl = '/roles';
let currentRoleId = null;
let allRoles = [];
let companies = [];

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    loadHeaderMenu();
    loadUserInfo();
    loadCompanies();
});

// Load header menu from screens with display type D or HD and user company role
async function loadHeaderMenu() {
    try {
        // Extract roleId from JWT (client side)
        let roleId = null;
        const token = localStorage.getItem('jwtToken') || (JSON.parse(localStorage.getItem('loginResponse')||'{}').token || '');
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                if (payload.roleId) roleId = payload.roleId;
            } catch {}
        }
        let url = '/api/dashboard/load';
        if (roleId) {
            url += `?roleId=${encodeURIComponent(roleId)}`;
        }
        let dashboardData = null;
        let screens = [];
        let userRoleId = roleId;
        let res = await fetch(url);
        
        if (res.ok) {
            const result = await res.json();
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
        //alert(' screen length '+screens.length);
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

        // Add logout link at the end
        const logoutLi = document.createElement('li');
        logoutLi.className = 'nav-item';
        logoutLi.innerHTML = `<a class="nav-link" href="#" id="headerLogout"><i class="bi bi-box-arrow-right"></i> Logout</a>`;
        navMenu.appendChild(logoutLi);
        // Attach logout event
        const headerLogout = document.getElementById('headerLogout');
        if (headerLogout) {
            headerLogout.addEventListener('click', function(e) {
                e.preventDefault();
                logout();
            });
        }

    } catch (error) {
        console.error('Error loading header menu:', error);
    }
}

// Load user information into header
async function loadUserInfo() {
    try {
        const token = getAuthToken();
        if (!token) return;
        const payload = token.split('.')[1];
        const decoded = JSON.parse(atob(payload));
        
        const userNameEl = document.getElementById('userName');
        const userRoleEl = document.getElementById('userRole');
        const userAvatarEl = document.getElementById('userAvatar');
        
        if (userNameEl && decoded.username) {
            userNameEl.textContent = decoded.username;
        }
        if (userRoleEl && decoded.roleName) {
            userRoleEl.textContent = decoded.roleName;
        }
        if (userAvatarEl && decoded.username) {
            userAvatarEl.textContent = (decoded.username || 'U').charAt(0).toUpperCase();
        }
    } catch (error) {
        console.error('Error loading user info:', error);
    }
}

// Get JWT token from localStorage
function getAuthHeader() {
    const token = localStorage.getItem('jwtToken');
    return token ? `Bearer ${token}` : null;
}

// Get authentication token from localStorage
function getAuthToken() {
    return localStorage.getItem('jwtToken') || (JSON.parse(localStorage.getItem('loginResponse')||'{}').token || '');
}

// Show alert message
function showAlert(message, type = 'success', containerId = 'alert') {
    const alertEl = document.getElementById(containerId);
    alertEl.textContent = message;
    alertEl.className = `alert show ${type}`;
    setTimeout(() => alertEl.classList.remove('show'), 4000);
}

// Switch between tabs
function switchTab(tabName, event) {
    if (event) event.preventDefault();
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.getElementById(tabName).classList.add('active');
    
    // Find and activate the corresponding button
    const buttons = document.querySelectorAll('.tab-button');
    buttons.forEach((btn, index) => {
        if (tabName === 'filters-tab' && index === 0) btn.classList.add('active');
        else if (tabName === 'results-tab' && index === 1) btn.classList.add('active');
        else if (tabName === 'details-tab' && index === 2) btn.classList.add('active');
    });
}

// Load companies dropdown
function loadCompanies() {
    const headers = { 'Content-Type': 'application/json' };
    const authHeader = getAuthHeader();
    if (authHeader) headers['Authorization'] = authHeader;

    fetch('/companies', { headers })
        .then(res => res.json())
        .then(data => {
            companies = Array.isArray(data) ? data : (data.data || []);
            const companySelects = ['companyFilter', 'roleCompany'];
            companySelects.forEach(id => {
                const select = document.getElementById(id);
                const currentValue = select.value;
                select.innerHTML = '<option value="">Global Role</option>';
                companies.forEach(c => {
                    const option = document.createElement('option');
                    option.value = c.id;
                    option.textContent = c.name;
                    select.appendChild(option);
                });
                select.value = currentValue;
            });
            loadRoles();
        })
        .catch(err => console.error('Error loading companies:', err));
}

// Get company name by ID
function getCompanyName(companyId) {
    if (!companyId) return '<span class="badge bg-info">Global</span>';
    const company = companies.find(c => c.id == companyId);
    return company ? company.name : 'Unknown';
}

// Load all roles
function loadRoles() {
    fetch(apiUrl)
        .then(res => res.json())
        .then(roles => {
            allRoles = Array.isArray(roles) ? roles : [];
        })
        .catch(err => console.error('Error loading roles:', err));
}

// Perform search
function performSearch() {
    const companyId = document.getElementById('companyFilter').value;
    const nameFilter = document.getElementById('nameFilter').value.toLowerCase();

    let filtered = allRoles.filter(r => {
        // Show role if:
        // 1. No company filter is selected (show all) OR
        // 2. Company filter matches the role's company OR
        // 3. Role is global (no company) - always show global roles
        const matchCompany = !companyId || (r.company?.id == companyId) || !r.company;
        const matchName = !nameFilter || (r.name && r.name.toLowerCase().includes(nameFilter));
        return matchCompany && matchName;
    });

    displaySearchResults(filtered);
    switchTab('results-tab', null);
}

// Display search results in table
function displaySearchResults(roles) {
    const tbody = document.getElementById('resultsTableBody');
    if (roles.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No roles found</td></tr>';
        return;
    }

    tbody.innerHTML = roles.map(r => `
        <tr>
            <td>${r.id}</td>
            <td>${r.name}</td>
            <td>${r.description || '-'}</td>
            <td>${getCompanyName(r.company?.id)}</td>
            <td class="action-buttons">
                <button class="btn-primary" onclick="viewRole(${r.id})">View</button>
                <button class="btn-danger" onclick="deleteRole(${r.id})">Delete</button>
            </td>
        </tr>
    `).join('');
}

// Reset filters
function resetFilters() {
    document.getElementById('companyFilter').value = '';
    document.getElementById('nameFilter').value = '';
    document.getElementById('resultsTableBody').innerHTML = '<tr><td colspan="5" class="empty-state">Use Search to find roles</td></tr>';
    closeDetailsView();
}

// Create new role
function createNewRole() {
    currentRoleId = null;
    document.getElementById('roleId').value = '';
    document.getElementById('roleName').value = '';
    document.getElementById('roleDescription').value = '';
    document.getElementById('roleCompany').value = '';
    document.getElementById('formTitle').textContent = 'New Role';
    document.getElementById('roleFormContainer').style.display = 'block';
    document.getElementById('roleDetailsContainer').style.display = 'none';
    switchTab('details-tab', null);
}

// View role details
function viewRole(roleId) {
    const role = allRoles.find(r => r.id == roleId);
    if (!role) return;

    currentRoleId = roleId;
    document.getElementById('detailsName').textContent = role.name;
    document.getElementById('detailsCompany').innerHTML = getCompanyName(role.company?.id);
    document.getElementById('detailsDescription').textContent = role.description || '-';
    document.getElementById('roleDetailsTitle').textContent = role.name;

    document.getElementById('roleFormContainer').style.display = 'none';
    document.getElementById('roleDetailsContainer').style.display = 'block';
    switchTab('details-tab', null);
}

// Edit role
function editRole() {
    const role = allRoles.find(r => r.id == currentRoleId);
    if (!role) return;

    document.getElementById('roleId').value = role.id;
    document.getElementById('roleName').value = role.name;
    document.getElementById('roleDescription').value = role.description || '';
    document.getElementById('roleCompany').value = role.company?.id || '';
    document.getElementById('formTitle').textContent = 'Edit Role';
    
    document.getElementById('roleFormContainer').style.display = 'block';
    document.getElementById('roleDetailsContainer').style.display = 'none';
}

// Delete current role (from details view)
function deleteCurrentRole() {
    if (!currentRoleId) return;
    if (!confirm('Are you sure you want to delete this role?')) return;
    deleteRole(currentRoleId);
}

// Delete role
function deleteRole(roleId) {
    const headers = {};
    const authHeader = getAuthHeader();
    if (authHeader) headers['Authorization'] = authHeader;

    fetch(`${apiUrl}/${roleId}`, { method: 'DELETE', headers })
        .then(res => {
            if (!res.ok) {
                if (res.status === 403) {
                    showAlert('Only global users can delete global roles', 'error', 'detailsAlert');
                } else {
                    showAlert('Error deleting role', 'error', 'detailsAlert');
                }
                return;
            }
            showAlert('Role deleted successfully', 'success', 'detailsAlert');
            loadRoles();
            setTimeout(() => {
                closeDetailsView();
                performSearch();
            }, 500);
        })
        .catch(err => {
            console.error('Error deleting role:', err);
            showAlert('Error deleting role', 'error', 'detailsAlert');
        });
}

// Close details view
function closeDetailsView() {
    currentRoleId = null;
    document.getElementById('roleFormContainer').style.display = 'block';
    document.getElementById('roleDetailsContainer').style.display = 'none';
    document.getElementById('roleForm').reset();
    document.getElementById('roleId').value = '';
}

// Handle form submission
function setupFormSubmission() {
    const form = document.getElementById('roleForm');
    if (!form) return;

    form.addEventListener('submit', function(e) {
        e.preventDefault();

        const roleId = document.getElementById('roleId').value;
        const name = document.getElementById('roleName').value.trim();
        const description = document.getElementById('roleDescription').value.trim();
        const companyId = document.getElementById('roleCompany').value;

        if (!name) {
            showAlert('Role name is required', 'error', 'detailsAlert');
            return;
        }

        const payload = { name, description };
        let method = 'POST';
        let url = apiUrl;

        if (roleId) {
            method = 'PUT';
            url += `/${roleId}`;
        }

        if (companyId) {
            url += (url.includes('?') ? '&' : '?') + `companyId=${companyId}`;
        }

        const headers = { 'Content-Type': 'application/json' };
        const authHeader = getAuthHeader();
        if (authHeader) headers['Authorization'] = authHeader;

        fetch(url, { method, headers, body: JSON.stringify(payload) })
            .then(async res => {
                if (!res.ok) {
                    const msg = await res.text();
                    showAlert(msg || 'Error saving role', 'error', 'detailsAlert');
                    return;
                }
                showAlert(`Role ${roleId ? 'updated' : 'created'} successfully`, 'success', 'detailsAlert');
                document.getElementById('roleForm').reset();
                document.getElementById('roleId').value = '';
                loadRoles();
                setTimeout(() => {
                    closeDetailsView();
                    resetFilters();
                }, 500);
            })
            .catch(err => {
                console.error('Error saving role:', err);
                showAlert('Error saving role', 'error', 'detailsAlert');
            });
    });
}

// Logout function
async function logout() {
    try {
        localStorage.removeItem('jwtToken');
        localStorage.removeItem('loginResponse');
        localStorage.removeItem('username');
        localStorage.removeItem('role');
        window.location.href = '/';
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// Initialize form submission when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    setupFormSubmission();
});
