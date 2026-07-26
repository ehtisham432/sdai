package com.example.inventory.repository;

import com.example.inventory.ProductCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ProductCategoryRepository extends JpaRepository<ProductCategory, Long> {
	// find categories assigned to a given company (distinct in case of multiple joins)
List<ProductCategory> findByCompanyId(Long companyId);

	// alternative derived method if you prefer
	// List<ProductCategory> findDistinctByCompanies_Id(Long companyId);
}