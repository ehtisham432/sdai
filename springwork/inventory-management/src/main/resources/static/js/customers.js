// Global state
let allCustomers = [];
let searchResults = [];
let currentEditingCustomer = null;
let currentViewingCustomer = null;

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
                screens = result.data.screens || [];
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
        if (userRoleId) {
            headerScreens = headerScreens.filter(s => {
                if (!s.roleScreens) return false;
                return s.roleScreens.some(rs => rs.role && rs.role.id === userRoleId);
            });
        }
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
                    li.innerHTML = `<a class="nav-link" href="${screen.href || '#'}">${screen.screenName || screen.name}</a>`;
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
                a.href = screen.href || '#';
                a.textContent = screen.screenName || screen.name;
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
        
        const companySelects = document.querySelectorAll('#customerCompany, #companyFilter');
        companySelects.forEach(select => {
            while (select.firstChild) select.removeChild(select.firstChild);
            
            if (select.id === 'companyFilter') {
                const optionPlaceholder = document.createElement('option');
                optionPlaceholder.value = '';
                optionPlaceholder.textContent = 'Select a company';
                select.appendChild(optionPlaceholder);
            } else {
                const optionPlaceholder = document.createElement('option');
                optionPlaceholder.value = '';
                optionPlaceholder.textContent = 'Select a company';
                select.appendChild(optionPlaceholder);
            }

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

        let url = `/api/customers/company/${companyId}`;
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
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No customers found</td></tr>';
        return;
    }

    tbody.innerHTML = searchResults.map(customer => `
        <tr>
            <td><strong>${customer.name}</strong></td>
            <td>${customer.email || 'N/A'}</td>
            <td>${customer.phone || 'N/A'}</td>
            <td>${customer.city || 'N/A'}</td>
            <td>
                <button class="btn-primary" onclick="viewCustomer(${customer.id})" style="padding: 6px 12px; font-size: 12px;">View</button>
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

// Create new customer form
function createNewCustomer() {
    currentEditingCustomer = null;
    currentViewingCustomer = null;
    
    document.getElementById('formTitle').textContent = 'New Customer';
    document.getElementById('customerForm').reset();
    
    const userCompanyId = getCompanyIdFromToken();
    if (userCompanyId) {
        document.getElementById('customerCompany').value = userCompanyId;
    }
    
    document.getElementById('customerDetailsContainer').style.display = 'none';
    document.getElementById('customerFormContainer').style.display = 'block';
    
    switchTab('details-tab', null);
}

// Close details view and show form
function closeDetailsView() {
    currentEditingCustomer = null;
    currentViewingCustomer = null;
    
    document.getElementById('customerDetailsContainer').style.display = 'none';
    document.getElementById('customerFormContainer').style.display = 'block';
    document.getElementById('customerForm').reset();
}

// Setup form submission
function setupFormSubmission() {
    document.getElementById('customerForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const companyId = document.getElementById('customerCompany').value;
        const name = document.getElementById('customerName').value;
        const email = document.getElementById('customerEmail').value;
        const phone = document.getElementById('customerPhone').value;
        const address = document.getElementById('customerAddress').value;
        const city = document.getElementById('customerCity').value;
        const state = document.getElementById('customerState').value;
        const zipCode = document.getElementById('customerZipCode').value;
        const country = document.getElementById('customerCountry').value;
        const notes = document.getElementById('customerNotes').value;
        
        if (!companyId || !name) {
            showAlert('Please fill all required fields', 'error');
            return;
        }
        
        const customerData = {
            company: { id: companyId },
            name: name,
            email: email,
            phone: phone,
            address: address,
            city: city,
            state: state,
            zipCode: zipCode,
            country: country,
            notes: notes
        };
        
        try {
            let response;
            if (currentEditingCustomer) {
                response = await fetch(`/api/customers/${currentEditingCustomer.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(customerData)
                });
            } else {
                response = await fetch('/api/customers', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(customerData)
                });
            }
            
            if (response.ok) {
                showAlert(currentEditingCustomer ? 'Customer updated successfully' : 'Customer created successfully', 'success');
                closeDetailsView();
                resetFilters();
            } else {
                const errorData = await response.json();
                showAlert(errorData.message || 'Error saving customer', 'error');
            }
        } catch (error) {
            console.error('Error saving customer:', error);
            showAlert('Error saving customer', 'error');
        }
    });
}

// View customer details
async function viewCustomer(id) {
    if (!id) return;
    
    try {
        const response = await fetch(`/api/customers/${id}`);
        if (!response.ok) {
            showAlert('Customer not found', 'error');
            return;
        }
        
        currentViewingCustomer = await response.json();
        
        // Build details HTML
        const detailsHtml = `
            <div class="details-grid">
                <div class="details-item">
                    <strong>Name</strong>
                    <div class="details-item-value">${currentViewingCustomer.name}</div>
                </div>
                <div class="details-item">
                    <strong>Email</strong>
                    <div class="details-item-value">${currentViewingCustomer.email || 'N/A'}</div>
                </div>
                <div class="details-item">
                    <strong>Phone</strong>
                    <div class="details-item-value">${currentViewingCustomer.phone || 'N/A'}</div>
                </div>
                <div class="details-item">
                    <strong>Address</strong>
                    <div class="details-item-value">${currentViewingCustomer.address || 'N/A'}</div>
                </div>
                <div class="details-item">
                    <strong>City</strong>
                    <div class="details-item-value">${currentViewingCustomer.city || 'N/A'}</div>
                </div>
                <div class="details-item">
                    <strong>State/Province</strong>
                    <div class="details-item-value">${currentViewingCustomer.state || 'N/A'}</div>
                </div>
                <div class="details-item">
                    <strong>Zip Code</strong>
                    <div class="details-item-value">${currentViewingCustomer.zipCode || 'N/A'}</div>
                </div>
                <div class="details-item">
                    <strong>Country</strong>
                    <div class="details-item-value">${currentViewingCustomer.country || 'N/A'}</div>
                </div>
                <div class="details-item" style="grid-column: 1 / -1;">
                    <strong>Notes</strong>
                    <div class="details-item-value">${currentViewingCustomer.notes || 'N/A'}</div>
                </div>
            </div>
        `;
        
        document.getElementById('customerDetails').innerHTML = detailsHtml;
        document.getElementById('customerDetailsTitle').textContent = currentViewingCustomer.name;
        
        document.getElementById('customerDetailsContainer').style.display = 'block';
        document.getElementById('customerFormContainer').style.display = 'none';
        switchTab('details-tab', null);
    } catch (error) {
        console.error('Error viewing customer:', error);
        showAlert('Error loading customer', 'error');
    }
}

// Edit customer
function editCustomer() {
    if (!currentViewingCustomer) return;
    
    currentEditingCustomer = currentViewingCustomer;
    
    document.getElementById('formTitle').textContent = 'Edit Customer';
    document.getElementById('customerCompany').value = currentViewingCustomer.company?.id || '';
    document.getElementById('customerName').value = currentViewingCustomer.name;
    document.getElementById('customerEmail').value = currentViewingCustomer.email || '';
    document.getElementById('customerPhone').value = currentViewingCustomer.phone || '';
    document.getElementById('customerAddress').value = currentViewingCustomer.address || '';
    document.getElementById('customerCity').value = currentViewingCustomer.city || '';
    document.getElementById('customerState').value = currentViewingCustomer.state || '';
    document.getElementById('customerZipCode').value = currentViewingCustomer.zipCode || '';
    document.getElementById('customerCountry').value = currentViewingCustomer.country || '';
    document.getElementById('customerNotes').value = currentViewingCustomer.notes || '';
    
    document.getElementById('customerDetailsContainer').style.display = 'none';
    document.getElementById('customerFormContainer').style.display = 'block';
}

// Delete customer
async function deleteCustomer() {
    if (!currentViewingCustomer) return;
    if (!confirm('Are you sure you want to delete this customer?')) return;
    
    try {
        const response = await fetch(`/api/customers/${currentViewingCustomer.id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showAlert('Customer deleted successfully', 'success');
            closeDetailsView();
            resetFilters();
        } else {
            showAlert('Error deleting customer', 'error');
        }
    } catch (error) {
        console.error('Error deleting customer:', error);
        showAlert('Error deleting customer', 'error');
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
