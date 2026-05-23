package com.example.inventory.repository;

import com.example.inventory.ProductType;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ProductTypeRepository extends JpaRepository<ProductType, Long> {
    List<ProductType> findByProductCategoryId(Long productCategoryId);
}
