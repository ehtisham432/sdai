# Purchase Order Management - Feature Documentation

## Overview

The Purchase Order Management system is a complete CRUD (Create, Read, Update, Delete) solution with inventory management capabilities. This feature allows you to:

- Create and manage purchase orders from suppliers
- Track ordered items and quantities
- Receive inventory and automatically update stock levels
- Monitor delivery status and outstanding orders

## Features

### 1. **Create Purchase Orders**
- Specify PO number, supplier, and company
- Set order and expected delivery dates
- Add multiple items with quantities and unit prices
- Add notes for internal reference
- Automatic calculation of total amounts

### 2. **Manage Items in Orders**
- Add/remove items from purchase orders
- Track unit price and calculated subtotals
- Monitor received vs. ordered quantities
- Edit items before order is received

### 3. **Receive Inventory**
- Partially or fully receive items from purchase orders
- Automatic inventory updates when items are received
- Visual progress tracking of received quantities
- Create new inventory records automatically if needed

### 4. **View & Filter**
- Filter by company, supplier, and status (Pending/Received/Cancelled)
- View all orders, pending orders, or received orders
- See order details including items and totals
- Track inventory progress

### 5. **Delete/Cancel Orders**
- Delete pending purchase orders
- Cannot delete orders that have been received
- Protects data integrity

## API Endpoints

### Purchase Orders
```
GET    /purchase-orders                    - Get all POs (with optional company filter)
GET    /purchase-orders/{id}              - Get specific PO with items
POST   /purchase-orders                   - Create new PO
PUT    /purchase-orders/{id}              - Update PO
DELETE /purchase-orders/{id}              - Delete PO (PENDING only)
```

### Purchase Order Items
```
GET    /purchase-orders/{id}/items        - Get items in a PO
POST   /purchase-orders/{id}/items        - Add item to PO
PUT    /purchase-orders/items/{itemId}   - Update PO item
DELETE /purchase-orders/items/{itemId}   - Remove item from PO
```

### Inventory Management
```
POST   /purchase-orders/{id}/receive-inventory  - Receive items and update inventory
```

## Data Models

### PurchaseOrder Entity
```java
{
  "id": Long,
  "company": Company,              // Required
  "createdBy": User,               // Required
  "poNumber": String,              // Unique purchase order number
  "supplier": String,              // Supplier name
  "orderDate": Date,               // Date order was placed
  "expectedDeliveryDate": Date,    // Expected delivery date
  "totalAmount": Double,           // Auto-calculated total
  "status": PurchaseOrderStatus,   // PENDING | RECEIVED | CANCELLED
  "items": List<PurchaseOrderItem>,// Line items in the order
  "notes": String,                 // Internal notes
  "createdAt": Date,               // Auto-set creation timestamp
  "updatedAt": Date                // Auto-updated modification timestamp
}
```

### PurchaseOrderStatus Enum
- **PENDING**: Order has been created but not fully received
- **RECEIVED**: All items in the order have been received
- **CANCELLED**: Order has been cancelled

### PurchaseOrderItem Entity
```java
{
  "id": Long,
  "purchaseOrder": PurchaseOrder,   // Parent PO (ignored in responses)
  "product": Product,               // Product being ordered
  "quantity": Integer,              // Ordered quantity
  "unitPrice": Double,              // Price per unit
  "subtotal": Double,               // quantity × unitPrice
  "receivedQuantity": Integer       // How much has been received
}
```

## Web Interface

### Purchase Orders Screen (`/purchase-orders.html`)

#### Main Tabs
1. **All Orders** - View all purchase orders
2. **Pending** - View orders awaiting delivery
3. **Received** - View completed orders

#### Filter Options
- **Company** - Filter by company
- **Status** - Filter by PENDING/RECEIVED/CANCELLED

#### Actions
- **New Purchase Order** - Create new PO
- **View** - See PO details and items
- **Edit** - Modify pending orders
- **Receive Inventory** - Record receipt and update stock
- **Delete** - Remove pending orders

### Create/Edit Purchase Order Modal
- PO Number (required)
- Company (required)
- Supplier (required)
- Order Date (required)
- Expected Delivery Date
- Status
- Notes
- Add items with product, quantity, and price
- Visual total amount calculation

### Receive Inventory Form
- Shows items pending receipt
- Input fields for quantity to receive per item
- Auto-calculates remaining quantities
- Updates inventory and marks items as received

## Database Schema

### Tables
- `purchase_order` - Main PO records
- `purchase_order_item` - Line items in orders
- `inventory` - Stock levels (updated on receipt)

### Key Relationships
- PurchaseOrder → Company (Many-to-One)
- PurchaseOrder → User (Many-to-One, createdBy)
- PurchaseOrderItem → PurchaseOrder (Many-to-One)
- PurchaseOrderItem → Product (Many-to-One)
- PurchaseOrder → PurchaseOrderItem (One-to-Many)

## Usage Workflow

### 1. Create a Purchase Order
```javascript
POST /purchase-orders
{
  "poNumber": "PO-2025-001",
  "company": { "id": 1 },
  "createdBy": { "id": 1 },
  "supplier": "ABC Supplies",
  "orderDate": "2025-12-25T00:00:00Z",
  "expectedDeliveryDate": "2026-01-15T00:00:00Z",
  "status": "PENDING",
  "notes": "Rush delivery if possible"
}
```

### 2. Add Items to PO
```javascript
POST /purchase-orders/{id}/items
{
  "product": { "id": 5 },
  "quantity": 100,
  "unitPrice": 25.50,
  "subtotal": 2550.00,
  "receivedQuantity": 0
}
```

### 3. Receive Inventory
```javascript
POST /purchase-orders/{id}/receive-inventory
[
  {
    "itemId": 10,
    "quantity": 100
  }
]
```

## Frontend JavaScript Functions

### Core Functions
- `loadPurchaseOrders()` - Fetch and display all POs
- `openCreatePOModal()` - Open create PO dialog
- `viewPurchaseOrder(id)` - View PO details
- `editPurchaseOrder()` - Edit existing PO
- `deletePurchaseOrder(id)` - Delete PO
- `showReceiveInventoryForm()` - Show receive form
- `submitReceiveInventory()` - Process inventory receipt

### Helper Functions
- `addItemToPOForm()` - Add item to form
- `removeItemFromForm(index)` - Remove item from form
- `filterPurchaseOrders()` - Apply filters
- `switchTab(tabName)` - Change view tabs
- `formatDate(dateString)` - Format dates for display

## Form Validation

- **PO Number**: Required, unique
- **Company**: Required
- **Supplier**: Required
- **Order Date**: Required
- **Items**: At least one item with:
  - Product selected
  - Quantity > 0
  - Unit Price ≥ 0

## Authentication

The system uses JWT-based authentication. The `createdBy` field is automatically populated from the JWT token payload. Ensure the token is stored in localStorage with key `token`.

## Error Handling

### Client-Side
- Input validation before submission
- User-friendly error messages
- Alert notifications for success/failure

### Server-Side
- HTTP 400 - Bad request (validation failures)
- HTTP 404 - Purchase order not found
- HTTP 500 - Server errors

## Access Control

The Purchase Order management is accessible from:
1. Direct URL: `/purchase-orders.html`
2. Home page button: "Purchase Orders"
3. Header menu (if configured in Screen management)

## Files Included

### Backend
- `PurchaseOrder.java` - Main entity
- `PurchaseOrderStatus.java` - Status enum
- `PurchaseOrderItem.java` - Line item entity
- `PurchaseOrderRepository.java` - Data access
- `PurchaseOrderItemRepository.java` - Item data access
- `PurchaseOrderService.java` - Business logic
- `PurchaseOrderController.java` - REST endpoints

### Frontend
- `purchase-orders.html` - User interface
- `js/purchase-orders.js` - Functionality

## Best Practices

1. **Create Orders with Clear PO Numbers** - Use consistent numbering scheme
2. **Set Realistic Delivery Dates** - Helps with inventory planning
3. **Review Items Before Sending** - Verify quantities and prices
4. **Receive Inventory Promptly** - Keep stock levels accurate
5. **Use Notes for Special Requests** - Communicate requirements to suppliers

## Performance Considerations

- Large POs (100+ items) render efficiently with pagination support
- Inventory updates are transactional to maintain data consistency
- Filtering is client-side for responsive UI
- Consider server-side pagination for thousands of POs

## Future Enhancements

Potential improvements:
- Purchase order approval workflow
- Supplier rating and performance tracking
- Automatic reorder point calculations
- Price history and trend analysis
- Barcode scanning for receipt
- Email notifications for deliveries
- PDF generation for printing

## Support & Troubleshooting

### Common Issues

**Issue**: "Can only delete PENDING purchase orders"
- **Solution**: Only PENDING orders can be deleted. Cancel or mark as received first.

**Issue**: Inventory not updating after receive
- **Solution**: Ensure all quantities are filled and submitted. Check server logs for errors.

**Issue**: Product dropdown not loading
- **Solution**: Verify authentication token is valid and products exist in the system.

## Summary

The Purchase Order Management system provides a robust solution for managing supplier orders and maintaining accurate inventory levels. With CRUD operations, inventory tracking, and a user-friendly interface, it integrates seamlessly with the overall inventory management platform.
