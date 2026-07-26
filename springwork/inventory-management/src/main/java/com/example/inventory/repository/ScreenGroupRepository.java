package com.example.inventory.repository;

import com.example.inventory.ScreenGroup;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ScreenGroupRepository extends JpaRepository<ScreenGroup, Long> {
    boolean existsByNameIgnoreCase(String name);
}