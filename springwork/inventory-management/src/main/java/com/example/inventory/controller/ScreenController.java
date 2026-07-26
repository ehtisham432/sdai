package com.example.inventory.controller;

import com.example.inventory.Screen;
import com.example.inventory.repository.ScreenRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/screens")
public class ScreenController {

    private final ScreenRepository repo;

    public ScreenController(ScreenRepository repo) { this.repo = repo; }

    @GetMapping
    public List<Screen> list(@RequestParam(value = "groupId", required = false) Long groupId) {
        if (groupId != null) return repo.findByGroupId(groupId);
        return repo.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Screen> get(@PathVariable Long id) {
        return repo.findById(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Screen s) {
        if (s.getName() == null || s.getName().trim().isEmpty()) return ResponseEntity.badRequest().body("Name is required");
        if (repo.existsByNameIgnoreCase(s.getName().trim())) return ResponseEntity.badRequest().body("Name must be unique");
        Screen saved = repo.save(s);
        return ResponseEntity.created(URI.create("/screens/" + saved.getId())).body(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Screen s) {
        if (s.getName() == null || s.getName().trim().isEmpty()) return ResponseEntity.badRequest().body("Name is required");
        return repo.findById(id).map(existing -> {
            existing.setName(s.getName());
            existing.setPath(s.getPath());
            existing.setDescription(s.getDescription());
            existing.setGroup(s.getGroup());
            existing.setDisplayType(s.getDisplayType());
            repo.save(existing);
            return ResponseEntity.ok(existing);
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) { if (!repo.existsById(id)) return ResponseEntity.notFound().build(); repo.deleteById(id); return ResponseEntity.noContent().build(); }
}