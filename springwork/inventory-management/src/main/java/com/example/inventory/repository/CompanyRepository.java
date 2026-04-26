package com.example.inventory.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.inventory.Company;



public interface CompanyRepository extends JpaRepository<Company, Long> {}
