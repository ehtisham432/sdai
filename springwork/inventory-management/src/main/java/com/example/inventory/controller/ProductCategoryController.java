package com.example.inventory.controller;

import com.example.inventory.ProductCategory;
import com.example.inventory.repository.ProductCategoryRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/product-categories")
public class ProductCategoryController {

    private final ProductCategoryRepository repo;

    public ProductCategoryController(ProductCategoryRepository repo) {
        this.repo = repo;
    }

    @GetMapping
    public List<ProductCategory> list(@RequestParam(value = "companyId", required = false) Long companyId) {
        if (companyId != null) {
            return repo.findByCompanyId(companyId);
        }
        return repo.findAll();
    }

    @GetMapping("/company/{companyId}")
    public List<ProductCategory> getByCompany(@PathVariable Long companyId) {
        return repo.findByCompanyId(companyId);
    }

    @GetMapping("/company/{companyId}/search")
    public List<ProductCategory> searchByCompanyAndName(@PathVariable Long companyId, @RequestParam(value = "search", required = false) String search) {
        List<ProductCategory> categories = repo.findByCompanyId(companyId);
        if (search != null && !search.trim().isEmpty()) {
            String searchLower = search.toLowerCase().trim();
            return categories.stream()
                    .filter(c -> c.getName().toLowerCase().contains(searchLower) || 
                               (c.getDescription() != null && c.getDescription().toLowerCase().contains(searchLower)))
                    .toList();
        }
        return categories;
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProductCategory> get(@PathVariable Long id) {
        return repo.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody ProductCategory pc) {
        if (pc.getName() == null || pc.getName().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Name is required");
        }
        if (pc.getCompany() == null || pc.getCompany().getId() == null) {
            return ResponseEntity.badRequest().body("Company is required");
        }
        
        // Check if name is unique within this company only
        Long companyId = pc.getCompany().getId();
        if (repo.findByCompanyId(companyId).stream()
                .anyMatch(c -> c.getName().equalsIgnoreCase(pc.getName().trim()))) {
            return ResponseEntity.badRequest().body("Name must be unique");
        }
        try {
            ProductCategory saved = repo.save(pc);
            return ResponseEntity.created(URI.create("/api/product-categories/" + saved.getId())).body(saved);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody ProductCategory pc) {
        if (pc.getName() == null || pc.getName().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Name is required");
        }
        if (pc.getCompany() == null || pc.getCompany().getId() == null) {
            return ResponseEntity.badRequest().body("Company is required");
        }
        
        // Check if name is unique within this company only (excluding current category)
        Long companyId = pc.getCompany().getId();
        if (repo.findByCompanyId(companyId).stream()
                .anyMatch(c -> c.getName().equalsIgnoreCase(pc.getName().trim()) && !c.getId().equals(id))) {
            return ResponseEntity.badRequest().body("Name must be unique");
        }
        
        return repo.findById(id).map(existing -> {
            existing.setName(pc.getName());
            existing.setDescription(pc.getDescription());
            existing.setCompany(pc.getCompany());
            repo.save(existing);
            return ResponseEntity.ok(existing);
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!repo.existsById(id)) return ResponseEntity.notFound().build();
        repo.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}