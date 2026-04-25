package com.example.inventory.repository;

import com.example.inventory.Role;
import com.example.inventory.Company;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface RoleRepository extends JpaRepository<Role, Long> {
    boolean existsByNameIgnoreCase(String name);
    
    List<Role> findByCompany(Company company);
    
    List<Role> findByCompanyIsNull();
    
    boolean existsByNameIgnoreCaseAndCompany(String name, Company company);
    
    boolean existsByNameIgnoreCaseAndCompanyIsNull(String name);
}