// Global state
let allCategories = [];
let searchResults = [];
let currentEditingCategory = null;
let currentViewingCategory = null;

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
                console.log('Loaded roleId from token:', roleId);
            } catch (e) {
                console.warn('Failed to parse token:', e);
            }
        }
        
        let screens = [];
        let userRoleId = roleId;
        
        // Try fetching from dashboard load endpoint
        try {
            let url = '/api/dashboard/load';
            if (roleId) {
                url += `?roleId=${encodeURIComponent(roleId)}`;
            }
            console.log('Attempting to load from:', url);
            let res = await fetch(url);
            if (res.ok) {
                const result = await res.json();
                if (result.success && result.data) {
                    // Use roleScreens from dashboard service response
                    screens = result.data.roleScreens || result.data.screens || result.data.menus || [];
                    console.log('Loaded screens from /api/dashboard/load:', screens.length);
                } else if (Array.isArray(result)) {
                    screens = result;
                    console.log('Loaded screens as array:', screens.length);
                }
            }
        } catch (e) {
            console.warn('Failed to load from /api/dashboard/load:', e);
        }
        
        // Fallback to dashboard/screens
        if (!screens.length) {
            try {
                console.log('Trying fallback: /api/dashboard/screens');
                let fallbackRes = await fetch('/api/dashboard/screens');
                if (fallbackRes.ok) {
                    screens = await fallbackRes.json();
                    console.log('Loaded screens from /api/dashboard/screens:', screens.length);
                }
            } catch (e) {
                console.warn('Failed to load from /api/dashboard/screens:', e);
            }
        }
        
        // Fallback to screens endpoint
        if (!screens.length) {
            try {
                console.log('Trying fallback: /screens');
                let fallbackRes = await fetch('/screens');
                if (fallbackRes.ok) {
                    screens = await fallbackRes.json();
                    console.log('Loaded screens from /screens:', screens.length);
                }
            } catch (e) {
                console.warn('Failed to load from /screens:', e);
            }
        }
        
        console.log('Total screens loaded:', screens.length, screens);
        
        // Filter by display type - the backend returns displayType as a string (e.g., "D", "HD")
        let headerScreens = screens.filter(s => {
            if (!s) return false;
            // displayType could be nested or a string
            const displayType = (s.displayType && typeof s.displayType === 'object') 
                ? s.displayType.name || s.displayType 
                : s.displayType;
            const isHeaderDisplay = displayType === 'D' || displayType === 'HD';
            console.log('Screen:', s.name || s.screenName || s.path, 'displayType:', displayType, 'isHeader:', isHeaderDisplay);
            return isHeaderDisplay;
        });
        
        console.log('Header screens after filter:', headerScreens.length);
        
        // No need to filter by role again - backend already did this
        
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
        
        console.log('Screen groups:', Array.from(groups.keys()));
        
        for (const [grpKey, items] of groups) {
            if (grpKey === 'nogroup::') {
                items.forEach(screen => {
                    const li = document.createElement('li');
                    li.className = 'nav-item';
                    const href = screen.href || screen.path || '#';
                    const displayName = screen.screenName || screen.name || 'Menu Item';
                    li.innerHTML = `<a class="nav-link" href="${href}">${displayName}</a>`;
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
                const a = document.createElement('a');
                a.className = 'dropdown-item';
                a.href = screen.href || screen.path || '#';
                a.textContent = screen.screenName || screen.name || 'Menu Item';
                ul.appendChild(a);
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

// Load companies for dropdown
async function loadCompanies() {
    try {
        const userId = getUserIdFromToken();
        if (!userId) {
            showAlert('User information not available', 'error');
            return;
        }
        
        const response = await fetch(`/users/${userId}/companies`);
        const companies = await response.json();
        
        let userCompanyId = getCompanyIdFromToken();
        
        const companySelects = document.querySelectorAll('#categoryCompany, #companyFilter');
        companySelects.forEach(select => {
            while (select.firstChild) select.removeChild(select.firstChild);
            
            const optionPlaceholder = document.createElement('option');
            optionPlaceholder.value = '';
            optionPlaceholder.textContent = 'Select a company';
            select.appendChild(optionPlaceholder);

            companies.forEach(company => {
                const option = document.createElement('option');
                option.value = company.id;
                option.textContent = company.name;
                select.appendChild(option);
                if (userCompanyId && userCompanyId == company.id) {
                    option.selected = true;
                }
            });
        });
    } catch (error) {
        console.error('Error loading companies:', error);
        showAlert('Error loading companies', 'error');
    }
}

// Perform search with filters
async function performSearch() {
    try {
        const companyId = document.getElementById('companyFilter').value;
        const nameFilter = document.getElementById('nameFilter').value;
        
        if (!companyId) {
            showAlert('Please select a company to search.', 'error');
            document.getElementById('companyFilter').focus();
            return;
        }

        let url = `/api/product-categories/company/${companyId}`;
        if (nameFilter) {
            url += `/search?search=${encodeURIComponent(nameFilter)}`;
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
        tbody.innerHTML = '<tr><td colspan="4" class="empty-state">No categories found</td></tr>';
        return;
    }

    tbody.innerHTML = searchResults.map(category => `
        <tr>
            <td><strong>${category.name}</strong></td>
            <td>${category.description || 'N/A'}</td>
            <td>${category.company?.name || 'N/A'}</td>
            <td>
                <button class="btn-primary" onclick="viewCategory(${category.id})" style="padding: 6px 12px; font-size: 12px;">View</button>
            </td>
        </tr>
    `).join('');
}

// Reset filters and clear search
function resetFilters() {
    const userCompanyId = getCompanyIdFromToken();
    const companyFilter = document.getElementById('companyFilter');
    if (userCompanyId && companyFilter) {
        companyFilter.value = userCompanyId;
    }
    document.getElementById('nameFilter').value = '';
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

// Create new category form
function createNewCategory() {
    currentEditingCategory = null;
    currentViewingCategory = null;
    
    document.getElementById('formTitle').textContent = 'New Product Category';
    document.getElementById('categoryForm').reset();
    
    const userCompanyId = getCompanyIdFromToken();
    if (userCompanyId) {
        document.getElementById('categoryCompany').value = userCompanyId;
    }
    
    document.getElementById('categoryDetailsContainer').style.display = 'none';
    document.getElementById('categoryFormContainer').style.display = 'block';
    
    switchTab('details-tab', null);
}

// Close details view and show form
function closeDetailsView() {
    currentEditingCategory = null;
    currentViewingCategory = null;
    
    document.getElementById('categoryDetailsContainer').style.display = 'none';
    document.getElementById('categoryFormContainer').style.display = 'block';
    document.getElementById('categoryForm').reset();
}

// Setup form submission
function setupFormSubmission() {
    document.getElementById('categoryForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const companyId = document.getElementById('categoryCompany').value;
        const name = document.getElementById('categoryName').value;
        const description = document.getElementById('categoryDescription').value;
        
        if (!companyId || !name) {
            showAlert('Please fill all required fields', 'error');
            return;
        }
        
        const categoryData = {
            company: { id: companyId },
            name: name,
            description: description
        };
        
        try {
            let response;
            if (currentEditingCategory) {
                response = await fetch(`/api/product-categories/${currentEditingCategory.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(categoryData)
                });
            } else {
                response = await fetch('/api/product-categories', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(categoryData)
                });
            }
            
            if (response.ok) {
                showAlert(currentEditingCategory ? 'Category updated successfully' : 'Category created successfully', 'success');
                closeDetailsView();
                resetFilters();
            } else {
                let errorMessage = 'Error saving category';
                const contentType = response.headers.get('content-type');
                
                try {
                    if (contentType && contentType.includes('application/json')) {
                        const errorData = await response.json();
                        errorMessage = errorData.message || errorMessage;
                    } else {
                        errorMessage = await response.text();
                    }
                } catch (parseError) {
                    console.error('Error parsing response:', parseError);
                }
                
                showAlert(errorMessage, 'error');
            }
        } catch (error) {
            console.error('Error saving category:', error);
            showAlert('Error saving category', 'error');
        }
    });
}

// View category details
async function viewCategory(id) {
    if (!id) return;
    
    try {
        const response = await fetch(`/api/product-categories/${id}`);
        if (!response.ok) {
            showAlert('Category not found', 'error');
            return;
        }
        
        currentViewingCategory = await response.json();
        
        // Build details HTML
        const detailsHtml = `
            <div class="details-grid">
                <div class="details-item">
                    <strong>Name</strong>
                    <div class="details-item-value">${currentViewingCategory.name}</div>
                </div>
                <div class="details-item">
                    <strong>Company</strong>
                    <div class="details-item-value">${currentViewingCategory.company?.name || 'N/A'}</div>
                </div>
                <div class="details-item" style="grid-column: 1 / -1;">
                    <strong>Description</strong>
                    <div class="details-item-value">${currentViewingCategory.description || 'N/A'}</div>
                </div>
            </div>
        `;
        
        document.getElementById('categoryDetails').innerHTML = detailsHtml;
        document.getElementById('categoryDetailsTitle').textContent = currentViewingCategory.name;
        
        document.getElementById('categoryDetailsContainer').style.display = 'block';
        document.getElementById('categoryFormContainer').style.display = 'none';
        switchTab('details-tab', null);
    } catch (error) {
        console.error('Error viewing category:', error);
        showAlert('Error loading category', 'error');
    }
}

// Edit category
function editCategory() {
    if (!currentViewingCategory) return;
    
    currentEditingCategory = currentViewingCategory;
    
    document.getElementById('formTitle').textContent = 'Edit Product Category';
    document.getElementById('categoryCompany').value = currentViewingCategory.company?.id || '';
    document.getElementById('categoryName').value = currentViewingCategory.name;
    document.getElementById('categoryDescription').value = currentViewingCategory.description || '';
    
    document.getElementById('categoryDetailsContainer').style.display = 'none';
    document.getElementById('categoryFormContainer').style.display = 'block';
}

// Delete category
async function deleteCategory() {
    if (!currentViewingCategory) return;
    if (!confirm('Are you sure you want to delete this category?')) return;
    
    try {
        const response = await fetch(`/api/product-categories/${currentViewingCategory.id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showAlert('Category deleted successfully', 'success');
            closeDetailsView();
            resetFilters();
        } else {
            showAlert('Error deleting category', 'error');
        }
    } catch (error) {
        console.error('Error deleting category:', error);
        showAlert('Error deleting category', 'error');
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
        console.error('Error extracting user ID from token:', error);
        return null;
    }
}

function getCompanyIdFromToken() {
    try {
        const token = getAuthToken();
        if (!token) return null;
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.tenantId) {
            return payload.tenantId;
        }
        return null;
    } catch (error) {
        console.error('Error extracting company ID from token:', error);
        return null;
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
