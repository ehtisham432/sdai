package com.example.inventory.controller;

import com.example.inventory.ProductType;
import com.example.inventory.repository.ProductTypeRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/product-types")
public class ProductTypeController {

    private final ProductTypeRepository repo;

    public ProductTypeController(ProductTypeRepository repo) {
        this.repo = repo;
    }

    @GetMapping
    public List<ProductType> list() {
        return repo.findAll();
    }

    @GetMapping("/category/{categoryId}")
    public List<ProductType> getByCategory(@PathVariable Long categoryId) {
        return repo.findByProductCategoryId(categoryId);
    }

    @GetMapping("/category/{categoryId}/search")
    public List<ProductType> searchByCategory(@PathVariable Long categoryId, @RequestParam(value = "search", required = false) String search) {
        List<ProductType> types = repo.findByProductCategoryId(categoryId);
        if (search != null && !search.trim().isEmpty()) {
            String searchLower = search.toLowerCase().trim();
            return types.stream()
                    .filter(t -> t.getName().toLowerCase().contains(searchLower) || 
                               (t.getDescription() != null && t.getDescription().toLowerCase().contains(searchLower)))
                    .toList();
        }
        return types;
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProductType> get(@PathVariable Long id) {
        return repo.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody ProductType pt) {
        if (pt.getName() == null || pt.getName().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Name is required");
        }
        if (pt.getProductCategory() == null || pt.getProductCategory().getId() == null) {
            return ResponseEntity.badRequest().body("Product category is required");
        }
        
        // Check if name is unique within this category only
        Long categoryId = pt.getProductCategory().getId();
        if (repo.findByProductCategoryId(categoryId).stream()
                .anyMatch(t -> t.getName().equalsIgnoreCase(pt.getName().trim()))) {
            return ResponseEntity.badRequest().body("Name must be unique");
        }
        try {
            ProductType saved = repo.save(pt);
            return ResponseEntity.created(URI.create("/api/product-types/" + saved.getId())).body(saved);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody ProductType pt) {
        if (pt.getName() == null || pt.getName().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Name is required");
        }
        if (pt.getProductCategory() == null || pt.getProductCategory().getId() == null) {
            return ResponseEntity.badRequest().body("Product category is required");
        }
        
        // Check if name is unique within this category only (excluding current type)
        Long categoryId = pt.getProductCategory().getId();
        if (repo.findByProductCategoryId(categoryId).stream()
                .anyMatch(t -> t.getName().equalsIgnoreCase(pt.getName().trim()) && !t.getId().equals(id))) {
            return ResponseEntity.badRequest().body("Name must be unique");
        }
        
        return repo.findById(id).map(existing -> {
            existing.setName(pt.getName());
            existing.setDescription(pt.getDescription());
            existing.setProductCategory(pt.getProductCategory());
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
