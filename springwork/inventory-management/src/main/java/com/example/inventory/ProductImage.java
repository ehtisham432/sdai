package com.example.inventory;

import jakarta.persistence.*;

@Entity
public class ProductImage {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String url;

    private boolean titleImage;

    @ManyToOne
    @JoinColumn(name = "product_id")
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Product product;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }

    public boolean isTitleImage() { return titleImage; }
    public void setTitleImage(boolean titleImage) { this.titleImage = titleImage; }

    public Product getProduct() { return product; }
    public void setProduct(Product product) { this.product = product; }
}
