package com.example.inventory;

import jakarta.persistence.*;

@Entity
public class PurchaseOrderItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne
    @JoinColumn(name = "purchase_order_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private PurchaseOrder purchaseOrder;
    
    @ManyToOne
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;
    
    private Integer quantity;
    private Double unitPrice;
    private Double subtotal;
    
    private Integer receivedQuantity; // Track how much has been received

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public PurchaseOrder getPurchaseOrder() {
        return purchaseOrder;
    }

    public void setPurchaseOrder(PurchaseOrder purchaseOrder) {
        this.purchaseOrder = purchaseOrder;
    }

    public Product getProduct() {
        return product;
    }

    public void setProduct(Product product) {
        this.product = product;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
    }

    public Double getUnitPrice() {
        return unitPrice;
    }

    public void setUnitPrice(Double unitPrice) {
        this.unitPrice = unitPrice;
    }

    public Double getSubtotal() {
        return subtotal;
    }

    public void setSubtotal(Double subtotal) {
        this.subtotal = subtotal;
    }

    public Integer getReceivedQuantity() {
        return receivedQuantity;
    }

    public void setReceivedQuantity(Integer receivedQuantity) {
        this.receivedQuantity = receivedQuantity;
    }
}
