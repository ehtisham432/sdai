// Global state
let searchResults = [];
let currentEditingMapping = null;
let currentViewingMapping = null;
let allUsers = [];
let allRoles = [];
let allCompanies = [];

// API endpoints
const apiUrl = '/user-company-roles';
const usersApi = '/users';
const companiesApi = '/companies';
const rolesApi = '/roles';

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    loadHeaderMenu();
    loadUserInfo();
    loadData();
    setupFormSubmission();
});

// Load header menu from screens with display type D or HD
async function loadHeaderMenu() {
    try {
        let roleId = null;
        const token = localStorage.getItem('jwtToken') || (JSON.parse(localStorage.getItem('loginResponse')||'{}').token || '');
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                roleId = payload.roleId;
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
                if (dashboardData.roleScreens && Array.isArray(dashboardData.roleScreens)) {
                    screens = dashboardData.roleScreens;
                } else if (dashboardData.screens && Array.isArray(dashboardData.screens)) {
                    screens = dashboardData.screens;
                }
            }
        }
        if (!screens.length) {
            let fallbackRes = await fetch('/api/dashboard/screens');
            if (fallbackRes.ok) {
                screens = await fallbackRes.json();
            }
        }
        if (!screens.length) {
            let fallbackRes = await fetch('/screens');
            screens = await fallbackRes.json();
        }
        let headerScreens = screens.filter(s =>
            s.displayType && (s.displayType.name === 'D' || s.displayType.name === 'HD' || s.displayType === 'D' || s.displayType === 'HD')
        );
        let navMenu = document.getElementById('headerMenu');
        if (navMenu) {
            navMenu.innerHTML = '';
        }
        const groups = new Map();
        headerScreens.forEach(s => {
            const grp = s.group ? `${s.group.id}::${s.group.name}` : 'nogroup::';
            if (!groups.has(grp)) groups.set(grp, []);
            groups.get(grp).push(s);
        });
        for (const [grpKey, items] of groups) {
            if (grpKey === 'nogroup::') {
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
        const logoutLi = document.createElement('li');
        logoutLi.className = 'nav-item';
        logoutLi.innerHTML = `<a class="nav-link" href="#" id="headerLogout"><i class="bi bi-box-arrow-right"></i> Logout</a>`;
        navMenu.appendChild(logoutLi);
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
        
        if (userNameEl && decoded.username) userNameEl.textContent = decoded.username;
        if (userRoleEl && decoded.roleName) userRoleEl.textContent = decoded.roleName;
        if (userAvatarEl && decoded.username) userAvatarEl.textContent = decoded.username.charAt(0).toUpperCase();
    } catch (error) {
        console.error('Error loading user info:', error);
    }
}

// Load all data
async function loadData() {
    try {
        const [users, companies, roles] = await Promise.all([
            fetch(usersApi).then(r => r.json()),
            fetch(companiesApi).then(r => r.json()),
            fetch(rolesApi).then(r => r.json())
        ]);
        
        allUsers = users;
        allCompanies = companies;
        allRoles = roles;
        
        populateFilterSelects();
    } catch (error) {
        console.error('Error loading data:', error);
        showAlert('Error loading data', 'error');
    }
}

// Populate filter dropdowns
function populateFilterSelects() {
    // Filter users
    const filterUserSelect = document.getElementById('filterUserId');
    filterUserSelect.innerHTML = '<option value="">All Users</option>';
    allUsers.forEach(u => {
        const option = document.createElement('option');
        option.value = u.id;
        option.textContent = `${u.username} (${u.loginName || ''})`;
        filterUserSelect.appendChild(option);
    });
    
    // Filter companies
    const filterCompanySelect = document.getElementById('filterCompanyId');
    filterCompanySelect.innerHTML = '<option value="">All Companies</option>';
    allCompanies.forEach(c => {
        const option = document.createElement('option');
        option.value = c.id;
        option.textContent = c.name;
        filterCompanySelect.appendChild(option);
    });
    
    // Filter roles
    const filterRoleSelect = document.getElementById('filterRoleId');
    filterRoleSelect.innerHTML = '<option value="">All Roles</option>';
    allRoles.forEach(r => {
        const option = document.createElement('option');
        option.value = r.id;
        option.textContent = r.name;
        filterRoleSelect.appendChild(option);
    });
    
    // Populate form selects
    populateFormSelects();
}

// Populate form selects for create/edit
function populateFormSelects() {
    // Users
    const userSelect = document.getElementById('userId');
    userSelect.innerHTML = '<option value="">Select user</option>';
    allUsers.forEach(u => {
        const option = document.createElement('option');
        option.value = u.id;
        option.textContent = `${u.username} (${u.loginName || ''})`;
        userSelect.appendChild(option);
    });
    
    // Companies
    const companySelect = document.getElementById('companyId');
    companySelect.innerHTML = '<option value="">Select company (optional for global roles)</option>';
    allCompanies.forEach(c => {
        const option = document.createElement('option');
        option.value = c.id;
        option.textContent = c.name;
        companySelect.appendChild(option);
    });
    
    // Roles
    const roleSelect = document.getElementById('roleId');
    roleSelect.innerHTML = '<option value="">Select role</option>';
    allRoles.forEach(r => {
        const option = document.createElement('option');
        option.value = r.id;
        option.textContent = `${r.name} ${r.company ? `(${r.company.name})` : '(Global)'}`;
        roleSelect.appendChild(option);
    });
}

// Helper functions
function isGlobalUser(user) {
    return !user.companies || user.companies.length === 0;
}

function isGlobalRole(role) {
    return !role.company || role.company.id === null;
}

// Perform search with filters
async function performSearch() {
    try {
        const userId = document.getElementById('filterUserId').value;
        const companyId = document.getElementById('filterCompanyId').value;
        const roleId = document.getElementById('filterRoleId').value;
        
        let url = apiUrl;
        const params = new URLSearchParams();
        if (userId) params.append('userId', userId);
        if (companyId) params.append('companyId', companyId);
        if (roleId) params.append('roleId', roleId);
        
        if (params.toString()) {
            url += '?' + params.toString();
        }
        
        const response = await fetch(url);
        searchResults = await response.json();
        renderSearchResults();
        switchTab('results-tab', null);
    } catch (error) {
        console.error('Error performing search:', error);
        showAlert('Error performing search', 'error');
    }
}

// Render search results table
function renderSearchResults() {
    const tbody = document.getElementById('resultsTableBody');
    
    if (searchResults.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No mappings found</td></tr>';
        return;
    }

    tbody.innerHTML = searchResults.map(mapping => `
        <tr>
            <td><strong>${mapping.id}</strong></td>
            <td>${mapping.user ? mapping.user.username : 'N/A'}</td>
            <td>${mapping.company ? mapping.company.name : 'Global'}</td>
            <td>${mapping.role ? mapping.role.name : 'N/A'}</td>
            <td>
                <button class="btn-primary" onclick="viewMapping(${mapping.id})" style="padding: 6px 12px; font-size: 12px;">View</button>
            </td>
        </tr>
    `).join('');
}

// Reset filters and clear search
function resetFilters() {
    document.getElementById('filterUserId').value = '';
    document.getElementById('filterCompanyId').value = '';
    document.getElementById('filterRoleId').value = '';
    
    searchResults = [];
    renderSearchResults();
    closeDetailsView();
}

// Switch between tabs
function switchTab(tabName, event) {
    if (event) {
        event.preventDefault();
    }
    
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const selectedTab = document.getElementById(tabName);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }
    
    const buttons = document.querySelectorAll('.tab-button');
    buttons.forEach(btn => {
        if (btn.getAttribute('onclick').includes(tabName)) {
            btn.classList.add('active');
        }
    });
}

// Create new mapping form
function createNewMapping() {
    currentEditingMapping = null;
    currentViewingMapping = null;
    
    document.getElementById('formTitle').textContent = 'New Mapping';
    document.getElementById('mappingForm').reset();
    
    document.getElementById('mappingDetailsContainer').style.display = 'none';
    document.getElementById('mappingFormContainer').style.display = 'block';
    
    switchTab('details-tab', null);
}

// Close details view and show form
function closeDetailsView() {
    currentEditingMapping = null;
    currentViewingMapping = null;
    
    document.getElementById('mappingDetailsContainer').style.display = 'none';
    document.getElementById('mappingFormContainer').style.display = 'block';
    document.getElementById('mappingForm').reset();
    document.getElementById('detailsAlert').style.display = 'none';
}

// Setup form submission
function setupFormSubmission() {
    document.getElementById('mappingForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const userId = document.getElementById('userId').value;
        const companyId = document.getElementById('companyId').value;
        const roleId = document.getElementById('roleId').value;
        
        if (!userId || !roleId) {
            showAlert('Please select user and role', 'error', 'detailsAlert');
            return;
        }
        
        // Validation: if user is selected, check if they're global
        const selectedUser = allUsers.find(u => u.id === parseInt(userId));
        const isGlobal = isGlobalUser(selectedUser);
        
        if (!isGlobal && !companyId) {
            showAlert('Please select company for non-global users', 'error', 'detailsAlert');
            return;
        }
        
        const mappingData = {
            userId: parseInt(userId),
            companyId: companyId ? parseInt(companyId) : null,
            roleId: parseInt(roleId)
        };
        
        try {
            let url = apiUrl;
            let method = 'POST';
            
            if (currentEditingMapping) {
                method = 'PUT';
                url += `/${currentEditingMapping.id}`;
                mappingData.id = currentEditingMapping.id;
            }
            
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(mappingData)
            });
            
            if (!response.ok) {
                const error = await response.text();
                showAlert(error || 'Error saving mapping', 'error', 'detailsAlert');
                return;
            }
            
            showAlert('Mapping saved successfully', 'success', 'detailsAlert');
            setTimeout(() => {
                closeDetailsView();
                performSearch();
            }, 1000);
        } catch (error) {
            console.error('Error saving mapping:', error);
            showAlert('Error saving mapping', 'error', 'detailsAlert');
        }
    });
}

// View mapping details
async function viewMapping(id) {
    if (!id) return;
    
    try {
        const response = await fetch(`${apiUrl}/${id}`);
        if (!response.ok) {
            showAlert('Error loading mapping', 'error');
            return;
        }
        
        currentViewingMapping = await response.json();
        
        const detailsHtml = `
            <div class="details-grid">
                <div class="details-item">
                    <strong>User</strong>
                    <div class="details-item-value">${currentViewingMapping.user ? currentViewingMapping.user.username : 'N/A'}</div>
                </div>
                <div class="details-item">
                    <strong>Company</strong>
                    <div class="details-item-value">${currentViewingMapping.company ? currentViewingMapping.company.name : 'Global'}</div>
                </div>
                <div class="details-item" style="grid-column: 1 / -1;">
                    <strong>Role</strong>
                    <div class="details-item-value">${currentViewingMapping.role ? currentViewingMapping.role.name : 'N/A'}</div>
                </div>
            </div>
        `;
        
        document.getElementById('mappingDetails').innerHTML = detailsHtml;
        document.getElementById('mappingDetailsTitle').textContent = `Mapping #${currentViewingMapping.id}`;
        
        document.getElementById('mappingDetailsContainer').style.display = 'block';
        document.getElementById('mappingFormContainer').style.display = 'none';
        switchTab('details-tab', null);
    } catch (error) {
        console.error('Error viewing mapping:', error);
        showAlert('Error loading mapping', 'error');
    }
}

// Edit mapping
function editMapping() {
    if (!currentViewingMapping) return;
    
    currentEditingMapping = currentViewingMapping;
    
    document.getElementById('formTitle').textContent = 'Edit Mapping';
    document.getElementById('userId').value = currentViewingMapping.user ? currentViewingMapping.user.id : '';
    document.getElementById('companyId').value = currentViewingMapping.company ? currentViewingMapping.company.id : '';
    document.getElementById('roleId').value = currentViewingMapping.role ? currentViewingMapping.role.id : '';
    
    document.getElementById('mappingDetailsContainer').style.display = 'none';
    document.getElementById('mappingFormContainer').style.display = 'block';
}

// Delete mapping with confirmation
function deleteMappingConfirm() {
    if (!currentViewingMapping) return;
    if (!confirm('Are you sure you want to delete this mapping?')) return;
    
    deleteMapping(currentViewingMapping.id);
}

// Delete mapping
async function deleteMapping(id) {
    try {
        const response = await fetch(`${apiUrl}/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showAlert('Mapping deleted successfully', 'success', 'detailsAlert');
            setTimeout(() => {
                closeDetailsView();
                performSearch();
            }, 1000);
        } else {
            const error = await response.text();
            showAlert(error || 'Error deleting mapping', 'error', 'detailsAlert');
        }
    } catch (error) {
        console.error('Error deleting mapping:', error);
        showAlert('Error deleting mapping', 'error', 'detailsAlert');
    }
}

// Helper functions
function showAlert(message, type, alertId = 'alert') {
    const alertEl = document.getElementById(alertId);
    alertEl.className = `alert alert-${type === 'success' ? 'success' : 'danger'}`;
    alertEl.textContent = message;
    alertEl.style.display = 'block';
    setTimeout(() => alertEl.style.display = 'none', 5000);
}

function getAuthToken() {
    return localStorage.getItem('jwtToken') || (JSON.parse(localStorage.getItem('loginResponse')||'{}').token || '');
}

async function logout() {
    try {
        localStorage.removeItem('jwtToken');
        localStorage.removeItem('loginResponse');
        window.location.href = '/login.html';
    } catch (error) {
        console.error('Error logging out:', error);
    }
}
