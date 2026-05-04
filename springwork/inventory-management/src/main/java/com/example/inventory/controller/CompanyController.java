package com.example.inventory.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import com.example.inventory.Company;
import com.example.inventory.User;
import com.example.inventory.UserCompanyRole;
import com.example.inventory.repository.CompanyRepository;
import com.example.inventory.repository.UserRepository;
import com.example.inventory.repository.UserCompanyRoleRepository;
import com.example.inventory.service.JwtTokenProvider;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/companies")
public class CompanyController {
    @Autowired
    private CompanyRepository companyRepository;
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private UserCompanyRoleRepository userCompanyRoleRepository;
    
    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @GetMapping
    public List<Company> getAllCompanies(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        // If no auth header, return all companies (for backward compatibility)
        if (authHeader == null || authHeader.isEmpty()) {
            return companyRepository.findAll();
        }
        
        // Extract JWT token from Authorization header
        String token = null;
        if (authHeader.startsWith("Bearer ")) {
            token = authHeader.substring(7);
        } else {
            // Invalid token format, return empty list or all companies
            return companyRepository.findAll();
        }
        
        // Validate token and get userId
        if (!jwtTokenProvider.validateToken(token)) {
            return companyRepository.findAll();
        }
        
        Long userId = jwtTokenProvider.getUserIdFromToken(token);
        if (userId == null) {
            return companyRepository.findAll();
        }
        
        // Check if user is global (has UserCompanyRole with NULL company_id)
        List<UserCompanyRole> userRoles = userCompanyRoleRepository.findByUserId(userId);
        boolean isGlobalUser = userRoles.stream().anyMatch(role -> role.getCompany() == null);
        
        // If global user, return all companies
        if (isGlobalUser) {
            return companyRepository.findAll();
        }
        
        // If not global, return only assigned companies
        User user = userRepository.findById(userId).orElse(null);
        if (user == null || user.getCompanies() == null || user.getCompanies().isEmpty()) {
            return List.of(); // Return empty list if user has no assigned companies
        }
        
        return user.getCompanies().stream().collect(Collectors.toList());
    }

    @PostMapping
    public Company createCompany(@RequestBody Company company) {
        return companyRepository.save(company);
    }

    @GetMapping("/{id}")
    public Company getCompany(@PathVariable Long id) {
        return companyRepository.findById(id).orElse(null);
    }

    @PutMapping("/{id}")
    public Company updateCompany(@PathVariable Long id, @RequestBody Company company) {
        company.setId(id);
        return companyRepository.save(company);
    }

    @DeleteMapping("/{id}")
    public void deleteCompany(@PathVariable Long id) {
        companyRepository.deleteById(id);
    }
}

