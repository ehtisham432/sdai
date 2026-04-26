package com.example.inventory.controller;

import com.example.inventory.ProductType;
import com.example.inventory.repository.ProductTypeRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/product-types")
public class ProductTypeController {

    private final ProductTypeRepository repo;

    public ProductTypeController(ProductTypeRepository repo) {
        this.repo = repo;
    }

    @GetMapping
    public List<ProductType> list() {
        return repo.findAll();
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
        if (repo.findAll().stream().anyMatch(t -> t.getName().equalsIgnoreCase(pt.getName().trim()))) {
            return ResponseEntity.badRequest().body("Name must be unique");
        }
        try {
            ProductType saved = repo.save(pt);
            return ResponseEntity.created(URI.create("/product-types/" + saved.getId())).body(saved);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody ProductType pt) {
        if (pt.getName() == null || pt.getName().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Name is required");
        }
        if (repo.findAll().stream().anyMatch(t -> t.getName().equalsIgnoreCase(pt.getName().trim()) && !t.getId().equals(id))) {
            return ResponseEntity.badRequest().body("Name must be unique");
        }
        return repo.findById(id).map(existing -> {
            existing.setName(pt.getName());
            existing.setDescription(pt.getDescription());
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
