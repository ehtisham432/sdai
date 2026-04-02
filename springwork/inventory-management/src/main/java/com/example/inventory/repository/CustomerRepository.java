package com.example.inventory.repository;

import com.example.inventory.Customer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface CustomerRepository extends JpaRepository<Customer, Long> {
    List<Customer> findByCompanyId(Long companyId);
    List<Customer> findByCompanyIdAndNameContainingIgnoreCase(Long companyId, String name);
    Customer findByCompanyIdAndName(Long companyId, String name);
}
