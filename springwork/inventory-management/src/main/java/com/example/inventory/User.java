package com.example.inventory;

import jakarta.persistence.Table;
import jakarta.persistence.*;

@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String username;
    @Column(unique = true)
    private String email;

    @Column(unique = true, nullable = false)
    private String loginName;

    @Column(nullable = false)
    private String password;

    @com.fasterxml.jackson.annotation.JsonIgnoreProperties({"users","products"})
    @ManyToMany
    @JoinTable(name = "user_companies",
            joinColumns = @JoinColumn(name = "user_id"),
            inverseJoinColumns = @JoinColumn(name = "company_id"))
    private java.util.Set<Company> companies;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getLoginName() {
        return loginName;
    }

    public void setLoginName(String loginName) {
        this.loginName = loginName;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }
    public java.util.Set<Company> getCompanies() {
        return companies;
    }

    public void setCompanies(java.util.Set<Company> companies) {
        this.companies = companies;
    }
}
