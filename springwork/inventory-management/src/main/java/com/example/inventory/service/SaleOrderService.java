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
public class SaleOrderService {
    
    @Autowired
    private SaleOrderRepository saleOrderRepository;
    
    @Autowired
    private SaleOrderItemRepository saleOrderItemRepository;
    
    @Autowired
    private InventoryRepository inventoryRepository;
    
    @Autowired
    private ProductRepository productRepository;

    // Create a new sale order
    public SaleOrder createSaleOrder(SaleOrder saleOrder) {
        saleOrder.setCreatedAt(new Date());
        saleOrder.setUpdatedAt(new Date());
        if (saleOrder.getStatus() == null) {
            saleOrder.setStatus(SaleOrderStatus.PENDING);
        }
        calculateOrderTotals(saleOrder);
        
        // Set saleOrder reference on all items before saving
        if (saleOrder.getItems() != null && !saleOrder.getItems().isEmpty()) {
            for (SaleOrderItem item : saleOrder.getItems()) {
                item.setSaleOrder(saleOrder);
            }
        }
        
        return saleOrderRepository.save(saleOrder);
    }

    // Get all sale orders for a company
    public List<SaleOrder> getSaleOrdersByCompany(Long companyId) {
        return saleOrderRepository.findByCompanyId(companyId);
    }

    // Get a specific sale order
    public Optional<SaleOrder> getSaleOrderById(Long id) {
        return saleOrderRepository.findById(id);
    }

    // Update a sale order
    public SaleOrder updateSaleOrder(Long id, SaleOrder updatedSO) {
        Optional<SaleOrder> existing = saleOrderRepository.findById(id);
        if (existing.isPresent()) {
            SaleOrder so = existing.get();
            so.setInvoiceNumber(updatedSO.getInvoiceNumber());
            so.setCustomer(updatedSO.getCustomer());
            so.setSaleDate(updatedSO.getSaleDate());
            so.setDueDate(updatedSO.getDueDate());
            so.setStatus(updatedSO.getStatus());
            so.setPaymentMethod(updatedSO.getPaymentMethod());
            so.setNotes(updatedSO.getNotes());
            so.setUpdatedAt(new Date());
            
            calculateOrderTotals(so);
            return saleOrderRepository.save(so);
        }
        return null;
    }

    // Delete a sale order (only if PENDING)
    public boolean deleteSaleOrder(Long id) {
        Optional<SaleOrder> so = saleOrderRepository.findById(id);
        if (so.isPresent() && so.get().getStatus() == SaleOrderStatus.PENDING) {
            saleOrderRepository.deleteById(id);
            return true;
        }
        return false;
    }

    // Add item to sale order
    public SaleOrderItem addItemToSaleOrder(Long soId, SaleOrderItem item) {
        Optional<SaleOrder> so = saleOrderRepository.findById(soId);
        if (so.isPresent()) {
            item.setSaleOrder(so.get());
            if (item.getUnitPrice() != null && item.getQuantity() != null) {
                item.setSubtotal(item.getUnitPrice() * item.getQuantity());
            }
            SaleOrderItem saved = saleOrderItemRepository.save(item);
            // Update the total amount in the SO
            calculateOrderTotals(so.get());
            saleOrderRepository.save(so.get());
            return saved;
        }
        return null;
    }

    // Update a sale order item
    public SaleOrderItem updateSaleOrderItem(Long itemId, SaleOrderItem updatedItem) {
        Optional<SaleOrderItem> existing = saleOrderItemRepository.findById(itemId);
        if (existing.isPresent()) {
            SaleOrderItem item = existing.get();
            item.setQuantity(updatedItem.getQuantity());
            item.setUnitPrice(updatedItem.getUnitPrice());
            item.setDiscount(updatedItem.getDiscount());
            item.setTax(updatedItem.getTax());
            if (item.getUnitPrice() != null && item.getQuantity() != null) {
                item.setSubtotal(item.getUnitPrice() * item.getQuantity());
            }
            SaleOrderItem saved = saleOrderItemRepository.save(item);
            // Update the total amount in the SO
            if (item.getSaleOrder() != null) {
                calculateOrderTotals(item.getSaleOrder());
                saleOrderRepository.save(item.getSaleOrder());
            }
            return saved;
        }
        return null;
    }

    // Remove item from sale order
    public boolean removeItemFromSaleOrder(Long itemId) {
        Optional<SaleOrderItem> item = saleOrderItemRepository.findById(itemId);
        if (item.isPresent()) {
            SaleOrderItem soItem = item.get();
            SaleOrder so = soItem.getSaleOrder();
            
            // Remove item from the SO's items collection first
            if (so != null && so.getItems() != null) {
                so.getItems().remove(soItem);
            }
            
            // Delete the item
            saleOrderItemRepository.deleteById(itemId);
            
            // Recalculate and save the SO
            if (so != null) {
                calculateOrderTotals(so);
                saleOrderRepository.save(so);
            }
            return true;
        }
        return false;
    }

    // Complete sale order (reduce inventory and mark as completed)
    public boolean completeSaleOrder(Long soId) {
        return completeSaleOrder(soId, false);
    }
    
    // Complete sale order with optional negative stock allowance
    public boolean completeSaleOrder(Long soId, boolean allowNegativeStock) {
        Optional<SaleOrder> so = saleOrderRepository.findById(soId);
        if (!so.isPresent()) {
            return false;
        }

        SaleOrder saleOrder = so.get();
        
        // Check if all items have sufficient inventory (unless negative stock is allowed)
        if (!allowNegativeStock) {
            for (SaleOrderItem item : saleOrder.getItems()) {
                Optional<Inventory> inventoryOpt = inventoryRepository.findAll().stream()
                    .filter(inv -> inv.getProduct().getId().equals(item.getProduct().getId()))
                    .findFirst();
                
                if (!inventoryOpt.isPresent() || inventoryOpt.get().getQuantity() < item.getQuantity()) {
                    return false; // Insufficient inventory
                }
            }
        }

        // Reduce inventory for all items
        for (SaleOrderItem item : saleOrder.getItems()) {
            Optional<Inventory> inventoryOpt = inventoryRepository.findAll().stream()
                .filter(inv -> inv.getProduct().getId().equals(item.getProduct().getId()))
                .findFirst();
            
            if (inventoryOpt.isPresent()) {
                Inventory inventory = inventoryOpt.get();
                inventory.setQuantity(inventory.getQuantity() - item.getQuantity());
                inventoryRepository.save(inventory);
            }
        }

        // Update SO status to COMPLETED
        saleOrder.setStatus(SaleOrderStatus.COMPLETED);
        saleOrder.setUpdatedAt(new Date());
        saleOrderRepository.save(saleOrder);
        return true;
    }

    // Calculate totals for the sale order (subtotal, discount, tax, final amount)
    private void calculateOrderTotals(SaleOrder saleOrder) {
        double subtotal = 0;
        double totalDiscount = 0;
        double totalTax = 0;
        
        if (saleOrder.getItems() != null) {
            for (SaleOrderItem item : saleOrder.getItems()) {
                if (item.getSubtotal() != null) {
                    subtotal += item.getSubtotal();
                }
                if (item.getDiscount() != null) {
                    totalDiscount += item.getDiscount();
                }
                if (item.getTax() != null) {
                    totalTax += item.getTax();
                }
            }
        }
        
        // Add order-level discount if specified
        if (saleOrder.getDiscountAmount() != null) {
            totalDiscount += saleOrder.getDiscountAmount();
        }
        
        // Add order-level tax if specified
        if (saleOrder.getTaxAmount() != null) {
            totalTax += saleOrder.getTaxAmount();
        }
        
        saleOrder.setTotalAmount(subtotal);
        saleOrder.setDiscountAmount(totalDiscount);
        saleOrder.setTaxAmount(totalTax);
        saleOrder.setFinalAmount(subtotal - totalDiscount + totalTax);
    }
}
