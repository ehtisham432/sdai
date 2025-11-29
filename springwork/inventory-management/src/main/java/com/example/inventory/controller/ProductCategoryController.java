package com.example.inventory.controller;

import com.example.inventory.ProductCategory;
import com.example.inventory.repository.ProductCategoryRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/product-categories")
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
        if (repo.findAll().stream().anyMatch(c -> c.getName().equalsIgnoreCase(pc.getName().trim()))) {
            return ResponseEntity.badRequest().body("Name must be unique");
        }
        try {
            ProductCategory saved = repo.save(pc);
            return ResponseEntity.created(URI.create("/product-categories/" + saved.getId())).body(saved);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody ProductCategory pc) {
        if (pc.getName() == null || pc.getName().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Name is required");
        }
        if (repo.findAll().stream().anyMatch(c -> c.getName().equalsIgnoreCase(pc.getName().trim()) && !c.getId().equals(id))) {
            return ResponseEntity.badRequest().body("Name must be unique");
        }
        return repo.findById(id).map(existing -> {
            existing.setName(pc.getName());
            existing.setDescription(pc.getDescription());
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