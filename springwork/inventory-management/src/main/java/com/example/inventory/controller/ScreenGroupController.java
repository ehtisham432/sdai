package com.example.inventory.controller;

import com.example.inventory.ScreenGroup;
import com.example.inventory.repository.ScreenGroupRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/screen-groups")
public class ScreenGroupController {

    private final ScreenGroupRepository repo;

    public ScreenGroupController(ScreenGroupRepository repo) { this.repo = repo; }

    @GetMapping
    public List<ScreenGroup> list() { return repo.findAll(); }

    @GetMapping("/{id}")
    public ResponseEntity<ScreenGroup> get(@PathVariable Long id) {
        return repo.findById(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody ScreenGroup sg) {
        if (sg.getName() == null || sg.getName().trim().isEmpty()) return ResponseEntity.badRequest().body("Name is required");
        if (repo.existsByNameIgnoreCase(sg.getName().trim())) return ResponseEntity.badRequest().body("Name must be unique");
        ScreenGroup saved = repo.save(sg);
        return ResponseEntity.created(URI.create("/screen-groups/" + saved.getId())).body(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody ScreenGroup sg) {
        if (sg.getName() == null || sg.getName().trim().isEmpty()) return ResponseEntity.badRequest().body("Name is required");
        return repo.findById(id).map(existing -> {
            existing.setName(sg.getName());
            existing.setDescription(sg.getDescription());
            repo.save(existing);
            return ResponseEntity.ok(existing);
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) { if (!repo.existsById(id)) return ResponseEntity.notFound().build(); repo.deleteById(id); return ResponseEntity.noContent().build(); }
}