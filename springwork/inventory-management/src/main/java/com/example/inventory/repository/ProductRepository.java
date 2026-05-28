package com.example.inventory.repository;
import com.example.inventory.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface ProductRepository extends JpaRepository<Product, Long> {
    @Query("SELECT p FROM Product p WHERE p.productCategory.id = :categoryId AND p.name = :name")
    List<Product> findByCategoryAndName(@Param("categoryId") Long categoryId, @Param("name") String name);
}
