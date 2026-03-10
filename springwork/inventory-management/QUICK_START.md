# Quick Start Guide - Purchase Order Management

## 🚀 Getting Started in 5 Minutes

### 1. Start the Application
```bash
cd inventory-management
mvn spring-boot:run
```

Application will be available at `http://localhost:8080`

### 2. Access Purchase Orders Screen
Navigate to: `http://localhost:8080/purchase-orders.html`

Or click "Purchase Orders" button on the homepage.

## 📝 First Time Setup

### Create Test Purchase Order

1. **Click "+ New Purchase Order"**
   - PO Number: `PO-2025-001`
   - Company: Select any company
   - Supplier: `Test Supplier Co.`
   - Order Date: Today's date
   - Expected Delivery: 2 weeks from now

2. **Add Items**
   - Click item product dropdown
   - Select a product
   - Enter quantity: `10`
   - Enter unit price: `25.50`
   - Click "Add" button
   - Add 2-3 items

3. **Save**
   - Click "Save Purchase Order"
   - See success message
   - Order appears in "All Orders" tab

## 🔄 Common Operations

### View Purchase Order Details
```
1. Click "View" button on any order
2. See all items and totals
3. Check inventory progress
4. View order information
```

### Receive Inventory
```
1. View a PENDING order
2. Click "Receive Inventory"
3. Enter quantities to receive
4. Click "Confirm Receive"
5. Inventory stock automatically updated
6. Order status changes to RECEIVED
```

### Edit Pending Order
```
1. View the order
2. Click "Edit" button
3. Modify details and items
4. Click "Save Purchase Order"
5. Changes applied
```

### Delete Order
```
1. View the order
2. Click "Delete" button (PENDING only)
3. Confirm deletion
4. Order removed
```

### Filter Orders
```
Company Filter:
- Click dropdown → Select company → Auto-filters

Status Filter:
- Click dropdown → Select PENDING/RECEIVED/CANCELLED

Clear Filters:
- Click "Clear Filters" button
```

## 📊 View Different Tabs

### All Orders Tab
Shows every purchase order with:
- PO Number
- Supplier
- Company
- Order Date
- Total Amount
- Status badge

### Pending Tab
Shows only PENDING orders with:
- Action buttons to View/Delete
- Expected delivery dates
- Outstanding amounts

### Received Tab
Shows completed orders with:
- Number of items received
- Delivery dates
- Final amounts

## 🔑 Key Features

### Automatic Calculations
- Subtotals calculated as you enter price and quantity
- Total amount updates automatically
- Inventory adjusted when items received

### Smart Status Management
- Orders start as PENDING
- Become RECEIVED when all items received
- Can be CANCELLED manually
- Only PENDING orders can be deleted

### Inventory Integration
- Stock levels increase when inventory received
- Creates inventory records automatically if needed
- Tracks partial receipts with progress indicator

## 💡 Tips & Tricks

1. **Bulk Operations**: Add multiple items before saving to see total impact

2. **Partial Receipts**: Receive items in multiple shipments - order stays PENDING until complete

3. **Filter & Sort**: Use tabs to quickly find orders by status

4. **Notes Field**: Add delivery instructions or special requirements

5. **Supplier Names**: Keep consistent naming for supplier reports

## 📱 Mobile Usage

Works on:
- ✓ Desktop browsers
- ✓ Tablets
- ✓ Mobile phones
- ✓ All modern browsers (Chrome, Firefox, Safari, Edge)

Responsive design automatically adjusts to screen size.

## 🔒 Authentication

- Login first at `http://localhost:8080/login.html`
- Token automatically stored
- JWT token identifies you as creator of orders
- Valid token required for all operations

## ⚠️ Important Notes

1. **Only PENDING orders can be edited or deleted**
   - Once RECEIVED, order is locked for data integrity

2. **Inventory updates are permanent**
   - Once inventory received, stock levels are increased
   - Cannot undo receipt operations (design for accuracy)

3. **Company is required**
   - Each order must be assigned to a company
   - Affects inventory allocation

4. **Supplier tracking**
   - Keep supplier names consistent
   - Useful for reports and analytics

## 🐛 Troubleshooting

### "Can only delete PENDING purchase orders"
- Order has been received
- Cannot modify or delete received orders

### "Company and CreatedBy are required"
- Select a company from dropdown
- Ensure you're logged in (token valid)

### Products not loading in dropdown
- Check products exist in system
- Verify database connection
- Check authentication token

### Inventory not updating
- Ensure quantity is specified for receipt
- Check browser console for errors
- Verify purchase order exists

## 📖 Full Documentation

For detailed information, see:
- [PURCHASE_ORDERS.md](PURCHASE_ORDERS.md) - Complete feature documentation
- [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) - Technical overview
- [README.md](README.md) - Project overview

## 🎯 Next Steps

After creating your first order:

1. ✅ Create 2-3 test purchase orders
2. ✅ Add items to each order
3. ✅ Practice filtering and viewing
4. ✅ Receive some inventory items
5. ✅ Check inventory levels updated
6. ✅ Explore other tabs and features

## 🤝 Support

- Check browser console (F12) for any errors
- Review server logs for validation issues
- Ensure database is running
- Verify JWT token is valid

---

**Ready to go!** Start with creating a purchase order now. 🎉
