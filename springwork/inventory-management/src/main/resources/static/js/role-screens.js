// Role Screens Management - Assign/Unassign screens to roles

const roleApi = '/roles';
const companyApi = '/companies';
const groupApi = '/screen-groups';
const screenApi = '/screens';
const roleScreenApi = '/role-screens';

const companySelect = document.getElementById('companyId');
const roleSelect = document.getElementById('roleId');
const loadBtn = document.getElementById('loadBtn');
const screensList = document.getElementById('screensList');
const emptyDetails = document.getElementById('emptyDetails');
const groupsContainer = document.getElementById('groupsContainer');
const assignBtn = document.getElementById('assignBtn');
const unassignBtn = document.getElementById('unassignBtn');
const alertEl = document.getElementById('alert');
const resultsTableBody = document.getElementById('resultsTableBody');

let allRoles = [];
let companies = [];
let currentSelectedRoleId = null;

// Switch between tabs
function switchTab(tabId, event) {
    event.preventDefault();
    
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active class from all tab buttons
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    const selectedTab = document.getElementById(tabId);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }
    
    // Add active class to clicked button
    event.target.classList.add('active');
}

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

// Get authentication token from localStorage
function getAuthToken() {
    return localStorage.getItem('jwtToken') || (JSON.parse(localStorage.getItem('loginResponse')||'{}').token || '');
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

// Show alert message
function showAlert(message, type = 'success') {
    alertEl.textContent = message;
    alertEl.className = `alert show ${type}`;
    setTimeout(() => alertEl.classList.remove('show'), 4000);
}

// Load all companies into dropdown
async function loadCompanies() {
    try {
        const res = await fetch(companyApi);
        companies = await res.json();
        companySelect.innerHTML = '<option value="">All Companies (Global Roles)</option>';
        companies.forEach(c => companySelect.innerHTML += `<option value="${c.id}">${c.name}</option>`);
    } catch (err) {
        console.error('Error loading companies:', err);
        showAlert('Error loading companies', 'error');
    }
}

// Load all roles into memory
async function loadRoles() {
    try {
        const res = await fetch(roleApi);
        allRoles = await res.json();
        updateRoleSelect();
    } catch (err) {
        console.error('Error loading roles:', err);
        showAlert('Error loading roles', 'error');
    }
}

// Update role dropdown based on selected company
function updateRoleSelect() {
    const companyId = companySelect.value;
    let filteredRoles = [];
    
    if (!companyId) {
        filteredRoles = allRoles.filter(r => !r.company || r.company.id === null);
    } else {
        filteredRoles = allRoles.filter(r => 
            !r.company || r.company.id === null || r.company.id === parseInt(companyId)
        );
    }
    
    roleSelect.innerHTML = '<option value="">Select Role</option>';
    filteredRoles.forEach(r => {
        const companyInfo = r.company ? ` (${r.company.name})` : ' (Global)';
        roleSelect.innerHTML += `<option value="${r.id}">${r.name}${companyInfo}</option>`;
    });
}

// Load screen groups and their screens
async function loadGroups() {
    try {
        const res = await fetch(groupApi);
        const groups = await res.json();
        groupsContainer.innerHTML = '';
        
        for (const g of groups) {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'screen-group';
            groupDiv.innerHTML = `<h5>${g.name}</h5><div id="group-${g.id}"></div>`;
            groupsContainer.appendChild(groupDiv);
            
            const screensRes = await fetch(`${screenApi}?groupId=${g.id}`);
            const screens = await screensRes.json();
            const groupNode = document.getElementById(`group-${g.id}`);
            screens.forEach(s => {
                const checkbox = document.createElement('div');
                checkbox.className = 'form-check';
                checkbox.innerHTML = `<input class="form-check-input screen-check" type="checkbox" data-id="${s.id}" id="screen-${s.id}"><label class="form-check-label" for="screen-${s.id}">${s.name} (${s.path || ''})</label>`;
                groupNode.appendChild(checkbox);
            });
        }
        
        const allScreensRes = await fetch(screenApi);
        const allScreens = await allScreensRes.json();
        const ungroupedScreens = allScreens.filter(s => !s.group);
        if (ungroupedScreens.length > 0) {
            const ungroupedDiv = document.createElement('div');
            ungroupedDiv.className = 'screen-group';
            ungroupedDiv.innerHTML = `<h5>Ungrouped</h5><div id="group-ungrouped"></div>`;
            groupsContainer.appendChild(ungroupedDiv);
            const ungroupedNode = document.getElementById('group-ungrouped');
            ungroupedScreens.forEach(s => {
                const checkbox = document.createElement('div');
                checkbox.className = 'form-check';
                checkbox.innerHTML = `<input class="form-check-input screen-check" type="checkbox" data-id="${s.id}" id="screen-${s.id}"><label class="form-check-label" for="screen-${s.id}">${s.name} (${s.path || ''})</label>`;
                ungroupedNode.appendChild(checkbox);
            });
        }
    } catch (err) {
        console.error('Error loading groups:', err);
        showAlert('Error loading screens', 'error');
    }
}

// Load screens already assigned to the selected role
async function loadAssigned(roleId) {
    try {
        const res = await fetch(`/role-screens/screens?roleId=${roleId}`);
        const assigned = await res.json();
        document.querySelectorAll('.screen-check').forEach(cb => cb.checked = false);
        assigned.forEach(s => {
            const cb = document.querySelector(`.screen-check[data-id='${s.id}']`);
            if (cb) cb.checked = true;
        });
    } catch (err) {
        console.error('Error loading assigned screens:', err);
        showAlert('Error loading assigned screens', 'error');
    }
}

// Event Listeners
companySelect.addEventListener('change', updateRoleSelect);

loadBtn.addEventListener('click', async () => {
    const companyId = companySelect.value;
    const roleId = roleSelect.value;
    
    if (!roleId) {
        showAlert('Please select a role', 'error');
        return;
    }
    
    // Filter roles based on search criteria
    let filteredRoles = allRoles;
    if (companyId) {
        filteredRoles = filteredRoles.filter(r => 
            r.company && r.company.id === parseInt(companyId)
        );
    } else {
        filteredRoles = filteredRoles.filter(r => !r.company || r.company.id === null);
    }
    
    // Filter by selected role
    filteredRoles = filteredRoles.filter(r => r.id === parseInt(roleId));
    
    // Display results in table
    displayResults(filteredRoles);
    
    // Switch to results tab
    switchToTab('results-tab');
});

// Display results in table
function displayResults(roles) {
    resultsTableBody.innerHTML = '';
    
    if (roles.length === 0) {
        resultsTableBody.innerHTML = '<tr><td colspan="3" class="empty-state">No roles found</td></tr>';
        return;
    }
    
    roles.forEach(role => {
        const companyName = role.company ? role.company.name : 'Global';
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${companyName}</td>
            <td>${role.name}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-primary" style="padding: 6px 12px; font-size: 12px;" onclick="editRole(${role.id}, '${role.name}', '${companyName}')">Edit Screens</button>
                </div>
            </td>
        `;
        resultsTableBody.appendChild(row);
    });
}

// Switch to a specific tab
function switchToTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const selectedTab = document.getElementById(tabId);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }
    
    const tabName = tabId.replace('-tab', '').charAt(0).toUpperCase() + tabId.replace('-tab', '').slice(1);
    const buttons = Array.from(document.querySelectorAll('.tab-button'));
    const button = buttons.find(btn => btn.textContent.includes(tabName) || btn.textContent.trim() === tabName.charAt(0).toUpperCase() + tabName.slice(1));
    if (button) button.classList.add('active');
}

// Edit role - load screens for assignment
async function editRole(roleId, roleName, companyName) {
    currentSelectedRoleId = roleId;
    document.getElementById('detailsTitle').textContent = `Assign Screens - ${roleName} (${companyName})`;
    screensList.style.display = 'block';
    emptyDetails.style.display = 'none';
    
    await loadGroups();
    await loadAssigned(roleId);
    
    switchToTab('details-tab');
}

// Close details view
function closeDetails() {
    screensList.style.display = 'none';
    emptyDetails.style.display = 'block';
    currentSelectedRoleId = null;
    switchToTab('results-tab');
}

assignBtn.addEventListener('click', async () => {
    const roleId = currentSelectedRoleId;
    if (!roleId) {
        showAlert('Please select a role', 'error');
        return;
    }
    
    const checked = Array.from(document.querySelectorAll('.screen-check:checked')).map(cb => cb.getAttribute('data-id'));
    
    try {
        for (const screenId of checked) {
            const resCheck = await fetch(`/role-screens?roleId=${roleId}`);
            const rs = await resCheck.json();
            const assignedIds = rs.map(r => r.screen.id);
            if (assignedIds.includes(parseInt(screenId))) continue;
            
            await fetch(roleScreenApi, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: { id: roleId }, screen: { id: screenId } })
            });
        }
        showAlert('Screens assigned successfully', 'success');
        await loadAssigned(roleId);
    } catch (err) {
        console.error('Error assigning screens:', err);
        showAlert('Error assigning screens', 'error');
    }
});

unassignBtn.addEventListener('click', async () => {
    const roleId = currentSelectedRoleId;
    if (!roleId) {
        showAlert('Please select a role', 'error');
        return;
    }
    
    const checked = Array.from(document.querySelectorAll('.screen-check:checked')).map(cb => cb.getAttribute('data-id'));
    
    try {
        for (const screenId of checked) {
            await fetch(`/role-screens?roleId=${roleId}&screenId=${screenId}`, { method: 'DELETE' });
        }
        showAlert('Screens unassigned successfully', 'success');
        await loadAssigned(roleId);
    } catch (err) {
        console.error('Error unassigning screens:', err);
        showAlert('Error unassigning screens', 'error');
    }
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    loadHeaderMenu();
    loadUserInfo();
    loadCompanies();
    loadRoles();
});
