// Global state
let searchResults = [];
let currentEditingProduct = null;
let currentViewingProduct = null;
let existingImages = [];
let selectedValue = null;
let imagesToDelete = [];
let deletedNewIndices = new Set();

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    loadHeaderMenu();
    loadUserInfo();
    loadCompanies();
    setupFormSubmission();
    setupImageHandling();
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
            } catch (e) {
                console.warn('Failed to parse token:', e);
            }
        }
        
        let screens = [];
        
        try {
            let url = '/api/dashboard/load';
            if (roleId) {
                url += `?roleId=${encodeURIComponent(roleId)}`;
            }
            let res = await fetch(url);
            if (res.ok) {
                const result = await res.json();
                if (result.success && result.data) {
                    screens = result.data.roleScreens || result.data.screens || result.data.menus || [];
                }
            }
        } catch (e) {
            console.warn('Failed to load from /api/dashboard/load:', e);
        }
        
        if (!screens.length) {
            try {
                let fallbackRes = await fetch('/api/dashboard/screens');
                if (fallbackRes.ok) {
                    screens = await fallbackRes.json();
                }
            } catch (e) {
                console.warn('Failed to load from /api/dashboard/screens:', e);
            }
        }
        
        let headerScreens = screens.filter(s => {
            if (!s) return false;
            const displayType = (s.displayType && typeof s.displayType === 'object') 
                ? s.displayType.name || s.displayType 
                : s.displayType;
            return displayType === 'D' || displayType === 'HD';
        });
        
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
        
        const companySelects = document.querySelectorAll('#productCompany, #companyFilter');
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

// Load product categories based on selected company
async function loadCategories(companyId) {
    try {
        const categorySelect = document.getElementById('productCategory');
        while (categorySelect.firstChild) categorySelect.removeChild(categorySelect.firstChild);
        
        const optionPlaceholder = document.createElement('option');
        optionPlaceholder.value = '';
        optionPlaceholder.textContent = 'Select a category';
        categorySelect.appendChild(optionPlaceholder);

        if (!companyId) {
            return;
        }

        const response = await fetch(`/api/product-categories/company/${companyId}`);
        const categories = await response.json();
        
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            categorySelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

// Load product types based on selected category
async function loadTypes(categoryId) {
    try {
        const typeSelect = document.getElementById('productType');
        while (typeSelect.firstChild) typeSelect.removeChild(typeSelect.firstChild);
        
        const optionPlaceholder = document.createElement('option');
        optionPlaceholder.value = '';
        optionPlaceholder.textContent = 'Select a type';
        typeSelect.appendChild(optionPlaceholder);

        if (!categoryId) {
            return;
        }

        const response = await fetch(`/api/product-types/category/${categoryId}`);
        const types = await response.json();
        
        types.forEach(type => {
            const option = document.createElement('option');
            option.value = type.id;
            option.textContent = type.name;
            typeSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading types:', error);
    }
}

// Load product categories for search filter based on selected company
async function loadCategoriesForFilter(companyId) {
    try {
        const categoryFilter = document.getElementById('categoryFilter');
        while (categoryFilter.firstChild) categoryFilter.removeChild(categoryFilter.firstChild);
        
        const optionPlaceholder = document.createElement('option');
        optionPlaceholder.value = '';
        optionPlaceholder.textContent = 'All Categories';
        categoryFilter.appendChild(optionPlaceholder);

        if (!companyId) {
            return;
        }

        const response = await fetch(`/api/product-categories/company/${companyId}`);
        const categories = await response.json();
        
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            categoryFilter.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading categories for filter:', error);
    }
}

// Load product types for search filter based on selected category
async function loadTypesForFilter(categoryId) {
    try {
        const typeFilter = document.getElementById('productTypeFilter');
        while (typeFilter.firstChild) typeFilter.removeChild(typeFilter.firstChild);
        
        const optionPlaceholder = document.createElement('option');
        optionPlaceholder.value = '';
        optionPlaceholder.textContent = 'All Types';
        typeFilter.appendChild(optionPlaceholder);

        if (!categoryId) {
            return;
        }

        const response = await fetch(`/api/product-types/category/${categoryId}`);
        const types = await response.json();
        
        types.forEach(type => {
            const option = document.createElement('option');
            option.value = type.id;
            option.textContent = type.name;
            typeFilter.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading types for filter:', error);
    }
}

// Perform search with filters
async function performSearch() {
    try {
        const companyId = document.getElementById('companyFilter').value;
        
        if (!companyId) {
            showAlert('Please select a company to search.', 'error');
            document.getElementById('companyFilter').focus();
            return;
        }

        const categoryId = document.getElementById('categoryFilter').value;
        const productTypeId = document.getElementById('productTypeFilter').value;
        const name = document.getElementById('nameFilter').value;
        
        let url = `/api/products?companyId=${companyId}`;
        if (categoryId) url += `&categoryId=${categoryId}`;
        if (productTypeId) url += `&productTypeId=${productTypeId}`;
        if (name) url += `&name=${encodeURIComponent(name)}`;
        
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
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No products found</td></tr>';
        return;
    }

    tbody.innerHTML = searchResults.map(product => `
        <tr>
            <td>
                ${product.titleImageUrl ? `<img src="${product.titleImageUrl}" style="max-width: 60px; max-height: 60px; border-radius: 4px;">` : '<span style="color: #999;">N/A</span>'}
            </td>
            <td><strong>${product.name}</strong></td>
            <td>${product.description || 'N/A'}</td>
            <td>${product.price || '0.00'}</td>
            <td>${product.productCategory?.name || 'N/A'}</td>
            <td>
                <button class="btn-primary" onclick="viewProduct(${product.id})" style="padding: 6px 12px; font-size: 12px;">View</button>
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
    } else if (companyFilter) {
        companyFilter.value = '';
    }
    
    document.getElementById('categoryFilter').value = '';
    document.getElementById('productTypeFilter').value = '';
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

// Create new product form
function createNewProduct() {
    currentEditingProduct = null;
    currentViewingProduct = null;
    
    document.getElementById('formTitle').textContent = 'New Product';
    document.getElementById('productForm').reset();
    
    const userCompanyId = getCompanyIdFromToken();
    if (userCompanyId) {
        document.getElementById('productCompany').value = userCompanyId;
        loadCategories(userCompanyId);
    }
    
    document.getElementById('productDetailsContainer').style.display = 'none';
    document.getElementById('productFormContainer').style.display = 'block';
    
    switchTab('details-tab', null);
}

// Close details view and show form
function closeDetailsView() {
    currentEditingProduct = null;
    currentViewingProduct = null;
    
    document.getElementById('productDetailsContainer').style.display = 'none';
    document.getElementById('productFormContainer').style.display = 'block';
    document.getElementById('productForm').reset();
    document.getElementById('imagePreview').innerHTML = '';
    existingImages = [];
    selectedValue = null;
    imagesToDelete = [];
    deletedNewIndices = new Set();
}

// Setup form submission
function setupFormSubmission() {
    document.getElementById('productForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const companyId = document.getElementById('productCompany').value;
        const name = document.getElementById('productName').value;
        const description = document.getElementById('productDescription').value;
        const price = document.getElementById('productPrice').value;
        const categoryId = document.getElementById('productCategory').value;
        const typeId = document.getElementById('productType').value;
        
        if (!companyId || !name || !price || !categoryId) {
            showAlert('Please fill all required fields', 'error');
            return;
        }
        
        const productData = {
            name: name,
            description: description,
            price: parseFloat(price),
            company: { id: companyId },
            productCategory: categoryId ? { id: categoryId } : null,
            productType: typeId ? { id: typeId } : null
        };
        
        try {
            let response;
            const imagesInput = document.getElementById('productImages');
            const selection = document.getElementById('titleImageSelection').value;
            
            if (currentEditingProduct) {
                productData.id = currentEditingProduct.id;
                
                // If no new images, use JSON PUT
                if (imagesInput.files.length === 0) {
                    let putUrl = `/api/products/${currentEditingProduct.id}`;
                    if (selection && selection.startsWith('existing:')) {
                        const idVal = selection.split(':')[1];
                        putUrl += `?titleImageId=${encodeURIComponent(idVal)}`;
                    }
                    if (imagesToDelete.length > 0) {
                        const delParam = encodeURIComponent(JSON.stringify(imagesToDelete));
                        putUrl += (putUrl.includes('?') ? '&' : '?') + `imagesToDelete=${delParam}`;
                    }
                    response = await fetch(putUrl, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(productData)
                    });
                } else {
                    // Multipart PUT with images
                    const formData = new FormData();
                    formData.append('product', new Blob([JSON.stringify(productData)], { type: 'application/json' }));
                    
                    for (let i = 0; i < imagesInput.files.length; i++) {
                        if (deletedNewIndices.has(i)) continue;
                        formData.append('images', imagesInput.files[i]);
                    }
                    
                    if (selection) {
                        if (selection.startsWith('existing:')) {
                            const idVal = selection.split(':')[1];
                            formData.append('titleImageId', idVal);
                        } else if (selection.startsWith('new:')) {
                            const idx = selection.split(':')[1];
                            formData.append('titleImageIdx', idx);
                        }
                    }
                    
                    if (imagesToDelete.length > 0) {
                        formData.append('imagesToDelete', JSON.stringify(imagesToDelete));
                    }
                    
                    response = await fetch(`/api/products/${currentEditingProduct.id}`, {
                        method: 'PUT',
                        body: formData
                    });
                }
            } else {
                // POST for new product
                if (imagesInput.files.length === 0) {
                    response = await fetch('/api/products', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(productData)
                    });
                } else {
                    const formData = new FormData();
                    formData.append('product', new Blob([JSON.stringify(productData)], { type: 'application/json' }));
                    
                    for (let i = 0; i < imagesInput.files.length; i++) {
                        if (deletedNewIndices.has(i)) continue;
                        formData.append('images', imagesInput.files[i]);
                    }
                    
                    if (selection && selection.startsWith('new:')) {
                        const idx = selection.split(':')[1];
                        formData.append('titleImageIdx', idx);
                    }
                    
                    response = await fetch('/api/products', {
                        method: 'POST',
                        body: formData
                    });
                }
            }
            
            if (response.ok) {
                showAlert(currentEditingProduct ? 'Product updated successfully' : 'Product created successfully', 'success');
                closeDetailsView();
                resetFilters();
            } else {
                let errorMessage = 'Error saving product';
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
            console.error('Error saving product:', error);
            showAlert('Error saving product', 'error');
        }
    });
}

// View product details
async function viewProduct(id) {
    if (!id) return;
    
    try {
        const response = await fetch(`/api/products/${id}`);
        if (!response.ok) {
            showAlert('Product not found', 'error');
            return;
        }
        
        currentViewingProduct = await response.json();
        
        const detailsHtml = `
            <div class="details-grid">
                <div class="details-item">
                    <strong>Name</strong>
                    <div class="details-item-value">${currentViewingProduct.name}</div>
                </div>
                <div class="details-item">
                    <strong>Price</strong>
                    <div class="details-item-value">${currentViewingProduct.price || '0.00'}</div>
                </div>
                <div class="details-item">
                    <strong>Category</strong>
                    <div class="details-item-value">${currentViewingProduct.productCategory?.name || 'N/A'}</div>
                </div>
                <div class="details-item">
                    <strong>Type</strong>
                    <div class="details-item-value">${currentViewingProduct.productType?.name || 'N/A'}</div>
                </div>
                <div class="details-item" style="grid-column: 1 / -1;">
                    <strong>Description</strong>
                    <div class="details-item-value">${currentViewingProduct.description || 'N/A'}</div>
                </div>
            </div>
        `;
        
        document.getElementById('productDetails').innerHTML = detailsHtml;
        document.getElementById('productDetailsTitle').textContent = currentViewingProduct.name;
        
        document.getElementById('productDetailsContainer').style.display = 'block';
        document.getElementById('productFormContainer').style.display = 'none';
        switchTab('details-tab', null);
    } catch (error) {
        console.error('Error viewing product:', error);
        showAlert('Error loading product', 'error');
    }
}

// Edit product
function editProduct() {
    if (!currentViewingProduct) return;
    
    currentEditingProduct = currentViewingProduct;
    
    document.getElementById('formTitle').textContent = 'Edit Product';
    document.getElementById('productCompany').value = currentViewingProduct.company?.id || '';
    document.getElementById('productName').value = currentViewingProduct.name;
    document.getElementById('productDescription').value = currentViewingProduct.description || '';
    document.getElementById('productPrice').value = currentViewingProduct.price || '';
    
    // Load categories and types for the product's company
    loadCategories(currentViewingProduct.company?.id).then(() => {
        document.getElementById('productCategory').value = currentViewingProduct.productCategory?.id || '';
        loadTypes(currentViewingProduct.productCategory?.id).then(() => {
            document.getElementById('productType').value = currentViewingProduct.productType?.id || '';
        });
    });
    
    // Load existing images
    existingImages = currentViewingProduct.images && currentViewingProduct.images.length > 0 ? currentViewingProduct.images : [];
    document.getElementById('productImages').value = null;
    renderImagePreviews();
    
    document.getElementById('productDetailsContainer').style.display = 'none';
    document.getElementById('productFormContainer').style.display = 'block';
}

// Delete product
async function deleteProduct() {
    if (!currentViewingProduct) return;
    if (!confirm('Are you sure you want to delete this product?')) return;
    
    try {
        const response = await fetch(`/api/products/${currentViewingProduct.id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showAlert('Product deleted successfully', 'success');
            closeDetailsView();
            resetFilters();
        } else {
            showAlert('Error deleting product', 'error');
        }
    } catch (error) {
        console.error('Error deleting product:', error);
        showAlert('Error deleting product', 'error');
    }
}

// Image handling setup
function setupImageHandling() {
    const imagesInput = document.getElementById('productImages');
    const imagePreview = document.getElementById('imagePreview');
    const titleImageSelection = document.getElementById('titleImageSelection');
    
    // Event listeners for form dropdowns
    document.getElementById('productCompany').addEventListener('change', function() {
        loadCategories(this.value);
        document.getElementById('productCategory').value = '';
        document.getElementById('productType').value = '';
    });
    
    document.getElementById('productCategory').addEventListener('change', function() {
        loadTypes(this.value);
        document.getElementById('productType').value = '';
    });
    
    // Event listeners for search filters
    document.getElementById('companyFilter').addEventListener('change', function() {
        loadCategoriesForFilter(this.value);
        document.getElementById('categoryFilter').value = '';
        document.getElementById('productTypeFilter').value = '';
    });
    
    document.getElementById('categoryFilter').addEventListener('change', function() {
        loadTypesForFilter(this.value);
        document.getElementById('productTypeFilter').value = '';
    });
    
    imagesInput.addEventListener('change', () => {
        renderImagePreviews();
    });
}

function setSelectedValue(val, domEl) {
    selectedValue = val;
    document.getElementById('titleImageSelection').value = val;
    document.querySelectorAll('.img-wrap').forEach(w => w.classList.remove('border-primary', 'shadow'));
    if (domEl) {
        domEl.classList.add('border-primary', 'shadow');
    }
}

function renderImagePreviews() {
    const imagePreview = document.getElementById('imagePreview');
    const imagesInput = document.getElementById('productImages');
    imagePreview.innerHTML = '';
    
    // Render existing images
    existingImages.forEach((img) => {
        const wrap = document.createElement('div');
        wrap.className = 'd-flex align-items-center gap-2 me-2 mb-2 p-1 rounded border img-wrap';
        wrap.style.cursor = 'pointer';
        wrap.dataset.value = 'existing:' + img.id;

        const imgContainer = document.createElement('div');
        imgContainer.style.position = 'relative';
        const el = document.createElement('img');
        el.src = img.url;
        el.style.maxWidth = '80px';
        el.style.maxHeight = '80px';
        el.className = 'd-block';
        imgContainer.appendChild(el);

        if (img.titleImage) {
            const badge = document.createElement('span');
            badge.className = 'badge bg-primary position-absolute';
            badge.style.left = '6px';
            badge.style.top = '6px';
            badge.textContent = 'Title';
            imgContainer.appendChild(badge);
        }

        wrap.appendChild(imgContainer);

        const del = document.createElement('button');
        del.type = 'button';
        del.className = 'btn btn-sm btn-danger';
        del.style.padding = '0.15rem 0.35rem';
        del.style.lineHeight = '1';
        del.textContent = '×';
        del.title = 'Remove image';
        del.addEventListener('click', (ev) => {
            ev.stopPropagation();
            imagesToDelete.push(img.id);
            if (selectedValue === wrap.dataset.value) {
                selectedValue = null;
                document.getElementById('titleImageSelection').value = '';
            }
            wrap.remove();
        });

        wrap.addEventListener('click', () => setSelectedValue(wrap.dataset.value, wrap));
        wrap.appendChild(del);
        imagePreview.appendChild(wrap);

        if ((selectedValue && selectedValue === wrap.dataset.value) || (!selectedValue && img.titleImage)) {
            setSelectedValue(wrap.dataset.value, wrap);
        }
    });

    // Render newly selected files
    const files = Array.from(imagesInput.files || []);
    files.forEach((file, idx) => {
        if (deletedNewIndices.has(idx)) return;
        const wrap = document.createElement('div');
        wrap.className = 'd-flex align-items-center gap-2 me-2 mb-2 p-1 rounded border img-wrap';
        wrap.style.cursor = 'pointer';
        wrap.dataset.value = 'new:' + idx;

        const el = document.createElement('img');
        el.style.maxWidth = '80px';
        el.style.maxHeight = '80px';
        el.className = 'd-block';

        const reader = new FileReader();
        reader.onload = function(e) {
            el.src = e.target.result;
        };
        reader.readAsDataURL(file);

        const del = document.createElement('button');
        del.type = 'button';
        del.className = 'btn btn-sm btn-danger';
        del.style.padding = '0.15rem 0.35rem';
        del.style.lineHeight = '1';
        del.textContent = '×';
        del.title = 'Remove new image';
        del.addEventListener('click', (ev) => {
            ev.stopPropagation();
            deletedNewIndices.add(idx);
            if (selectedValue === wrap.dataset.value) {
                selectedValue = null;
                document.getElementById('titleImageSelection').value = '';
            }
            renderImagePreviews();
        });

        wrap.appendChild(el);
        wrap.appendChild(del);
        wrap.addEventListener('click', () => setSelectedValue(wrap.dataset.value, wrap));
        imagePreview.appendChild(wrap);
        if (selectedValue && selectedValue === wrap.dataset.value) setSelectedValue(wrap.dataset.value, wrap);
    });
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

function getAuthToken() {
    return localStorage.getItem('jwtToken') || (JSON.parse(localStorage.getItem('loginResponse')||'{}').token || '');
}

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
