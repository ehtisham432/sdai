package com.example.inventory.controller;

import com.example.inventory.Role;
import com.example.inventory.repository.RoleRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/roles")
public class RoleController {

    private final RoleRepository repo;

    public RoleController(RoleRepository repo) {
        this.repo = repo;
    }

    @GetMapping
    public List<Role> list() {
        return repo.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Role> get(@PathVariable Long id) {
        return repo.findById(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Role r) {
        if (r.getName() == null || r.getName().trim().isEmpty())
            return ResponseEntity.badRequest().body("Name is required");
        if (repo.existsByNameIgnoreCase(r.getName().trim()))
            return ResponseEntity.badRequest().body("Role name must be unique");
        try {
            Role saved = repo.save(r);
            return ResponseEntity.created(URI.create("/roles/" + saved.getId())).body(saved);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Role r) {
        if (r.getName() == null || r.getName().trim().isEmpty())
            return ResponseEntity.badRequest().body("Name is required");
        if (repo.findAll().stream().anyMatch(role -> role.getName().equalsIgnoreCase(r.getName().trim()) && !role.getId().equals(id)))
            return ResponseEntity.badRequest().body("Role name must be unique");
        return repo.findById(id).map(existing -> {
            existing.setName(r.getName());
            existing.setDescription(r.getDescription());
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
