package com.example.inventory.repository;

import com.example.inventory.DisplayType;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DisplayTypeRepository extends JpaRepository<DisplayType, Long> {
    boolean existsByNameIgnoreCase(String name);
}