// Global state
let allPurchaseOrders = [];
let searchResults = [];
let currentEditingPO = null;
let currentViewingPO = null;
let formItems = [];
let receiveItems = [];

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
	//alert('inside po js');
    loadCompanies();
    loadProducts();
    setupFormSubmission();
});

// Load companies for dropdown - only user assigned companies
async function loadCompanies() {
    try {
        const userId = getUserIdFromToken();
        if (!userId) {
            showAlert('User information not available', 'error');
            return;
        }
        
        // Fetch user-assigned companies
        const response = await fetch(`/users/${userId}/companies`);
        const companies = await response.json();
        
        // Get user's primary company from JWT token for default selection
        let userCompanyId = getCompanyIdFromToken();
        console.log('User ID:', userId);
        console.log('User Company ID from token:', userCompanyId);
        console.log('Available companies:', companies);
        
        const companySelects = document.querySelectorAll('#poCompany, #companyFilter');
        companySelects.forEach(select => {
            const currentValue = select.value;
            select.innerHTML = select.id === 'companyFilter' 
                ? '<option value="">All Companies</option>' 
                : '<option value="">Select a company</option>';
            
            companies.forEach(company => {
                const option = document.createElement('option');
                option.value = company.id;
                option.textContent = company.name;
                select.appendChild(option);
            });
            
            // Set default selection for create form using JWT claim, but not for filter
            if (select.id === 'poCompany' && userCompanyId) {
                // Convert to string for comparison since select.value is always string
                const companyIdStr = String(userCompanyId);
                select.value = companyIdStr;
                console.log(`Set company dropdown to: ${companyIdStr}, current value: ${select.value}`);
            } else if (currentValue && select.id === 'poCompany') {
                select.value = currentValue;
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
        
        // Setup autocomplete for main form
        setupProductAutocomplete('itemProduct', 'itemProductSuggestions', 'poCompany');
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

// Perform search with filters
async function performSearch() {
    try {
        const companyId = document.getElementById('companyFilter').value;
        const status = document.getElementById('statusFilter').value;
        
        let url = '/purchase-orders';
        const params = [];
        
        if (companyId) params.push(`companyId=${companyId}`);
        if (status) params.push(`status=${status}`);
        
        if (params.length > 0) {
            url += '?' + params.join('&');
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
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No orders found</td></tr>';
        return;
    }

    tbody.innerHTML = searchResults.map(po => `
        <tr>
            <td><strong>${po.poNumber}</strong></td>
            <td>${po.supplier}</td>
            <td>${po.company?.name || 'N/A'}</td>
            <td>${formatDate(po.orderDate)}</td>
            <td>$${(po.totalAmount || 0).toFixed(2)}</td>
            <td><span class="status-badge status-${po.status.toLowerCase()}">${po.status}</span></td>
            <td>
                <button class="btn-primary" onclick="viewPurchaseOrder(${po.id})" style="padding: 6px 12px; font-size: 12px;">View</button>
            </td>
        </tr>
    `).join('');
}

// Reset filters and clear search
function resetFilters() {
    document.getElementById('companyFilter').value = '';
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
    
    // Hide all tabs and remove active class
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab and activate button
    const selectedTab = document.getElementById(tabName);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }
    
    // Find and activate the corresponding button by checking onclick attribute
    const buttons = document.querySelectorAll('.tab-button');
    buttons.forEach(btn => {
        if (btn.getAttribute('onclick').includes(tabName)) {
            btn.classList.add('active');
        }
    });
}

// Create new purchase order form - open in Tab 3
function createNewPurchaseOrder() {
    currentEditingPO = null;
    document.getElementById('formTitle').textContent = 'New Purchase Order';
    document.getElementById('poForm').reset();
    formItems = [];
    updateItemsTable();
    
    document.getElementById('orderDetailsContainer').style.display = 'none';
    document.getElementById('createFormContainer').style.display = 'block';
    
    document.getElementById('poOrderDate').valueAsDate = new Date();
    switchTab('details-tab', null);
}

// Close details tab and show form
function clearDetailsTab() {
    currentEditingPO = null;
    currentViewingPO = null;
    formItems = [];
    receiveItems = [];
    
    document.getElementById('orderDetailsContainer').style.display = 'none';
    document.getElementById('createFormContainer').style.display = 'block';
    document.getElementById('poForm').reset();
    updateItemsTable();
    document.getElementById('receiveSection').classList.remove('active');
    document.getElementById('poOrderDate').valueAsDate = new Date();
}

// Add item to form
function addItemToPOForm() {
    const productInput = document.getElementById('itemProduct');
    const productId = productInput.getAttribute('data-product-id');
    const productName = productInput.value;
    const quantity = parseInt(document.getElementById('itemQuantity').value);
    const unitPrice = parseFloat(document.getElementById('itemUnitPrice').value);
    
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
        subtotal: quantity * unitPrice
    });
    
    updateItemsTable();
    productInput.value = '';
    productInput.setAttribute('data-product-id', '');
    document.getElementById('itemQuantity').value = '';
    document.getElementById('itemUnitPrice').value = '';
}

// Update items table in form
function updateItemsTable() {
    const tbody = document.getElementById('itemsTableBody');
    const totalAmount = formItems.reduce((sum, item) => sum + item.subtotal, 0);
    
    tbody.innerHTML = formItems.map((item, index) => `
        <tr>
            <td>${item.product.name}</td>
            <td>${item.quantity}</td>
            <td>$${item.unitPrice.toFixed(2)}</td>
            <td>$${item.subtotal.toFixed(2)}</td>
            <td><button type="button" class="btn-danger" onclick="removeItemFromForm(${index})" style="padding: 4px 8px; font-size: 12px;">Remove</button></td>
        </tr>
    `).join('');
    
    document.getElementById('poTotalAmount').textContent = totalAmount.toFixed(2);
}

// Remove item from form
function removeItemFromForm(index) {
    formItems.splice(index, 1);
    updateItemsTable();
}

// Setup form submission
function setupFormSubmission() {
    // Listen for company changes to update product autocomplete
    const companySelect = document.getElementById('poCompany');
    if (companySelect) {
        companySelect.addEventListener('change', function() {
            // Clear the product input when company changes
            const productInput = document.getElementById('itemProduct');
            if (productInput) {
                productInput.value = '';
                productInput.setAttribute('data-product-id', '');
                document.getElementById('itemProductSuggestions').classList.remove('active');
            }
        });
    }
    
    document.getElementById('poForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const companyId = document.getElementById('poCompany').value;
        const userId = getUserIdFromToken();
        
        if (!companyId || !userId) {
            showAlert('Company and user information are required', 'error');
            return;
        }
        
        const po = {
            poNumber: document.getElementById('poNumber').value,
            company: { id: companyId },
            createdBy: { id: userId },
            supplier: document.getElementById('poSupplier').value,
            orderDate: new Date(document.getElementById('poOrderDate').value),
            expectedDeliveryDate: document.getElementById('poDeliveryDate').value 
                ? new Date(document.getElementById('poDeliveryDate').value)
                : null,
            status: document.getElementById('poStatus').value,
            notes: document.getElementById('poNotes').value
        };
        
        // Only include items for new purchase orders, not for updates
        if (!currentEditingPO) {
            if (formItems.length === 0) {
                showAlert('Please add at least one item', 'error');
                return;
            }
            po.items = formItems.map(item => ({
				product : item.product,
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                subtotal: item.subtotal,
                receivedQuantity: 0
            }));
        }
        
        try {
            let response;
            if (currentEditingPO) {
                response = await fetch(`/purchase-orders/${currentEditingPO.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(po)
                });
            } else {
                response = await fetch('/purchase-orders', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(po)
                });
            }
            
            if (response.ok) {
                showAlert(currentEditingPO ? 'Order updated successfully' : 'Order created successfully', 'success');
                formItems = [];
                document.getElementById('poForm').reset();
                setTimeout(() => {
                    performSearch();
                }, 1500);
            } else {
                const error = await response.json();
                showAlert('Error saving order: ' + error.message, 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showAlert('Error saving order', 'error');
        }
    });
}

// View purchase order details
async function viewPurchaseOrder(id) {
    if (!id) return;
    
    try {
        const response = await fetch(`/purchase-orders/${id}`);
        currentViewingPO = await response.json();
        
        document.getElementById('detailsPoNumber').textContent = `PO #${currentViewingPO.poNumber}`;
        
        const details = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                <div>
                    <strong>Supplier:</strong> ${currentViewingPO.supplier}<br>
                    <strong>Company:</strong> ${currentViewingPO.company?.name || 'N/A'}<br>
                    <strong>Status:</strong> <span class="status-badge status-${currentViewingPO.status.toLowerCase()}">${currentViewingPO.status}</span>
                </div>
                <div>
                    <strong>Order Date:</strong> ${formatDate(currentViewingPO.orderDate)}<br>
                    <strong>Expected Delivery:</strong> ${formatDate(currentViewingPO.expectedDeliveryDate)}<br>
                    <strong>Total Amount:</strong> $${(currentViewingPO.totalAmount || 0).toFixed(2)}
                </div>
            </div>
            ${currentViewingPO.notes ? `<div><strong>Notes:</strong> ${currentViewingPO.notes}</div>` : ''}
        `;
        
        document.getElementById('poDetails').innerHTML = details;
        
        // Render items table
        const itemsTable = document.getElementById('detailsItemsTable');
        itemsTable.innerHTML = (currentViewingPO.items || []).map(item => `
            <tr>
                <td>${item.product?.name || 'N/A'}</td>
                <td>${item.quantity}</td>
                <td>$${(item.unitPrice || 0).toFixed(2)}</td>
                <td>$${(item.subtotal || 0).toFixed(2)}</td>
                <td>${item.receivedQuantity || 0} / ${item.quantity}</td>
                <td>
                    <button class="btn-secondary" onclick="editItem(${item.id})" style="padding: 4px 8px; font-size: 12px; margin-right: 5px;">Edit</button>
                    <button class="btn-danger" onclick="deleteItemFromPO(${item.id})" style="padding: 4px 8px; font-size: 12px;">Delete</button>
                </td>
            </tr>
        `).join('');
        
        // Show inventory progress if status is PENDING
        if (currentViewingPO.status === 'PENDING') {
            renderInventoryProgress();
        } else {
            document.getElementById('inventoryProgress').style.display = 'none';
        }
        
        // Update action buttons visibility
        document.getElementById('editPoBtn').style.display = currentViewingPO.status === 'PENDING' ? 'inline-block' : 'none';
        document.getElementById('receiveBtn').style.display = currentViewingPO.status === 'PENDING' ? 'inline-block' : 'none';
        document.getElementById('deletePoBtn').style.display = currentViewingPO.status === 'PENDING' ? 'inline-block' : 'none';
        
        // Show add items section for PENDING orders
        document.getElementById('addItemsSection').style.display = currentViewingPO.status === 'PENDING' ? 'block' : 'none';
        if (currentViewingPO.status === 'PENDING') {
            loadProductsForDetailsForm();
        }
        
        document.getElementById('orderDetailsContainer').style.display = 'block';
        document.getElementById('createFormContainer').style.display = 'none';
        document.getElementById('receiveSection').classList.remove('active');
        switchTab('details-tab', null);
    } catch (error) {
        console.error('Error loading PO details:', error);
        showAlert('Error loading purchase order details', 'error');
    }
}

// Load products for details form
function loadProductsForDetailsForm() {
    // Setup autocomplete for details form, filtered by current PO's company
    if (currentViewingPO && currentViewingPO.company) {
        setupProductAutocompleteForDetails('detailsItemProduct', 'detailsItemProductSuggestions', currentViewingPO.company.id);
    }
}

// Add item to existing purchase order
async function addItemToExistingPO() {
    if (!currentViewingPO) return;
    
    const productInput = document.getElementById('detailsItemProduct');
    const productId = productInput.getAttribute('data-product-id');
    const productName = productInput.value;
    const quantity = parseInt(document.getElementById('detailsItemQuantity').value);
    const unitPrice = parseFloat(document.getElementById('detailsItemUnitPrice').value);
    
    if (!productId || !quantity || quantity <= 0 || !unitPrice || unitPrice < 0) {
        showAlert('Please fill all item fields with valid values', 'error', 'detailsAlert');
        return;
    }
    
    const product = window.allProducts.find(p => p.id == productId);
    if (!product) {
        showAlert('Please select a valid product from the dropdown', 'error', 'detailsAlert');
        return;
    }
    
    try {
        const response = await fetch(`/purchase-orders/${currentViewingPO.id}/items`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
				product: product,
                productId: productId,
                quantity: quantity,
                unitPrice: unitPrice,
                subtotal: quantity * unitPrice,
                receivedQuantity: 0
            })
        });
        
        if (response.ok) {
            showAlert('Item added successfully', 'success', 'detailsAlert');
            productInput.value = '';
            productInput.setAttribute('data-product-id', '');
            document.getElementById('detailsItemQuantity').value = '';
            document.getElementById('detailsItemUnitPrice').value = '';
            // Refresh the purchase order details
            setTimeout(() => {
                viewPurchaseOrder(currentViewingPO.id);
            }, 1000);
        } else {
            const error = await response.json();
            showAlert('Error adding item: ' + (error.message || 'Unknown error'), 'error', 'detailsAlert');
        }
    } catch (error) {
        console.error('Error adding item:', error);
        showAlert('Error adding item', 'error', 'detailsAlert');
    }
}

// Render inventory progress
function renderInventoryProgress() {
    const progressContainer = document.getElementById('progressItems');
    progressContainer.innerHTML = '';
    
    if (currentViewingPO.items && currentViewingPO.items.length > 0) {
        document.getElementById('inventoryProgress').style.display = 'block';
        
        currentViewingPO.items.forEach(item => {
            const received = item.receivedQuantity || 0;
            const total = item.quantity || 1;
            const percentage = (received / total) * 100;
            
            const progressHtml = `
                <div class="progress-item">
                    <div class="progress-label">
                        <span>${item.product?.name || 'Product'}</span>
                        <span>${received} / ${total}</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${percentage}%"></div>
                    </div>
                </div>
            `;
            progressContainer.innerHTML += progressHtml;
        });
    }
}

// Edit purchase order
function editPurchaseOrder() {
    if (!currentViewingPO) return;
    
    currentEditingPO = currentViewingPO;
    
    document.getElementById('formTitle').textContent = 'Edit Purchase Order';
    document.getElementById('poNumber').value = currentViewingPO.poNumber;
    document.getElementById('poCompany').value = currentViewingPO.company?.id || '';
    document.getElementById('poSupplier').value = currentViewingPO.supplier;
    document.getElementById('poOrderDate').value = formatDateForInput(currentViewingPO.orderDate);
    document.getElementById('poDeliveryDate').value = formatDateForInput(currentViewingPO.expectedDeliveryDate);
    document.getElementById('poStatus').value = currentViewingPO.status;
    document.getElementById('poNotes').value = currentViewingPO.notes || '';
    
    // Clear form items - items must be managed separately via add/edit/remove endpoints
    formItems = [];
    updateItemsTable();
    
    // Disable the add item section when editing
    document.getElementById('itemsSection').style.display = 'none';
    
    document.getElementById('orderDetailsContainer').style.display = 'none';
    document.getElementById('createFormContainer').style.display = 'block';
}

// Delete purchase order
async function deletePurchaseOrder() {
    if (!currentViewingPO) return;
    if (!confirm('Are you sure you want to delete this purchase order?')) return;
    
    try {
        const response = await fetch(`/purchase-orders/${currentViewingPO.id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showAlert('Order deleted successfully', 'success');
            clearDetailsTab();
            setTimeout(() => performSearch(), 1500);
        } else {
            showAlert('Can only delete PENDING orders', 'error');
        }
    } catch (error) {
        console.error('Error deleting purchase order:', error);
        showAlert('Error deleting order', 'error');
    }
}

// Show receive inventory form
function showReceiveInventoryForm() {
    if (!currentViewingPO || currentViewingPO.status !== 'PENDING') return;
    
    document.getElementById('detailsActions').style.display = 'none';
    document.getElementById('receiveSection').classList.add('active');
    
    receiveItems = [];
    const tbody = document.getElementById('receiveItemsTable');
    tbody.innerHTML = (currentViewingPO.items || []).map(item => {
        const remaining = (item.quantity || 0) - (item.receivedQuantity || 0);
        receiveItems.push({
            itemId: item.id,
            quantity: 0
        });
        
        return `
            <tr>
                <td>${item.product?.name || 'N/A'}</td>
                <td>${remaining}</td>
                <td>
                    <input type="number" id="receive-${item.id}" min="0" max="${remaining}" value="0" 
                        onchange="updateReceiveQuantity(${item.id}, this.value)">
                </td>
            </tr>
        `;
    }).join('');
}

// Cancel receive inventory
function cancelReceiveInventory() {
    document.getElementById('receiveSection').classList.remove('active');
    document.getElementById('detailsActions').style.display = 'flex';
    receiveItems = [];
}

// Update receive quantity
function updateReceiveQuantity(itemId, quantity) {
    const item = receiveItems.find(i => i.itemId === itemId);
    if (item) {
        item.quantity = parseInt(quantity) || 0;
    }
}

// Edit purchase order item
async function editItem(itemId) {
    if (!currentViewingPO) return;
    
    const item = currentViewingPO.items?.find(i => i.id === itemId);
    if (!item) {
        showAlert('Item not found', 'error', 'detailsAlert');
        return;
    }
    
    const newQuantity = prompt(`Edit quantity for ${item.product?.name || 'Product'}:`, item.quantity);
    if (newQuantity === null) return;
    
    const qty = parseInt(newQuantity);
    if (isNaN(qty) || qty <= 0) {
        showAlert('Please enter a valid quantity', 'error', 'detailsAlert');
        return;
    }
    
    const newPrice = prompt(`Edit unit price:`, item.unitPrice);
    if (newPrice === null) return;
    
    const price = parseFloat(newPrice);
    if (isNaN(price) || price < 0) {
        showAlert('Please enter a valid price', 'error', 'detailsAlert');
        return;
    }
    
    try {
        const response = await fetch(`/purchase-orders/items/${itemId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                quantity: qty,
                unitPrice: price,
                subtotal: qty * price
            })
        });
        
        if (response.ok) {
            showAlert('Item updated successfully', 'success', 'detailsAlert');
            setTimeout(() => {
                viewPurchaseOrder(currentViewingPO.id);
            }, 1000);
        } else {
            showAlert('Error updating item', 'error', 'detailsAlert');
        }
    } catch (error) {
        console.error('Error updating item:', error);
        showAlert('Error updating item', 'error', 'detailsAlert');
    }
}

// Delete item from purchase order
async function deleteItemFromPO(itemId) {
    if (!currentViewingPO) return;
    if (!confirm('Are you sure you want to delete this item?')) return;
    
    try {
        const response = await fetch(`/purchase-orders/items/${itemId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showAlert('Item deleted successfully', 'success', 'detailsAlert');
            setTimeout(() => {
                viewPurchaseOrder(currentViewingPO.id);
            }, 1000);
        } else {
            const error = await response.json();
            showAlert('Error deleting item: ' + (error.message || 'Unknown error'), 'error', 'detailsAlert');
        }
    } catch (error) {
        console.error('Error deleting item:', error);
        showAlert('Error deleting item', 'error', 'detailsAlert');
    }
}
async function submitReceiveInventory() {
    if (!currentViewingPO) return;
    
    const itemsToReceive = receiveItems.filter(item => item.quantity > 0);
    
    if (itemsToReceive.length === 0) {
        showAlert('Please specify quantities to receive', 'error', 'detailsAlert');
        return;
    }
    
    try {
        const response = await fetch(`/purchase-orders/${currentViewingPO.id}/receive-inventory`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(itemsToReceive)
        });
        
        if (response.ok) {
            showAlert('Inventory received successfully', 'success', 'detailsAlert');
            setTimeout(() => {
                cancelReceiveInventory();
                performSearch();
            }, 1500);
        } else {
            showAlert('Error receiving inventory', 'error', 'detailsAlert');
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error receiving inventory', 'error', 'detailsAlert');
    }
}



function showAlert(message, type, alertId = 'alert') {
    const alert = document.getElementById(alertId);
    alert.textContent = message;
    alert.className = `alert active alert-${type}`;
    setTimeout(() => {
        alert.classList.remove('active');
    }, 5000);
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

function formatDateForInput(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getUserIdFromToken() {
    const token = localStorage.getItem('jwtToken');
    if (!token) return null;
    
    try {
        const payload = token.split('.')[1];
        const decoded = JSON.parse(atob(payload));
        return decoded.userId || decoded.sub;
    } catch (error) {
        console.error('Error decoding token:', error);
        return null;
    }
}

function getCompanyIdFromToken() {
    const token = localStorage.getItem('jwtToken');
    if (!token) {
        console.log('No JWT token found in localStorage');
        return null;
    }
    
    try {
        const payload = token.split('.')[1];
        const decoded = JSON.parse(atob(payload));
        console.log('Decoded JWT claims:', decoded);
        
        const companyId = decoded.tenantId || decoded.userCompanyId || null;
        console.log('Extracted company ID:', companyId);
        return companyId;
    } catch (error) {
        console.error('Error decoding token:', error);
        return null;
    }
}

// Global variable to store all products (for form)
let allProducts = [];

// Load products at startup
loadProducts();

// Setup product autocomplete functionality
function setupProductAutocomplete(inputId, suggestionsId, companySelectId) {
    const input = document.getElementById(inputId);
    const suggestionsContainer = document.getElementById(suggestionsId);
    const companySelect = document.getElementById(companySelectId);
    
    if (!input) return;
    
    input.addEventListener('input', function() {
        const query = this.value.toLowerCase();
        const selectedCompanyId = companySelect ? companySelect.value : null;
        
        if (query.length === 0) {
            suggestionsContainer.classList.remove('active');
            return;
        }
        
        // Filter products by company and search term
        const filteredProducts = window.allProducts.filter(product => {
            const matchesCompany = !selectedCompanyId || (product.company && product.company.id == selectedCompanyId);
            const matchesSearch = product.name.toLowerCase().includes(query);
            return matchesCompany && matchesSearch;
        });
        
        if (filteredProducts.length === 0) {
            suggestionsContainer.innerHTML = '<div class="autocomplete-item" style="color: #999;">No products found</div>';
            suggestionsContainer.classList.add('active');
            return;
        }
        
        suggestionsContainer.innerHTML = filteredProducts.map(product => `
            <div class="autocomplete-item" onclick="selectProduct('${inputId}', '${suggestionsId}', ${product.id}, '${product.name.replace(/'/g, "\\'")}', '${product.company?.name || 'N/A'}')">
                <strong>${product.name}</strong> <br>
                <small style="color: #666;">${product.company?.name || 'N/A'}</small>
            </div>
        `).join('');
        
        suggestionsContainer.classList.add('active');
    });
    
    input.addEventListener('blur', function() {
        setTimeout(() => {
            suggestionsContainer.classList.remove('active');
        }, 200);
    });
}

// Select product from autocomplete dropdown
function selectProduct(inputId, suggestionsId, productId, productName, companyName) {
    const input = document.getElementById(inputId);
    const suggestionsContainer = document.getElementById(suggestionsId);
    
    input.value = `${productName} (${companyName})`;
    input.setAttribute('data-product-id', productId);
    suggestionsContainer.classList.remove('active');
}

// Setup product autocomplete for details form (filtered by company ID)
function setupProductAutocompleteForDetails(inputId, suggestionsId, companyId) {
    const input = document.getElementById(inputId);
    const suggestionsContainer = document.getElementById(suggestionsId);
    
    if (!input) return;
    
    input.addEventListener('input', function() {
        const query = this.value.toLowerCase();
        
        if (query.length === 0) {
            suggestionsContainer.classList.remove('active');
            return;
        }
        
        // Filter products by the PO's company and search term
        const filteredProducts = window.allProducts.filter(product => {
            const matchesCompany = product.company && product.company.id == companyId;
            const matchesSearch = product.name.toLowerCase().includes(query);
            return matchesCompany && matchesSearch;
        });
        
        if (filteredProducts.length === 0) {
            suggestionsContainer.innerHTML = '<div class="autocomplete-item" style="color: #999;">No products found</div>';
            suggestionsContainer.classList.add('active');
            return;
        }
        
        suggestionsContainer.innerHTML = filteredProducts.map(product => `
            <div class="autocomplete-item" onclick="selectProduct('${inputId}', '${suggestionsId}', ${product.id}, '${product.name.replace(/'/g, "\\'")}', '${product.company?.name || 'N/A'}')">
                <strong>${product.name}</strong> <br>
                <small style="color: #666;">${product.company?.name || 'N/A'}</small>
            </div>
        `).join('');
        
        suggestionsContainer.classList.add('active');
    });
    
    input.addEventListener('blur', function() {
        setTimeout(() => {
            suggestionsContainer.classList.remove('active');
        }, 200);
    });
}

// Also need to update loadProducts to set global variable
const originalLoadProducts = loadProducts;
loadProducts = async function() {
    try {
        const response = await fetch('/api/products');
        allProducts = await response.json();
        
        // Setup autocomplete for main form
        setupProductAutocomplete('itemProduct', 'itemProductSuggestions', 'poCompany');
    } catch (error) {
        console.error('Error loading products:', error);
    }
};

loadProducts();
