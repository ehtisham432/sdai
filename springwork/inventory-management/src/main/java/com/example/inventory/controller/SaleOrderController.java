package com.example.inventory.controller;

import com.example.inventory.*;
import com.example.inventory.repository.*;
import com.example.inventory.service.SaleOrderService;
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
@RequestMapping("/sale-orders")
@CrossOrigin(origins = "*")
public class SaleOrderController {
    private static final Logger logger = LoggerFactory.getLogger(SaleOrderController.class);
    
    @Autowired
    private SaleOrderService saleOrderService;
    
    @Autowired
    private SaleOrderRepository saleOrderRepository;
    
    @Autowired
    private SaleOrderItemRepository saleOrderItemRepository;
    
    @Autowired
    private ProductRepository productRepository;

    // Get all sale orders for a company
    @GetMapping
    public ResponseEntity<?> getSaleOrders(
            @RequestParam Long companyId,
            @RequestParam(required = false) String status) {
        try {
            if (companyId == null) {
                return ResponseEntity.badRequest().body("companyId is required");
            }
            List<SaleOrder> orders = saleOrderService.getSaleOrdersByCompany(companyId);
            if (status != null && !status.isEmpty()) {
                final String statusFilter = status;
                orders = orders.stream()
                        .filter(so -> so.getStatus() != null && so.getStatus().toString().equalsIgnoreCase(statusFilter))
                        .collect(Collectors.toList());
            }
            List<SaleOrderDTO> dtos = orders.stream()
                .map(SaleOrderDTO::fromSaleOrder)
                .collect(Collectors.toList());
            return ResponseEntity.ok(dtos);
        } catch (Exception e) {
            logger.error("Error retrieving sale orders", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error retrieving sale orders");
        }
    }

    // Get a specific sale order with items
    @GetMapping("/{id}")
    public ResponseEntity<?> getSaleOrder(@PathVariable Long id) {
        try {
            Optional<SaleOrder> so = saleOrderService.getSaleOrderById(id);
            if (so.isPresent()) {
                SaleOrderDTO dto = SaleOrderDTO.fromSaleOrder(so.get());
                return ResponseEntity.ok(dto);
            }
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Sale order not found");
        } catch (Exception e) {
            logger.error("Error retrieving sale order", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error retrieving sale order");
        }
    }

    // Create a new sale order
    @PostMapping
    public ResponseEntity<?> createSaleOrder(@RequestBody SaleOrder saleOrder) {
        try {
            if (saleOrder.getCompany() == null || saleOrder.getCreatedBy() == null) {
                return ResponseEntity.badRequest().body("Company and CreatedBy are required");
            }
            SaleOrder saved = saleOrderService.createSaleOrder(saleOrder);
            return ResponseEntity.status(HttpStatus.CREATED).body(SaleOrderDTO.fromSaleOrder(saved));
        } catch (Exception e) {
            logger.error("Error creating sale order", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error creating sale order");
        }
    }

    // Update a sale order
    @PutMapping("/{id}")
    public ResponseEntity<?> updateSaleOrder(@PathVariable Long id, @RequestBody SaleOrder saleOrder) {
        try {
            SaleOrder updated = saleOrderService.updateSaleOrder(id, saleOrder);
            if (updated != null) {
                return ResponseEntity.ok(SaleOrderDTO.fromSaleOrder(updated));
            }
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Sale order not found");
        } catch (Exception e) {
            logger.error("Error updating sale order", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error updating sale order");
        }
    }

    // Delete a sale order
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteSaleOrder(@PathVariable Long id) {
        try {
            if (saleOrderService.deleteSaleOrder(id)) {
                return ResponseEntity.ok().body("Sale order deleted successfully");
            }
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Can only delete PENDING sale orders");
        } catch (Exception e) {
            logger.error("Error deleting sale order", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error deleting sale order");
        }
    }

    // Get items in a sale order
    @GetMapping("/{id}/items")
    public ResponseEntity<?> getSaleOrderItems(@PathVariable Long id) {
        try {
            List<SaleOrderItem> items = saleOrderItemRepository.findBySaleOrderId(id);
            List<SaleOrderItemDTO> dtos = items.stream()
                .map(SaleOrderItemDTO::fromSaleOrderItem)
                .collect(Collectors.toList());
            return ResponseEntity.ok(dtos);
        } catch (Exception e) {
            logger.error("Error retrieving sale order items", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error retrieving items");
        }
    }

    // Add an item to sale order
    @PostMapping("/{id}/items")
    public ResponseEntity<?> addItemToSaleOrder(@PathVariable Long id, @RequestBody SaleOrderItem item) {
        try {
            SaleOrderItem saved = saleOrderService.addItemToSaleOrder(id, item);
            if (saved != null) {
                return ResponseEntity.status(HttpStatus.CREATED).body(SaleOrderItemDTO.fromSaleOrderItem(saved));
            }
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Sale order not found");
        } catch (Exception e) {
            logger.error("Error adding item to sale order", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error adding item");
        }
    }

    // Update a sale order item
    @PutMapping("/items/{itemId}")
    public ResponseEntity<?> updateSaleOrderItem(@PathVariable Long itemId, @RequestBody SaleOrderItem item) {
        try {
            SaleOrderItem updated = saleOrderService.updateSaleOrderItem(itemId, item);
            if (updated != null) {
                return ResponseEntity.ok(SaleOrderItemDTO.fromSaleOrderItem(updated));
            }
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Item not found");
        } catch (Exception e) {
            logger.error("Error updating sale order item", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error updating item");
        }
    }

    // Remove an item from sale order
    @DeleteMapping("/items/{itemId}")
    public ResponseEntity<?> removeItemFromSaleOrder(@PathVariable Long itemId) {
        try {
            if (saleOrderService.removeItemFromSaleOrder(itemId)) {
                return ResponseEntity.ok().body("Item removed successfully");
            }
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Item not found");
        } catch (Exception e) {
            logger.error("Error removing item from sale order", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error removing item");
        }
    }

    // Complete a sale order (reduce inventory and mark as completed)
    @PostMapping("/{id}/complete")
    public ResponseEntity<?> completeSaleOrder(@PathVariable Long id) {
        try {
            if (saleOrderService.completeSaleOrder(id)) {
                Optional<SaleOrder> so = saleOrderService.getSaleOrderById(id);
                if (so.isPresent()) {
                    return ResponseEntity.ok(SaleOrderDTO.fromSaleOrder(so.get()));
                }
            }
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Unable to complete sale order. Check inventory.");
        } catch (Exception e) {
            logger.error("Error completing sale order", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error completing sale order");
        }
    }

    // DTOs for response
    public static class SaleOrderDTO {
        public Long id;
        public Object company;
        public Object createdBy;
        public String invoiceNumber;
        public String customerName;
        public String customerEmail;
        public String customerPhone;
        public String customerAddress;
        public Object saleDate;
        public Object dueDate;
        public Double totalAmount;
        public Double discountAmount;
        public Double taxAmount;
        public Double finalAmount;
        public String status;
        public List<SaleOrderItemDTO> items;
        public String notes;
        public String paymentMethod;
        public Object createdAt;
        public Object updatedAt;

        public static SaleOrderDTO fromSaleOrder(SaleOrder so) {
            SaleOrderDTO dto = new SaleOrderDTO();
            dto.id = so.getId();
            dto.company = so.getCompany();
            dto.createdBy = so.getCreatedBy();
            dto.invoiceNumber = so.getInvoiceNumber();
            dto.customerName = so.getCustomerName();
            dto.customerEmail = so.getCustomerEmail();
            dto.customerPhone = so.getCustomerPhone();
            dto.customerAddress = so.getCustomerAddress();
            dto.saleDate = so.getSaleDate();
            dto.dueDate = so.getDueDate();
            dto.totalAmount = so.getTotalAmount();
            dto.discountAmount = so.getDiscountAmount();
            dto.taxAmount = so.getTaxAmount();
            dto.finalAmount = so.getFinalAmount();
            dto.status = so.getStatus() != null ? so.getStatus().toString() : null;
            dto.notes = so.getNotes();
            dto.paymentMethod = so.getPaymentMethod();
            dto.createdAt = so.getCreatedAt();
            dto.updatedAt = so.getUpdatedAt();
            if (so.getItems() != null) {
                dto.items = so.getItems().stream()
                    .map(SaleOrderItemDTO::fromSaleOrderItem)
                    .collect(Collectors.toList());
            }
            return dto;
        }
    }

    public static class SaleOrderItemDTO {
        public Long id;
        public Object product;
        public Integer quantity;
        public Double unitPrice;
        public Double discount;
        public Double tax;
        public Double subtotal;

        public static SaleOrderItemDTO fromSaleOrderItem(SaleOrderItem item) {
            SaleOrderItemDTO dto = new SaleOrderItemDTO();
            dto.id = item.getId();
            dto.product = item.getProduct();
            dto.quantity = item.getQuantity();
            dto.unitPrice = item.getUnitPrice();
            dto.discount = item.getDiscount();
            dto.tax = item.getTax();
            dto.subtotal = item.getSubtotal();
            return dto;
        }
    }
}
