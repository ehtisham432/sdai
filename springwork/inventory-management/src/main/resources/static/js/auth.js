// Auth utility - check token and redirect if not authenticated
(function() {
    // Get token from localStorage (use same key as login.html stores it)
    const token = localStorage.getItem('jwtToken');
    const currentPage = window.location.pathname;
    
    // Pages that require authentication
    const protectedPages = [
        '/product.html',
        '/company.html',
        '/user.html',
        '/roles.html',
        '/screens.html',
        '/screen-groups.html',
        '/role-screens.html',
        '/display-types.html',
        '/product-category.html',
        '/product-types.html',
        '/product-image.html'
    ];
    
    // Check if current page is protected
    const isProtected = protectedPages.some(page => currentPage.includes(page));
    
    if (isProtected && !token) {
        // Redirect to login if token is missing
        window.location.href = '/login.html';
        return;
    }
    
    // If token exists, intercept all fetch requests
    if (token) {
        // Store token globally for debugging
        window.jwtToken = token;
        
        // Override native fetch to add Authorization header
        const originalFetch = window.fetch;
        window.fetch = function(...args) {
            const [resource, config] = args;
            
            // Create a new config object with Authorization header
            const newConfig = {
                ...config,
                headers: {
                    ...(config && config.headers),
                    'Authorization': `Bearer ${token}`
                }
            };
            
            console.log(`[JWT] Adding token to request: ${resource}`);
            
            return originalFetch(resource, newConfig);
        };
        
        console.log('[JWT] Auth interceptor loaded with token:', token.substring(0, 20) + '...');
    }
})();
