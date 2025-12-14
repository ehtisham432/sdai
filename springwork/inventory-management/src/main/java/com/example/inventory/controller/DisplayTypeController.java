package com.example.inventory.controller;

import com.example.inventory.DisplayType;
import com.example.inventory.repository.DisplayTypeRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/display-types")
public class DisplayTypeController {

    private final DisplayTypeRepository repo;

    public DisplayTypeController(DisplayTypeRepository repo) { this.repo = repo; }

    @GetMapping
    public List<DisplayType> list() { return repo.findAll(); }

    @GetMapping("/{id}")
    public ResponseEntity<DisplayType> get(@PathVariable Long id) {
        return repo.findById(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody DisplayType dt) {
        if (dt.getName() == null || dt.getName().trim().isEmpty()) return ResponseEntity.badRequest().body("Name is required");
        if (repo.existsByNameIgnoreCase(dt.getName().trim())) return ResponseEntity.badRequest().body("Name must be unique");
        DisplayType saved = repo.save(dt);
        return ResponseEntity.created(URI.create("/display-types/" + saved.getId())).body(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody DisplayType dt) {
        if (dt.getName() == null || dt.getName().trim().isEmpty()) return ResponseEntity.badRequest().body("Name is required");
        return repo.findById(id).map(existing -> {
            existing.setName(dt.getName());
            existing.setDescription(dt.getDescription());
            repo.save(existing);
            return ResponseEntity.ok(existing);
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) { if (!repo.existsById(id)) return ResponseEntity.notFound().build(); repo.deleteById(id); return ResponseEntity.noContent().build(); }
}