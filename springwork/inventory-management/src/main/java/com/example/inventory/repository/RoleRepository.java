package com.example.inventory.repository;

import com.example.inventory.Role;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RoleRepository extends JpaRepository<Role, Long> {
    boolean existsByNameIgnoreCase(String name);
}