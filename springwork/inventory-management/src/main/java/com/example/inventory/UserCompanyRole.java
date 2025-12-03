package com.example.inventory;

import jakarta.persistence.*;

@Entity
@Table(name = "user_company_roles", uniqueConstraints = @UniqueConstraint(columnNames = {"user_id","company_id"}))
public class UserCompanyRole {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne(optional = false)
    @JoinColumn(name = "company_id")
    private Company company;

    @ManyToOne(optional = false)
    @JoinColumn(name = "role_id")
    private Role role;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public Company getCompany() { return company; }
    public void setCompany(Company company) { this.company = company; }

    public Role getRole() { return role; }
    public void setRole(Role role) { this.role = role; }
}