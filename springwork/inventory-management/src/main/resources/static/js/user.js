// Global state
let searchResults = [];
let currentEditingUser = null;
let currentViewingUser = null;

// API endpoints
const apiUrl = '/users';
const companyApiUrl = '/companies';

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    loadHeaderMenu();
    loadUserInfo();
    loadCompanies();
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
                // Try to get roleScreens from dashboardData
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
        /*
        if (userRoleId) {
			alert(headerScreens.length);
            headerScreens = headerScreens.filter(s => {
                if (!s.roleScreens) return false;
                return s.roleScreens.some(rs => rs.role && rs.role.id === userRoleId);
            });
            
        }*/
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

// Load companies for dropdown
async function loadCompanies() {
    try {
        const userId = getUserIdFromToken();
        if (!userId) {
            console.error('User ID not found in token');
            return;
        }
        
        let companies = [];
        
        // Try to load user-specific companies
        try {
            const response = await fetch(`/users/${userId}/companies`);
            if (response.ok) {
                companies = await response.json();
            }
        } catch (e) {
            console.log('Error loading user companies:', e);
        }
        
        // If no companies found, check if user is global admin and load all companies
        if (!companies || companies.length === 0) {
            try {
                const response = await fetch(companyApiUrl);
                if (response.ok) {
                    companies = await response.json();
                }
            } catch (e) {
                console.log('Error loading all companies:', e);
            }
        }
        
        const companySelect = document.getElementById('companyId');
        const searchCompanySelect = document.getElementById('searchCompanyId');
        
        // Clear existing options except the first one
        while (companySelect.options.length > 1) {
            companySelect.remove(1);
        }
        while (searchCompanySelect.options.length > 1) {
            searchCompanySelect.remove(1);
        }
        
        companies.forEach(company => {
            const option1 = document.createElement('option');
            option1.value = company.id;
            option1.textContent = company.name;
            companySelect.appendChild(option1);
            
            const option2 = document.createElement('option');
            option2.value = company.id;
            option2.textContent = company.name;
            searchCompanySelect.appendChild(option2);
        });
    } catch (error) {
        console.error('Error loading companies:', error);
        showAlert('Error loading companies', 'error');
    }
}

// Perform search with filters
async function performSearch() {
    try {
        const username = document.getElementById('searchUsername').value;
        const loginName = document.getElementById('searchLoginName').value;
        const email = document.getElementById('searchEmail').value;
        const companyId = document.getElementById('searchCompanyId').value;
        
        let url = apiUrl;
        const params = new URLSearchParams();
        if (username) params.append('username', username);
        if (loginName) params.append('loginName', loginName);
        if (email) params.append('email', email);
        if (companyId) params.append('companyId', companyId);
        
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
    const tbody = document.getElementById('usersTableBody');
    
    if (searchResults.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No users found</td></tr>';
        return;
    }

    tbody.innerHTML = searchResults.map(user => `
        <tr>
            <td><strong>${user.id}</strong></td>
            <td>${user.username}</td>
            <td>${user.loginName || 'N/A'}</td>
            <td>${user.email || 'N/A'}</td>
            <td>${user.companies ? user.companies.map(c => c.name).join(', ') : 'N/A'}</td>
            <td>
                <button class="btn-primary" onclick="viewUser(${user.id})" style="padding: 6px 12px; font-size: 12px;">View</button>
            </td>
        </tr>
    `).join('');
}

// Reset filters and clear search
function resetFilters() {
    document.getElementById('searchUsername').value = '';
    document.getElementById('searchLoginName').value = '';
    document.getElementById('searchEmail').value = '';
    document.getElementById('searchCompanyId').value = '';
    
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

// Create new user form
function createNewUser() {
    currentEditingUser = null;
    currentViewingUser = null;
    
    document.getElementById('formTitle').textContent = 'New User';
    document.getElementById('userForm').reset();
    
    document.getElementById('userDetailsContainer').style.display = 'none';
    document.getElementById('userFormContainer').style.display = 'block';
    
    switchTab('details-tab', null);
}

// Close details view and show form
function closeDetailsView() {
    currentEditingUser = null;
    currentViewingUser = null;
    
    document.getElementById('userDetailsContainer').style.display = 'none';
    document.getElementById('userFormContainer').style.display = 'block';
    document.getElementById('userForm').reset();
    document.getElementById('detailsAlert').style.display = 'none';
}

// Setup form submission
function setupFormSubmission() {
    document.getElementById('userForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const loginName = document.getElementById('loginName').value;
        const password = document.getElementById('password').value;
        const email = document.getElementById('email').value;
        const selected = Array.from(document.getElementById('companyId').selectedOptions).map(o => ({ id: o.value }));
        
        if (!username || !loginName || !password || !email) {
            showAlert('Please fill all required fields', 'error', 'detailsAlert');
            return;
        }
        
        const userData = {
            username: username,
            loginName: loginName,
            password: password,
            email: email,
            companies: selected
        };
        
        try {
            let url = apiUrl;
            let method = 'POST';
            
            if (currentEditingUser) {
                method = 'PUT';
                url += `/${currentEditingUser.id}`;
                userData.id = currentEditingUser.id;
            }
            
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });
            
            if (!response.ok) {
                const error = await response.text();
                showAlert(error || 'Error saving user', 'error', 'detailsAlert');
                return;
            }
            
            showAlert('User saved successfully', 'success', 'detailsAlert');
            setTimeout(() => {
                closeDetailsView();
                performSearch();
            }, 1000);
        } catch (error) {
            console.error('Error saving user:', error);
            showAlert('Error saving user', 'error', 'detailsAlert');
        }
    });
}

// View user details
async function viewUser(id) {
    if (!id) return;
    
    try {
        const response = await fetch(`${apiUrl}/${id}`);
        if (!response.ok) {
            showAlert('Error loading user', 'error');
            return;
        }
        
        currentViewingUser = await response.json();
        
        const detailsHtml = `
            <div class="details-grid">
                <div class="details-item">
                    <strong>Username</strong>
                    <div class="details-item-value">${currentViewingUser.username}</div>
                </div>
                <div class="details-item">
                    <strong>Login Name</strong>
                    <div class="details-item-value">${currentViewingUser.loginName || 'N/A'}</div>
                </div>
                <div class="details-item">
                    <strong>Email</strong>
                    <div class="details-item-value">${currentViewingUser.email || 'N/A'}</div>
                </div>
                <div class="details-item">
                    <strong>Companies</strong>
                    <div class="details-item-value">${currentViewingUser.companies ? currentViewingUser.companies.map(c => c.name).join(', ') : 'N/A'}</div>
                </div>
            </div>
        `;
        
        document.getElementById('userDetails').innerHTML = detailsHtml;
        document.getElementById('userDetailsTitle').textContent = currentViewingUser.username;
        
        document.getElementById('userDetailsContainer').style.display = 'block';
        document.getElementById('userFormContainer').style.display = 'none';
        switchTab('details-tab', null);
    } catch (error) {
        console.error('Error viewing user:', error);
        showAlert('Error loading user', 'error');
    }
}

// Edit user
function editUser() {
    if (!currentViewingUser) return;
    
    currentEditingUser = currentViewingUser;
    
    document.getElementById('formTitle').textContent = 'Edit User';
    document.getElementById('username').value = currentViewingUser.username;
    document.getElementById('loginName').value = currentViewingUser.loginName || '';
    document.getElementById('password').value = '';
    document.getElementById('email').value = currentViewingUser.email || '';
    
    // Set multiple selected companies
    const opts = document.getElementById('companyId').options;
    for (let i = 0; i < opts.length; i++) {
        opts[i].selected = false;
    }
    if (currentViewingUser.companies) {
        currentViewingUser.companies.forEach(c => {
            for (let i = 0; i < opts.length; i++) {
                if (opts[i].value == c.id) opts[i].selected = true;
            }
        });
    }
    
    document.getElementById('userDetailsContainer').style.display = 'none';
    document.getElementById('userFormContainer').style.display = 'block';
}

// Delete user with confirmation
function deleteUserConfirm() {
    if (!currentViewingUser) return;
    if (!confirm(`Are you sure you want to delete user "${currentViewingUser.username}"?`)) return;
    
    deleteUser(currentViewingUser.id);
}

// Delete user
async function deleteUser(id) {
    try {
        const response = await fetch(`${apiUrl}/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showAlert('User deleted successfully', 'success', 'detailsAlert');
            setTimeout(() => {
                closeDetailsView();
                performSearch();
            }, 1000);
        } else {
            const error = await response.text();
            showAlert(error || 'Error deleting user', 'error', 'detailsAlert');
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        showAlert('Error deleting user', 'error', 'detailsAlert');
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

function getUserIdFromToken() {
    try {
       const token = getAuthToken();
        if (!token) return null;
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.sub || payload.userId;
    } catch (error) {
        console.error('Error getting user ID from token:', error);
        return null;
    }
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
