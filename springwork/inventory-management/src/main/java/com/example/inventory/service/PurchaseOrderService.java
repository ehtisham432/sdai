package com.example.inventory.service;

import com.example.inventory.*;
import com.example.inventory.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Date;
import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class PurchaseOrderService {
    
    @Autowired
    private PurchaseOrderRepository purchaseOrderRepository;
    
    @Autowired
    private PurchaseOrderItemRepository purchaseOrderItemRepository;
    
    @Autowired
    private InventoryRepository inventoryRepository;
    
    @Autowired
    private ProductRepository productRepository;

    // Create a new purchase order
    public PurchaseOrder createPurchaseOrder(PurchaseOrder purchaseOrder) {
        purchaseOrder.setCreatedAt(new Date());
        purchaseOrder.setUpdatedAt(new Date());
        if (purchaseOrder.getStatus() == null) {
            purchaseOrder.setStatus(PurchaseOrderStatus.PENDING);
        }
        calculateOrderTotal(purchaseOrder);
        
        // Set purchaseOrder reference on all items before saving
        if (purchaseOrder.getItems() != null && !purchaseOrder.getItems().isEmpty()) {
            for (PurchaseOrderItem item : purchaseOrder.getItems()) {
                item.setPurchaseOrder(purchaseOrder);
                if (item.getReceivedQuantity() == null) {
                    item.setReceivedQuantity(0);
                }
            }
        }
        
        return purchaseOrderRepository.save(purchaseOrder);
    }

    // Get all purchase orders for a company
    public List<PurchaseOrder> getPurchaseOrdersByCompany(Long companyId) {
        return purchaseOrderRepository.findByCompanyId(companyId);
    }

    // Get a specific purchase order
    public Optional<PurchaseOrder> getPurchaseOrderById(Long id) {
        return purchaseOrderRepository.findById(id);
    }

    // Update a purchase order
    public PurchaseOrder updatePurchaseOrder(Long id, PurchaseOrder updatedPO) {
        Optional<PurchaseOrder> existing = purchaseOrderRepository.findById(id);
        if (existing.isPresent()) {
            PurchaseOrder po = existing.get();
            po.setPoNumber(updatedPO.getPoNumber());
            po.setSupplier(updatedPO.getSupplier());
            po.setOrderDate(updatedPO.getOrderDate());
            po.setExpectedDeliveryDate(updatedPO.getExpectedDeliveryDate());
            po.setStatus(updatedPO.getStatus());
            po.setNotes(updatedPO.getNotes());
            po.setUpdatedAt(new Date());
            
            // Handle items if provided
            if (updatedPO.getItems() != null && !updatedPO.getItems().isEmpty()) {
                for (PurchaseOrderItem item : updatedPO.getItems()) {
                    item.setPurchaseOrder(po);
                }
                po.setItems(updatedPO.getItems());
            }
            
            calculateOrderTotal(po);
            return purchaseOrderRepository.save(po);
        }
        return null;
    }

    // Delete a purchase order (only if PENDING)
    public boolean deletePurchaseOrder(Long id) {
        Optional<PurchaseOrder> po = purchaseOrderRepository.findById(id);
        if (po.isPresent() && po.get().getStatus() == PurchaseOrderStatus.PENDING) {
            purchaseOrderRepository.deleteById(id);
            return true;
        }
        return false;
    }

    // Add item to purchase order
    public PurchaseOrderItem addItemToPurchaseOrder(Long poId, PurchaseOrderItem item) {
        Optional<PurchaseOrder> po = purchaseOrderRepository.findById(poId);
        if (po.isPresent()) {
            item.setPurchaseOrder(po.get());
            if (item.getReceivedQuantity() == null) {
                item.setReceivedQuantity(0);
            }
            if (item.getUnitPrice() != null && item.getQuantity() != null) {
                item.setSubtotal(item.getUnitPrice() * item.getQuantity());
            }
            PurchaseOrderItem saved = purchaseOrderItemRepository.save(item);
            // Update the total amount in the PO
            calculateOrderTotal(po.get());
            purchaseOrderRepository.save(po.get());
            return saved;
        }
        return null;
    }

    // Update a purchase order item
    public PurchaseOrderItem updatePurchaseOrderItem(Long itemId, PurchaseOrderItem updatedItem) {
        Optional<PurchaseOrderItem> existing = purchaseOrderItemRepository.findById(itemId);
        if (existing.isPresent()) {
            PurchaseOrderItem item = existing.get();
            item.setQuantity(updatedItem.getQuantity());
            item.setUnitPrice(updatedItem.getUnitPrice());
            if (item.getUnitPrice() != null && item.getQuantity() != null) {
                item.setSubtotal(item.getUnitPrice() * item.getQuantity());
            }
            PurchaseOrderItem saved = purchaseOrderItemRepository.save(item);
            // Update the total amount in the PO
            if (item.getPurchaseOrder() != null) {
                calculateOrderTotal(item.getPurchaseOrder());
                purchaseOrderRepository.save(item.getPurchaseOrder());
            }
            return saved;
        }
        return null;
    }

    // Remove item from purchase order
    public boolean removeItemFromPurchaseOrder(Long itemId) {
        Optional<PurchaseOrderItem> item = purchaseOrderItemRepository.findById(itemId);
        if (item.isPresent()) {
            PurchaseOrder po = item.get().getPurchaseOrder();
            purchaseOrderItemRepository.deleteById(itemId);
            // Update the total amount in the PO
            calculateOrderTotal(po);
            purchaseOrderRepository.save(po);
            return true;
        }
        return false;
    }

    // Receive inventory from purchase order (update inventory and mark items as received)
    public boolean receiveInventory(Long poId, List<InventoryReceiptItem> receiptItems) {
        Optional<PurchaseOrder> po = purchaseOrderRepository.findById(poId);
        if (!po.isPresent()) {
            return false;
        }

        PurchaseOrder purchaseOrder = po.get();
        boolean allReceived = true;

        for (InventoryReceiptItem receiptItem : receiptItems) {
            Optional<PurchaseOrderItem> poItem = purchaseOrderItemRepository.findById(receiptItem.getItemId());
            if (poItem.isPresent()) {
                PurchaseOrderItem item = poItem.get();
                Integer quantityToReceive = receiptItem.getQuantity();
                
                // Update received quantity
                int currentReceived = item.getReceivedQuantity() != null ? item.getReceivedQuantity() : 0;
                item.setReceivedQuantity(currentReceived + quantityToReceive);
                purchaseOrderItemRepository.save(item);

                // Update inventory
                Optional<Inventory> inventoryOpt = inventoryRepository.findAll().stream()
                    .filter(inv -> inv.getProduct().getId().equals(item.getProduct().getId()))
                    .findFirst();

                if (inventoryOpt.isPresent()) {
                    Inventory inventory = inventoryOpt.get();
                    inventory.setQuantity(inventory.getQuantity() + quantityToReceive);
                    inventoryRepository.save(inventory);
                } else {
                    // Create new inventory record if it doesn't exist
                    Inventory inventory = new Inventory();
                    inventory.setProduct(item.getProduct());
                    inventory.setQuantity(quantityToReceive);
                    inventoryRepository.save(inventory);
                }

                // Check if all items have been fully received
                if (item.getReceivedQuantity() < item.getQuantity()) {
                    allReceived = false;
                }
            }
        }

        // Update PO status if all items received
        if (allReceived) {
            purchaseOrder.setStatus(PurchaseOrderStatus.RECEIVED);
        }
        purchaseOrder.setUpdatedAt(new Date());
        purchaseOrderRepository.save(purchaseOrder);
        return true;
    }

    // Calculate total amount for the purchase order
    private void calculateOrderTotal(PurchaseOrder purchaseOrder) {
        double total = 0;
        if (purchaseOrder.getItems() != null) {
            for (PurchaseOrderItem item : purchaseOrder.getItems()) {
                if (item.getSubtotal() != null) {
                    total += item.getSubtotal();
                }
            }
        }
        purchaseOrder.setTotalAmount(total);
    }

    // Helper class for inventory receipt
    public static class InventoryReceiptItem {
        private Long itemId;
        private Integer quantity;

        public Long getItemId() {
            return itemId;
        }

        public void setItemId(Long itemId) {
            this.itemId = itemId;
        }

        public Integer getQuantity() {
            return quantity;
        }

        public void setQuantity(Integer quantity) {
            this.quantity = quantity;
        }
    }
}
