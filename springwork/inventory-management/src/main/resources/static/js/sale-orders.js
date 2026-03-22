// Global state
let allSaleOrders = [];
let searchResults = [];
let currentEditingSO = null;
let currentViewingSO = null;
let formItems = [];

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    loadHeaderMenu();
    loadUserInfo();
    loadCompanies();
    loadProducts();
    setupFormSubmission();
});

// Load header menu from screens with display type D or HD and user company role
async function loadHeaderMenu() {
    try {
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
                const fallbackResult = await fallbackRes.json();
                if (fallbackResult.success && Array.isArray(fallbackResult.data)) {
                    screens = fallbackResult.data;
                }
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
                if (!s.roles) return true;
                if (Array.isArray(s.roles)) {
                    return s.roles.includes(userRoleId) || s.roles.some(r => r.id === userRoleId);
                }
                return true;
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

// Load companies for dropdown - only user assigned companies
async function loadCompanies() {
    try {
        const userId = getUserIdFromToken();
        alert(userId);
        if (!userId) {
            showAlert('User information not available', 'error');
            return;
        }
        
        const response = await fetch(`/users/${userId}/companies`);
        const companies = await response.json();
        
        let userCompanyId = getCompanyIdFromToken();
        console.log('User ID:', userId);
        console.log('User Company ID from token:', userCompanyId);
        console.log('Available companies:', companies);
        
        const companySelects = document.querySelectorAll('#soCompany, #companyFilter');
        companySelects.forEach(select => {
            while (select.firstChild) select.removeChild(select.firstChild);
            if (select.id === 'companyFilter') {
                companies.forEach(company => {
                    const option = document.createElement('option');
                    option.value = company.id;
                    option.textContent = company.name;
                    if (userCompanyId && company.id == userCompanyId) {
                        option.selected = true;
                    }
                    select.appendChild(option);
                });
            } else {
                const blank = document.createElement('option');
                blank.value = '';
                blank.textContent = '-- Select Company --';
                select.appendChild(blank);
                companies.forEach(company => {
                    const option = document.createElement('option');
                    option.value = company.id;
                    option.textContent = company.name;
                    if (userCompanyId && company.id == userCompanyId) {
                        option.selected = true;
                    }
                    select.appendChild(option);
                });
            }
        });
    } catch (error) {
        console.error('Error loading companies:', error);
        showAlert('Error loading companies', 'error');
    }
}

// Load products for dropdown
async function loadProducts() {
    try {
        const response = await fetch('/api/products');
        const products = await response.json();
        
        window.allProducts = products;
        
        setupProductAutocomplete('itemProduct', 'itemProductSuggestions', 'soCompany');
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

// Perform search with filters
async function performSearch() {
    try {
        const companyId = document.getElementById('companyFilter').value;
        const status = document.getElementById('statusFilter').value;
        
        if (!companyId) {
            showAlert('Please select a company to search.', 'error');
            document.getElementById('companyFilter').focus();
            return;
        }
        let url = '/sale-orders';
        const params = [];
        params.push(`companyId=${encodeURIComponent(companyId)}`);
        params.push(`status=${encodeURIComponent(status)}`);
        url += '?' + params.join('&');
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
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No sale orders found</td></tr>';
        return;
    }

    tbody.innerHTML = searchResults.map(so => `
        <tr>
            <td><strong>${so.invoiceNumber}</strong></td>
            <td>${so.customerName}</td>
            <td>${so.company?.name || 'N/A'}</td>
            <td>${formatDate(so.saleDate)}</td>
            <td>$${(so.finalAmount || 0).toFixed(2)}</td>
            <td><span class="status-badge status-${so.status.toLowerCase()}">${so.status}</span></td>
            <td>
                <button class="btn-primary" onclick="viewSaleOrder(${so.id})" style="padding: 6px 12px; font-size: 12px;">View</button>
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
    document.getElementById('statusFilter').value = '';
    searchResults = [];
    renderSearchResults();
    clearDetailsTab();
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

// Create new sale order form - open in Tab 3
function createNewSaleOrder() {
    currentEditingSO = null;
    document.getElementById('formTitle').textContent = 'New Sale Order';
    document.getElementById('soForm').reset();
    formItems = [];
    updateItemsTable();
    
    document.getElementById('orderDetailsContainer').style.display = 'none';
    document.getElementById('createFormContainer').style.display = 'block';
    
    document.getElementById('soSaleDate').valueAsDate = new Date();
    switchTab('details-tab', null);
}

// Close details tab and show form
function clearDetailsTab() {
    currentEditingSO = null;
    currentViewingSO = null;
    formItems = [];
    
    document.getElementById('orderDetailsContainer').style.display = 'none';
    document.getElementById('createFormContainer').style.display = 'block';
    document.getElementById('soForm').reset();
    updateItemsTable();
    document.getElementById('soSaleDate').valueAsDate = new Date();
}

// Add item to form
function addItemToSOForm() {
    const productInput = document.getElementById('itemProduct');
    const productId = productInput.getAttribute('data-product-id');
    const productName = productInput.value;
    const quantity = parseInt(document.getElementById('itemQuantity').value);
    const unitPrice = parseFloat(document.getElementById('itemUnitPrice').value);
    const discount = parseFloat(document.getElementById('itemDiscount').value) || 0;
    
    if (!productId || !quantity || quantity <= 0 || !unitPrice || unitPrice < 0) {
        showAlert('Please fill all item fields with valid values', 'error');
        return;
    }
    
    const product = window.allProducts.find(p => p.id == productId);
    if (!product) {
        showAlert('Please select a valid product from the dropdown', 'error');
        return;
    }
    
    formItems.push({
        product: product,
        productId: productId,
        quantity: quantity,
        unitPrice: unitPrice,
        discount: discount,
        subtotal: (quantity * unitPrice) - discount
    });
    
    updateItemsTable();
    productInput.value = '';
    productInput.setAttribute('data-product-id', '');
    document.getElementById('itemQuantity').value = '';
    document.getElementById('itemUnitPrice').value = '';
    document.getElementById('itemDiscount').value = '';
}

// Update items table in form
function updateItemsTable() {
    const tbody = document.getElementById('itemsTableBody');
    
    tbody.innerHTML = formItems.map((item, index) => `
        <tr>
            <td>${item.product.name}</td>
            <td>${item.quantity}</td>
            <td>$${item.unitPrice.toFixed(2)}</td>
            <td>$${item.discount.toFixed(2)}</td>
            <td>$${item.subtotal.toFixed(2)}</td>
            <td><button type="button" class="btn-danger" onclick="removeItemFromForm(${index})" style="padding: 4px 8px; font-size: 12px;">Remove</button></td>
        </tr>
    `).join('');
    
    updateTotals();
}

// Update totals display
function updateTotals() {
    const subtotal = formItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const totalDiscount = formItems.reduce((sum, item) => sum + item.discount, 0);
    
    document.getElementById('soSubtotal').textContent = subtotal.toFixed(2);
    document.getElementById('soTotalDiscount').textContent = totalDiscount.toFixed(2);
    document.getElementById('soTotalTax').textContent = '0.00';
    document.getElementById('soFinalAmount').textContent = (subtotal - totalDiscount).toFixed(2);
}

// Remove item from form
function removeItemFromForm(index) {
    formItems.splice(index, 1);
    updateItemsTable();
}

// Setup form submission
function setupFormSubmission() {
    const companySelect = document.getElementById('soCompany');
    if (companySelect) {
        companySelect.addEventListener('change', function() {
            setupProductAutocompleteForDetails('detailsItemProduct', 'detailsItemProductSuggestions', this.value);
        });
    }
    
    document.getElementById('soForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const invoiceNumber = document.getElementById('soNumber').value;
        const companyId = document.getElementById('soCompany').value;
        const customerName = document.getElementById('soCustomerName').value;
        const customerEmail = document.getElementById('soCustomerEmail').value;
        const customerPhone = document.getElementById('soCustomerPhone').value;
        const customerAddress = document.getElementById('soCustomerAddress').value;
        const saleDate = document.getElementById('soSaleDate').value;
        const dueDate = document.getElementById('soDueDate').value;
        const paymentMethod = document.getElementById('soPaymentMethod').value;
        const status = document.getElementById('soStatus').value;
        const notes = document.getElementById('soNotes').value;
        
        if (!invoiceNumber || !companyId || !customerName || !saleDate || formItems.length === 0) {
            showAlert('Please fill all required fields and add at least one item', 'error');
            return;
        }
        
        const subtotal = formItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
        const totalDiscount = formItems.reduce((sum, item) => sum + item.discount, 0);
        const finalAmount = subtotal - totalDiscount;
        
        const saleOrderData = {
            invoiceNumber: invoiceNumber,
            company: { id: companyId },
            createdBy: { id: getUserIdFromToken() },
            customerName: customerName,
            customerEmail: customerEmail,
            customerPhone: customerPhone,
            customerAddress: customerAddress,
            saleDate: new Date(saleDate),
            dueDate: dueDate ? new Date(dueDate) : null,
            paymentMethod: paymentMethod,
            status: currentEditingSO ? status : 'PENDING',
            totalAmount: subtotal,
            discountAmount: totalDiscount,
            taxAmount: 0,
            finalAmount: finalAmount,
            notes: notes,
            items: formItems.map(item => ({
                product: { id: item.productId },
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                discount: item.discount,
                subtotal: item.subtotal
            }))
        };
        
        try {
            let response;
            if (currentEditingSO) {
                response = await fetch(`/sale-orders/${currentEditingSO.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(saleOrderData)
                });
            } else {
                response = await fetch('/sale-orders', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(saleOrderData)
                });
            }
            
            if (response.ok) {
                showAlert(currentEditingSO ? 'Sale order updated successfully' : 'Sale order created successfully', 'success');
                clearDetailsTab();
                performSearch();
            } else {
                showAlert('Error saving sale order', 'error');
            }
        } catch (error) {
            console.error('Error saving sale order:', error);
            showAlert('Error saving sale order', 'error');
        }
    });
}

// View sale order details
async function viewSaleOrder(id) {
    if (!id) return;
    
    try {
        const response = await fetch(`/sale-orders/${id}`);
        if (!response.ok) {
            showAlert('Sale order not found', 'error');
            return;
        }
        
        currentViewingSO = await response.json();
        
        // Build details HTML
        const detailsHtml = `
            <div class="details-grid">
                <div class="details-item">
                    <strong>Invoice Number</strong>
                    <div class="details-item-value">${currentViewingSO.invoiceNumber}</div>
                </div>
                <div class="details-item">
                    <strong>Customer</strong>
                    <div class="details-item-value">${currentViewingSO.customerName}</div>
                </div>
                <div class="details-item">
                    <strong>Email</strong>
                    <div class="details-item-value">${currentViewingSO.customerEmail || 'N/A'}</div>
                </div>
                <div class="details-item">
                    <strong>Phone</strong>
                    <div class="details-item-value">${currentViewingSO.customerPhone || 'N/A'}</div>
                </div>
                <div class="details-item">
                    <strong>Sale Date</strong>
                    <div class="details-item-value">${formatDate(currentViewingSO.saleDate)}</div>
                </div>
                <div class="details-item">
                    <strong>Due Date</strong>
                    <div class="details-item-value">${currentViewingSO.dueDate ? formatDate(currentViewingSO.dueDate) : 'N/A'}</div>
                </div>
                <div class="details-item">
                    <strong>Status</strong>
                    <div class="details-item-value"><span class="status-badge status-${currentViewingSO.status.toLowerCase()}">${currentViewingSO.status}</span></div>
                </div>
                <div class="details-item">
                    <strong>Payment Method</strong>
                    <div class="details-item-value">${currentViewingSO.paymentMethod || 'N/A'}</div>
                </div>
                <div class="details-item">
                    <strong>Subtotal</strong>
                    <div class="details-item-value">$${(currentViewingSO.totalAmount || 0).toFixed(2)}</div>
                </div>
                <div class="details-item">
                    <strong>Total Discount</strong>
                    <div class="details-item-value">-$${(currentViewingSO.discountAmount || 0).toFixed(2)}</div>
                </div>
                <div class="details-item">
                    <strong>Tax</strong>
                    <div class="details-item-value">+$${(currentViewingSO.taxAmount || 0).toFixed(2)}</div>
                </div>
                <div class="details-item" style="border-left-color: #48bb78;">
                    <strong>Final Amount</strong>
                    <div class="details-item-value" style="color: #48bb78; font-size: 18px;">$${(currentViewingSO.finalAmount || 0).toFixed(2)}</div>
                </div>
            </div>
        `;
        
        document.getElementById('soDetails').innerHTML = detailsHtml;
        document.getElementById('detailsInvoiceNumber').textContent = `Invoice #${currentViewingSO.invoiceNumber}`;
        
        // Populate items table
        const itemsTableBody = document.getElementById('detailsItemsTable');
        itemsTableBody.innerHTML = (currentViewingSO.items || []).map(item => `
            <tr>
                <td>${item.product.name}</td>
                <td>${item.quantity}</td>
                <td>$${item.unitPrice.toFixed(2)}</td>
                <td>$${item.subtotal.toFixed(2)}</td>
                <td>
                    <div style="display: flex; gap: 5px;">
                        <button type="button" class="btn-primary" onclick="editItem(${item.id})" style="padding: 4px 8px; font-size: 12px;">Edit</button>
                        <button type="button" class="btn-danger" onclick="deleteItemFromSO(${item.id})" style="padding: 4px 8px; font-size: 12px;">Remove</button>
                    </div>
                </td>
            </tr>
        `).join('');
        
        // Show/hide buttons based on status
        const editSOBtn = document.getElementById('editSOBtn');
        const completeBtn = document.getElementById('completeBtn');
        const deleteSOBtn = document.getElementById('deleteSOBtn');
        const addItemsSection = document.getElementById('addItemsSection');
        
        if (currentViewingSO.status === 'PENDING') {
            editSOBtn.style.display = 'inline-block';
            completeBtn.style.display = 'inline-block';
            deleteSOBtn.style.display = 'inline-block';
            addItemsSection.style.display = 'block';
        } else {
            editSOBtn.style.display = 'none';
            completeBtn.style.display = 'none';
            deleteSOBtn.style.display = 'none';
            addItemsSection.style.display = 'none';
        }
        
        // Load products for add items
        loadProductsForDetailsForm();
        
        document.getElementById('orderDetailsContainer').style.display = 'block';
        document.getElementById('createFormContainer').style.display = 'none';
        switchTab('details-tab', null);
    } catch (error) {
        console.error('Error viewing sale order:', error);
        showAlert('Error loading sale order', 'error');
    }
}

// Load products for details form
function loadProductsForDetailsForm() {
    if (currentViewingSO && currentViewingSO.company) {
        setupProductAutocompleteForDetails('detailsItemProduct', 'detailsItemProductSuggestions', currentViewingSO.company.id);
    }
}

// Add item to existing sale order
async function addItemToExistingSO() {
    if (!currentViewingSO) return;
    
    const productInput = document.getElementById('detailsItemProduct');
    const productId = productInput.getAttribute('data-product-id');
    const productName = productInput.value;
    const quantity = parseInt(document.getElementById('detailsItemQuantity').value);
    const unitPrice = parseFloat(document.getElementById('detailsItemUnitPrice').value);
    const discount = parseFloat(document.getElementById('detailsItemDiscount').value) || 0;
    
    if (!productId || !quantity || quantity <= 0 || !unitPrice || unitPrice < 0) {
        showAlert('Please fill all item fields with valid values', 'error');
        return;
    }
    
    const product = window.allProducts.find(p => p.id == productId);
    if (!product) {
        showAlert('Please select a valid product from the dropdown', 'error');
        return;
    }
    
    try {
        const itemData = {
            product: { id: productId },
            quantity: quantity,
            unitPrice: unitPrice,
            discount: discount,
            subtotal: (quantity * unitPrice) - discount
        };
        
        const response = await fetch(`/sale-orders/${currentViewingSO.id}/items`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(itemData)
        });
        
        if (response.ok) {
            showAlert('Item added successfully', 'success');
            viewSaleOrder(currentViewingSO.id);
            productInput.value = '';
            productInput.setAttribute('data-product-id', '');
            document.getElementById('detailsItemQuantity').value = '';
            document.getElementById('detailsItemUnitPrice').value = '';
            document.getElementById('detailsItemDiscount').value = '';
        } else {
            showAlert('Error adding item', 'error');
        }
    } catch (error) {
        console.error('Error adding item:', error);
        showAlert('Error adding item', 'error');
    }
}

// Edit sale order
function editSaleOrder() {
    if (!currentViewingSO) return;
    
    currentEditingSO = currentViewingSO;
    
    document.getElementById('formTitle').textContent = 'Edit Sale Order';
    document.getElementById('soNumber').value = currentViewingSO.invoiceNumber;
    document.getElementById('soCompany').value = currentViewingSO.company?.id || '';
    document.getElementById('soCustomerName').value = currentViewingSO.customerName;
    document.getElementById('soCustomerEmail').value = currentViewingSO.customerEmail || '';
    document.getElementById('soCustomerPhone').value = currentViewingSO.customerPhone || '';
    document.getElementById('soCustomerAddress').value = currentViewingSO.customerAddress || '';
    document.getElementById('soSaleDate').value = formatDateForInput(currentViewingSO.saleDate);
    document.getElementById('soDueDate').value = formatDateForInput(currentViewingSO.dueDate);
    document.getElementById('soPaymentMethod').value = currentViewingSO.paymentMethod || '';
    document.getElementById('soStatus').value = currentViewingSO.status;
    document.getElementById('soNotes').value = currentViewingSO.notes || '';
    
    formItems = [];
    updateItemsTable();
    
    document.getElementById('itemsSection').style.display = 'none';
    
    document.getElementById('orderDetailsContainer').style.display = 'none';
    document.getElementById('createFormContainer').style.display = 'block';
}

// Delete sale order
async function deleteSaleOrder() {
    if (!currentViewingSO) return;
    if (!confirm('Are you sure you want to delete this sale order?')) return;
    
    try {
        const response = await fetch(`/sale-orders/${currentViewingSO.id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showAlert('Sale order deleted successfully', 'success');
            clearDetailsTab();
            performSearch();
        } else {
            showAlert('Error deleting sale order', 'error');
        }
    } catch (error) {
        console.error('Error deleting sale order:', error);
        showAlert('Error deleting sale order', 'error');
    }
}

// Complete sale order (reduce inventory)
async function completeSaleOrder() {
    if (!currentViewingSO) return;
    if (!confirm('Complete this sale order? This will reduce inventory.')) return;
    
    try {
        const response = await fetch(`/sale-orders/${currentViewingSO.id}/complete`, {
            method: 'POST'
        });
        
        if (response.ok) {
            showAlert('Sale order completed successfully', 'success');
            viewSaleOrder(currentViewingSO.id);
            performSearch();
        } else {
            const error = await response.text();
            showAlert(error || 'Error completing sale order. Check inventory.', 'error');
        }
    } catch (error) {
        console.error('Error completing sale order:', error);
        showAlert('Error completing sale order', 'error');
    }
}

// Edit item
async function editItem(itemId) {
    if (!currentViewingSO) return;
    
    const item = currentViewingSO.items?.find(i => i.id === itemId);
    if (!item) {
        showAlert('Item not found', 'error');
        return;
    }
    
    const newQuantity = prompt('Enter new quantity:', item.quantity);
    if (newQuantity === null) return;
    
    const quantity = parseInt(newQuantity);
    if (isNaN(quantity) || quantity <= 0) {
        showAlert('Invalid quantity', 'error');
        return;
    }
    
    try {
        const itemData = {
            product: item.product,
            quantity: quantity,
            unitPrice: item.unitPrice,
            discount: item.discount || 0,
            subtotal: (quantity * item.unitPrice) - (item.discount || 0)
        };
        
        const response = await fetch(`/sale-orders/items/${itemId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(itemData)
        });
        
        if (response.ok) {
            showAlert('Item updated successfully', 'success');
            viewSaleOrder(currentViewingSO.id);
        } else {
            showAlert('Error updating item', 'error');
        }
    } catch (error) {
        console.error('Error updating item:', error);
        showAlert('Error updating item', 'error');
    }
}

// Delete item from sale order
async function deleteItemFromSO(itemId) {
    if (!confirm('Are you sure you want to remove this item?')) return;
    
    try {
        const response = await fetch(`/sale-orders/items/${itemId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showAlert('Item removed successfully', 'success');
            viewSaleOrder(currentViewingSO.id);
        } else {
            showAlert('Error removing item', 'error');
        }
    } catch (error) {
        console.error('Error removing item:', error);
        showAlert('Error removing item', 'error');
    }
}

function showAlert(message, type, alertId = 'alert') {
    const alertEl = document.getElementById(alertId);
    alertEl.className = `alert alert-${type === 'success' ? 'success' : 'danger'}`;
    alertEl.textContent = message;
    alertEl.style.display = 'block';
    setTimeout(() => alertEl.style.display = 'none', 5000);
}

function formatDate(dateString) {
    if (!dateString) return '';
    const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
    return new Date(dateString).toLocaleDateString('en-US', options);
}

function formatDateForInput(dateString) {
    if (!dateString) return '';
    return new Date(dateString).toISOString().split('T')[0];
}

function getUserIdFromToken() {
    try {
        const token = getAuthToken();
        if (!token) return null;
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.userId;
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
        if (payload.companyId) {
            return payload.companyId;
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

// Global variable to store all products
let allProducts = [];

loadProducts();

// Setup product autocomplete functionality
function setupProductAutocomplete(inputId, suggestionsId, companySelectId) {
    const input = document.getElementById(inputId);
    const suggestionsList = document.getElementById(suggestionsId);
    const companySelect = document.getElementById(companySelectId);
    
    if (!input) return;
    
    input.addEventListener('input', function() {
        const value = this.value.toLowerCase();
        
        if (value.length < 1) {
            suggestionsList.classList.remove('active');
            return;
        }
        
        const filtered = window.allProducts.filter(p =>
            p.name.toLowerCase().includes(value) &&
            (!companySelect.value || !p.company || p.company.id == companySelect.value)
        );
        
        if (filtered.length === 0) {
            suggestionsList.classList.remove('active');
            return;
        }
        
        suggestionsList.innerHTML = filtered.map((product, index) =>
            `<div class="autocomplete-item" onclick="selectProduct('${inputId}', '${suggestionsId}', ${product.id}, '${product.name.replace(/'/g, "\\'")}', '${product.company?.name?.replace(/'/g, "\\'") || ''}')">${product.name}</div>`
        ).join('');
        
        suggestionsList.classList.add('active');
    });
    
    input.addEventListener('blur', function() {
        setTimeout(() => suggestionsList.classList.remove('active'), 200);
    });
}

function selectProduct(inputId, suggestionsId, productId, productName, companyName) {
    const input = document.getElementById(inputId);
    const suggestionsList = document.getElementById(suggestionsId);
    
    input.value = productName;
    input.setAttribute('data-product-id', productId);
    suggestionsList.classList.remove('active');
}

// Setup product autocomplete for details form (filtered by company ID)
function setupProductAutocompleteForDetails(inputId, suggestionsId, companyId) {
    const input = document.getElementById(inputId);
    const suggestionsList = document.getElementById(suggestionsId);
    
    if (!input) return;
    
    input.addEventListener('input', function() {
        const value = this.value.toLowerCase();
        
        if (value.length < 1) {
            suggestionsList.classList.remove('active');
            return;
        }
        
        const filtered = window.allProducts.filter(p =>
            p.name.toLowerCase().includes(value) &&
            (!companyId || !p.company || p.company.id == companyId)
        );
        
        if (filtered.length === 0) {
            suggestionsList.classList.remove('active');
            return;
        }
        
        suggestionsList.innerHTML = filtered.map((product, index) =>
            `<div class="autocomplete-item" onclick="selectProduct('${inputId}', '${suggestionsId}', ${product.id}, '${product.name.replace(/'/g, "\\'")}', '${product.company?.name?.replace(/'/g, "\\'") || ''}')">${product.name}</div>`
        ).join('');
        
        suggestionsList.classList.add('active');
    });
    
    input.addEventListener('blur', function() {
        setTimeout(() => suggestionsList.classList.remove('active'), 200);
    });
}

// Also set global variable
const originalLoadProducts = loadProducts;
loadProducts = async function() {
    const res = await originalLoadProducts();
    window.allProducts = allProducts;
    return res;
};

loadProducts();
