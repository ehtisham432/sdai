package com.example.inventory.controller;

import com.example.inventory.*;
import com.example.inventory.repository.*;
import com.example.inventory.service.PurchaseOrderService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@RestController
@RequestMapping("/purchase-orders")
@CrossOrigin(origins = "*")
public class PurchaseOrderController {
    private static final Logger logger = LoggerFactory.getLogger(PurchaseOrderController.class);
    
    @Autowired
    private PurchaseOrderService purchaseOrderService;
    
    @Autowired
    private PurchaseOrderRepository purchaseOrderRepository;
    
    @Autowired
    private PurchaseOrderItemRepository purchaseOrderItemRepository;
    
    @Autowired
    private ProductRepository productRepository;

    // Get all purchase orders for a company
    @GetMapping
    public ResponseEntity<?> getPurchaseOrders(@RequestParam(required = false) Long companyId) {
        try {
            List<PurchaseOrder> orders;
            if (companyId != null) {
                orders = purchaseOrderService.getPurchaseOrdersByCompany(companyId);
            } else {
                orders = purchaseOrderRepository.findAll();
            }
            List<PurchaseOrderDTO> dtos = orders.stream()
                .map(PurchaseOrderDTO::fromPurchaseOrder)
                .collect(Collectors.toList());
            return ResponseEntity.ok(dtos);
        } catch (Exception e) {
            logger.error("Error retrieving purchase orders", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error retrieving purchase orders");
        }
    }

    // Get a specific purchase order with items
    @GetMapping("/{id}")
    public ResponseEntity<?> getPurchaseOrder(@PathVariable Long id) {
        try {
            Optional<PurchaseOrder> po = purchaseOrderService.getPurchaseOrderById(id);
            if (po.isPresent()) {
                PurchaseOrderDTO dto = PurchaseOrderDTO.fromPurchaseOrder(po.get());
                return ResponseEntity.ok(dto);
            }
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Purchase order not found");
        } catch (Exception e) {
            logger.error("Error retrieving purchase order", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error retrieving purchase order");
        }
    }

    // Create a new purchase order
    @PostMapping
    public ResponseEntity<?> createPurchaseOrder(@RequestBody PurchaseOrder purchaseOrder) {
        try {
            if (purchaseOrder.getCompany() == null || purchaseOrder.getCreatedBy() == null) {
                return ResponseEntity.badRequest().body("Company and CreatedBy are required");
            }
            PurchaseOrder saved = purchaseOrderService.createPurchaseOrder(purchaseOrder);
            return ResponseEntity.status(HttpStatus.CREATED).body(PurchaseOrderDTO.fromPurchaseOrder(saved));
        } catch (Exception e) {
            logger.error("Error creating purchase order", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error creating purchase order");
        }
    }

    // Update a purchase order
    @PutMapping("/{id}")
    public ResponseEntity<?> updatePurchaseOrder(@PathVariable Long id, @RequestBody PurchaseOrder purchaseOrder) {
        try {
            PurchaseOrder updated = purchaseOrderService.updatePurchaseOrder(id, purchaseOrder);
            if (updated != null) {
                return ResponseEntity.ok(PurchaseOrderDTO.fromPurchaseOrder(updated));
            }
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Purchase order not found");
        } catch (Exception e) {
            logger.error("Error updating purchase order", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error updating purchase order");
        }
    }

    // Delete a purchase order
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deletePurchaseOrder(@PathVariable Long id) {
        try {
            if (purchaseOrderService.deletePurchaseOrder(id)) {
                return ResponseEntity.ok().body("Purchase order deleted successfully");
            }
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Can only delete PENDING purchase orders");
        } catch (Exception e) {
            logger.error("Error deleting purchase order", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error deleting purchase order");
        }
    }

    // Get items in a purchase order
    @GetMapping("/{id}/items")
    public ResponseEntity<?> getPurchaseOrderItems(@PathVariable Long id) {
        try {
            List<PurchaseOrderItem> items = purchaseOrderItemRepository.findByPurchaseOrderId(id);
            List<PurchaseOrderItemDTO> dtos = items.stream()
                .map(PurchaseOrderItemDTO::fromPurchaseOrderItem)
                .collect(Collectors.toList());
            return ResponseEntity.ok(dtos);
        } catch (Exception e) {
            logger.error("Error retrieving purchase order items", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error retrieving items");
        }
    }

    // Add an item to purchase order
    @PostMapping("/{id}/items")
    public ResponseEntity<?> addItemToPurchaseOrder(@PathVariable Long id, @RequestBody PurchaseOrderItem item) {
        try {
            PurchaseOrderItem saved = purchaseOrderService.addItemToPurchaseOrder(id, item);
            if (saved != null) {
                return ResponseEntity.status(HttpStatus.CREATED).body(PurchaseOrderItemDTO.fromPurchaseOrderItem(saved));
            }
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Purchase order not found");
        } catch (Exception e) {
            logger.error("Error adding item to purchase order", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error adding item");
        }
    }

    // Update a purchase order item
    @PutMapping("/items/{itemId}")
    public ResponseEntity<?> updatePurchaseOrderItem(@PathVariable Long itemId, @RequestBody PurchaseOrderItem item) {
        try {
            PurchaseOrderItem updated = purchaseOrderService.updatePurchaseOrderItem(itemId, item);
            if (updated != null) {
                return ResponseEntity.ok(PurchaseOrderItemDTO.fromPurchaseOrderItem(updated));
            }
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Item not found");
        } catch (Exception e) {
            logger.error("Error updating purchase order item", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error updating item");
        }
    }

    // Remove an item from purchase order
    @DeleteMapping("/items/{itemId}")
    public ResponseEntity<?> removeItemFromPurchaseOrder(@PathVariable Long itemId) {
        try {
            if (purchaseOrderService.removeItemFromPurchaseOrder(itemId)) {
                return ResponseEntity.ok().body("Item removed successfully");
            }
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Item not found");
        } catch (Exception e) {
            logger.error("Error removing item from purchase order", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error removing item");
        }
    }

    // Receive inventory from purchase order
    @PostMapping("/{id}/receive-inventory")
    public ResponseEntity<?> receiveInventory(@PathVariable Long id, @RequestBody List<PurchaseOrderService.InventoryReceiptItem> items) {
        try {
            if (purchaseOrderService.receiveInventory(id, items)) {
                Optional<PurchaseOrder> po = purchaseOrderService.getPurchaseOrderById(id);
                if (po.isPresent()) {
                    return ResponseEntity.ok(PurchaseOrderDTO.fromPurchaseOrder(po.get()));
                }
            }
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Purchase order not found");
        } catch (Exception e) {
            logger.error("Error receiving inventory", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error receiving inventory");
        }
    }

    // DTOs for response
    public static class PurchaseOrderDTO {
        public Long id;
        public Object company;
        public Object createdBy;
        public String poNumber;
        public String supplier;
        public Object orderDate;
        public Object expectedDeliveryDate;
        public Double totalAmount;
        public String status;
        public List<PurchaseOrderItemDTO> items;
        public String notes;
        public Object createdAt;
        public Object updatedAt;

        public static PurchaseOrderDTO fromPurchaseOrder(PurchaseOrder po) {
            PurchaseOrderDTO dto = new PurchaseOrderDTO();
            dto.id = po.getId();
            dto.company = po.getCompany();
            dto.createdBy = po.getCreatedBy();
            dto.poNumber = po.getPoNumber();
            dto.supplier = po.getSupplier();
            dto.orderDate = po.getOrderDate();
            dto.expectedDeliveryDate = po.getExpectedDeliveryDate();
            dto.totalAmount = po.getTotalAmount();
            dto.status = po.getStatus() != null ? po.getStatus().toString() : null;
            dto.notes = po.getNotes();
            dto.createdAt = po.getCreatedAt();
            dto.updatedAt = po.getUpdatedAt();
            if (po.getItems() != null) {
                dto.items = po.getItems().stream()
                    .map(PurchaseOrderItemDTO::fromPurchaseOrderItem)
                    .collect(Collectors.toList());
            }
            return dto;
        }
    }

    public static class PurchaseOrderItemDTO {
        public Long id;
        public Object product;
        public Integer quantity;
        public Double unitPrice;
        public Double subtotal;
        public Integer receivedQuantity;

        public static PurchaseOrderItemDTO fromPurchaseOrderItem(PurchaseOrderItem item) {
            PurchaseOrderItemDTO dto = new PurchaseOrderItemDTO();
            dto.id = item.getId();
            dto.product = item.getProduct();
            dto.quantity = item.getQuantity();
            dto.unitPrice = item.getUnitPrice();
            dto.subtotal = item.getSubtotal();
            dto.receivedQuantity = item.getReceivedQuantity();
            return dto;
        }
    }
}
