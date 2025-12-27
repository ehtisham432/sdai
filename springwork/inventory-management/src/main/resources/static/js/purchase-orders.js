// Global state
let allPurchaseOrders = [];
let currentEditingPO = null;
let currentViewingPO = null;
let formItems = [];
let receiveItems = [];

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    loadCompanies();
    loadProducts();
    loadPurchaseOrders();
    setupFormSubmission();
});

// Load companies for dropdown
async function loadCompanies() {
    try {
        const response = await fetch('/companies');
        const companies = await response.json();
        
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
            
            if (currentValue) select.value = currentValue;
        });
    } catch (error) {
        console.error('Error loading companies:', error);
        showAlert('Error loading companies', 'error');
    }
}

// Load products for dropdown
async function loadProducts() {
    try {
        const response = await fetch('/products');
        const products = await response.json();
        
        const productSelect = document.getElementById('itemProduct');
        productSelect.innerHTML = '<option value="">Select Product</option>';
        products.forEach(product => {
            const option = document.createElement('option');
            option.value = product.id;
            option.textContent = `${product.name} (${product.company?.name || 'N/A'})`;
            productSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

// Load all purchase orders
async function loadPurchaseOrders() {
    try {
        const companyId = document.getElementById('companyFilter').value;
        const url = companyId 
            ? `/purchase-orders?companyId=${companyId}` 
            : '/purchase-orders';
        
        const response = await fetch(url);
        allPurchaseOrders = await response.json();
        renderPurchaseOrders();
    } catch (error) {
        console.error('Error loading purchase orders:', error);
        showAlert('Error loading purchase orders', 'error');
    }
}

// Render purchase orders in all tables
function renderPurchaseOrders() {
    renderAllOrdersTable();
    renderPendingOrdersTable();
    renderReceivedOrdersTable();
}

// Render all orders table
function renderAllOrdersTable() {
    const tbody = document.getElementById('poTableBody');
    
    if (allPurchaseOrders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No purchase orders found</td></tr>';
        return;
    }

    tbody.innerHTML = allPurchaseOrders.map(po => `
        <tr>
            <td><strong>${po.poNumber}</strong></td>
            <td>${po.supplier}</td>
            <td>${po.company?.name || 'N/A'}</td>
            <td>${formatDate(po.orderDate)}</td>
            <td>$${(po.totalAmount || 0).toFixed(2)}</td>
            <td><span class="status-badge status-${po.status.toLowerCase()}">${po.status}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn-primary" onclick="viewPurchaseOrder(${po.id})">View</button>
                    <button class="btn-danger" onclick="deletePurchaseOrder(${po.id})">Delete</button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Render pending orders table
function renderPendingOrdersTable() {
    const tbody = document.getElementById('pendingTableBody');
    const pending = allPurchaseOrders.filter(po => po.status === 'PENDING');
    
    if (pending.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No pending orders</td></tr>';
        return;
    }

    tbody.innerHTML = pending.map(po => `
        <tr>
            <td><strong>${po.poNumber}</strong></td>
            <td>${po.supplier}</td>
            <td>${po.company?.name || 'N/A'}</td>
            <td>${formatDate(po.expectedDeliveryDate)}</td>
            <td>$${(po.totalAmount || 0).toFixed(2)}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-primary" onclick="viewPurchaseOrder(${po.id})">View</button>
                    <button class="btn-danger" onclick="deletePurchaseOrder(${po.id})">Delete</button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Render received orders table
function renderReceivedOrdersTable() {
    const tbody = document.getElementById('receivedTableBody');
    const received = allPurchaseOrders.filter(po => po.status === 'RECEIVED');
    
    if (received.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No received orders</td></tr>';
        return;
    }

    tbody.innerHTML = received.map(po => `
        <tr>
            <td><strong>${po.poNumber}</strong></td>
            <td>${po.supplier}</td>
            <td>${po.company?.name || 'N/A'}</td>
            <td>${formatDate(po.updatedAt)}</td>
            <td>$${(po.totalAmount || 0).toFixed(2)}</td>
            <td>${po.items?.length || 0} items</td>
        </tr>
    `).join('');
}

// Filter purchase orders
function filterPurchaseOrders() {
    const companyId = document.getElementById('companyFilter').value;
    const status = document.getElementById('statusFilter').value;
    
    let filtered = allPurchaseOrders;
    
    if (companyId) {
        filtered = filtered.filter(po => po.company?.id == companyId);
    }
    
    if (status) {
        filtered = filtered.filter(po => po.status === status);
    }
    
    allPurchaseOrders = filtered;
    renderPurchaseOrders();
}

// Clear filters
function clearFilters() {
    document.getElementById('companyFilter').value = '';
    document.getElementById('statusFilter').value = '';
    loadPurchaseOrders();
}

// Switch between tabs
function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    
    document.getElementById(tabName).classList.add('active');
    event.target.classList.add('active');
}

// Open create PO modal
function openCreatePOModal() {
    currentEditingPO = null;
    document.getElementById('poModalTitle').textContent = 'New Purchase Order';
    document.getElementById('poForm').reset();
    formItems = [];
    updateItemsTable();
    
    // Set today's date
    document.getElementById('poOrderDate').valueAsDate = new Date();
    
    showModal('poModal');
}

// Close PO modal
function closePOModal() {
    hideModal('poModal');
    formItems = [];
    currentEditingPO = null;
}

// Add item to form
function addItemToPOForm() {
    const productId = document.getElementById('itemProduct').value;
    const quantity = parseInt(document.getElementById('itemQuantity').value);
    const unitPrice = parseFloat(document.getElementById('itemUnitPrice').value);
    
    if (!productId || !quantity || quantity <= 0 || !unitPrice || unitPrice < 0) {
        showAlert('Please fill all item fields with valid values', 'error', 'poAlert');
        return;
    }
    
    const product = allProducts.find(p => p.id == productId);
    if (!product) return;
    
    formItems.push({
        product: product,
        productId: productId,
        quantity: quantity,
        unitPrice: unitPrice,
        subtotal: quantity * unitPrice
    });
    
    updateItemsTable();
    document.getElementById('itemProduct').value = '';
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
    document.getElementById('poForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const companyId = document.getElementById('poCompany').value;
        const userId = getUserIdFromToken();
        
        if (!companyId || !userId) {
            showAlert('Company and user information are required', 'error', 'poAlert');
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
            notes: document.getElementById('poNotes').value,
            items: formItems.map(item => ({
                product: { id: item.productId },
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                subtotal: item.subtotal,
                receivedQuantity: 0
            }))
        };
        
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
                showAlert(currentEditingPO ? 'Purchase order updated successfully' : 'Purchase order created successfully', 'success', 'poAlert');
                setTimeout(() => {
                    closePOModal();
                    loadPurchaseOrders();
                }, 1500);
            } else {
                const error = await response.json();
                showAlert('Error saving purchase order: ' + error.message, 'error', 'poAlert');
            }
        } catch (error) {
            console.error('Error:', error);
            showAlert('Error saving purchase order', 'error', 'poAlert');
        }
    });
}

// View purchase order details
async function viewPurchaseOrder(id) {
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
                <td><button class="btn-secondary" onclick="editItem(${item.id})" style="padding: 4px 8px; font-size: 12px;">Edit</button></td>
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
        
        showModal('poDetailsModal');
    } catch (error) {
        console.error('Error loading PO details:', error);
        showAlert('Error loading purchase order details', 'error');
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
    
    closePODetailsModal();
    currentEditingPO = currentViewingPO;
    
    document.getElementById('poModalTitle').textContent = 'Edit Purchase Order';
    document.getElementById('poNumber').value = currentViewingPO.poNumber;
    document.getElementById('poCompany').value = currentViewingPO.company?.id || '';
    document.getElementById('poSupplier').value = currentViewingPO.supplier;
    document.getElementById('poOrderDate').value = formatDateForInput(currentViewingPO.orderDate);
    document.getElementById('poDeliveryDate').value = formatDateForInput(currentViewingPO.expectedDeliveryDate);
    document.getElementById('poStatus').value = currentViewingPO.status;
    document.getElementById('poNotes').value = currentViewingPO.notes || '';
    
    // Load existing items
    formItems = (currentViewingPO.items || []).map(item => ({
        product: item.product,
        productId: item.product?.id,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.subtotal
    }));
    
    updateItemsTable();
    showModal('poModal');
}

// Delete purchase order
async function deletePurchaseOrder(id) {
    if (!confirm('Are you sure you want to delete this purchase order?')) return;
    
    try {
        const response = await fetch(`/purchase-orders/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            closePODetailsModal();
            showAlert('Purchase order deleted successfully', 'success');
            setTimeout(() => loadPurchaseOrders(), 1500);
        } else {
            showAlert('Can only delete PENDING purchase orders', 'error');
        }
    } catch (error) {
        console.error('Error deleting purchase order:', error);
        showAlert('Error deleting purchase order', 'error');
    }
}

// Show receive inventory form
function showReceiveInventoryForm() {
    if (!currentViewingPO || currentViewingPO.status !== 'PENDING') return;
    
    document.getElementById('detailsActions').style.display = 'none';
    document.getElementById('receiveSection').style.display = 'block';
    
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

// Update receive quantity
function updateReceiveQuantity(itemId, quantity) {
    const item = receiveItems.find(i => i.itemId === itemId);
    if (item) {
        item.quantity = parseInt(quantity) || 0;
    }
}

// Submit receive inventory
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
                closePODetailsModal();
                loadPurchaseOrders();
            }, 1500);
        } else {
            showAlert('Error receiving inventory', 'error', 'detailsAlert');
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error receiving inventory', 'error', 'detailsAlert');
    }
}

// Close PO details modal
function closePODetailsModal() {
    hideModal('poDetailsModal');
    currentViewingPO = null;
    document.getElementById('detailsActions').style.display = 'flex';
    document.getElementById('receiveSection').style.display = 'none';
}

// Helper functions
function showModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function hideModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
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

// Global variable to store all products (for form)
let allProducts = [];

// Load products at startup
loadProducts();

// Also need to update loadProducts to set global variable
const originalLoadProducts = loadProducts;
loadProducts = async function() {
    try {
        const response = await fetch('/products');
        allProducts = await response.json();
        
        const productSelect = document.getElementById('itemProduct');
        productSelect.innerHTML = '<option value="">Select Product</option>';
        allProducts.forEach(product => {
            const option = document.createElement('option');
            option.value = product.id;
            option.textContent = `${product.name} (${product.company?.name || 'N/A'})`;
            productSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading products:', error);
    }
};

loadProducts();
