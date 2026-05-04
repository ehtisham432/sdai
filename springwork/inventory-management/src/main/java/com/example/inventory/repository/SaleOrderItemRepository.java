package com.example.inventory.repository;

import com.example.inventory.SaleOrderItem;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SaleOrderItemRepository extends JpaRepository<SaleOrderItem, Long> {
    List<SaleOrderItem> findBySaleOrderId(Long saleOrderId);
}
