package com.example.inventory.repository;

import com.example.inventory.SaleOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SaleOrderRepository extends JpaRepository<SaleOrder, Long> {
    List<SaleOrder> findByCompanyId(Long companyId);
}
