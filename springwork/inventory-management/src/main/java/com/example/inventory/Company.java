package com.example.inventory;

import jakarta.persistence.*;
import java.util.Set;

@Entity
public class Company {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String name;
    private String address;

    @ManyToMany(mappedBy = "companies")
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Set<User> users;

    @OneToMany(mappedBy = "company")
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Set<Product> products;

            @ManyToMany
            @JoinTable(name = "company_product_categories",
                joinColumns = @JoinColumn(name = "company_id"),
                inverseJoinColumns = @JoinColumn(name = "product_category_id"),
                uniqueConstraints = @UniqueConstraint(columnNames = {"company_id", "product_category_id"}))
            private java.util.Set<ProductCategory> productCategories;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public Set<User> getUsers() {
        return users;
    }

    public void setUsers(Set<User> users) {
        this.users = users;
    }

    public Set<Product> getProducts() {
        return products;
    }

    public void setProducts(Set<Product> products) {
        this.products = products;
    }

    public java.util.Set<ProductCategory> getProductCategories() {
        return productCategories;
    }

    public void setProductCategories(java.util.Set<ProductCategory> productCategories) {
        this.productCategories = productCategories;
    }
}
