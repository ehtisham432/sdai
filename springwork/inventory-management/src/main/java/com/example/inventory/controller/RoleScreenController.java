package com.example.inventory.controller;

import com.example.inventory.RoleScreen;
import com.example.inventory.Role;
import com.example.inventory.Screen;
import com.example.inventory.service.RoleScreenService;
import com.example.inventory.repository.RoleRepository;
import com.example.inventory.repository.ScreenRepository;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/role-screens")
public class RoleScreenController {
    private final RoleScreenService service;
    private final RoleRepository roleRepo;
    private final ScreenRepository screenRepo;

    public RoleScreenController(RoleScreenService service, RoleRepository roleRepo, ScreenRepository screenRepo) {
        this.service = service;
        this.roleRepo = roleRepo;
        this.screenRepo = screenRepo;
    }

    @GetMapping
    public List<RoleScreen> list(@RequestParam(value = "roleId", required = false) Long roleId) {
        if (roleId != null) {
            return service.findByRoleId(roleId);
        }
        return service.findAll();
    }

    @GetMapping("/screens")
    public List<Screen> screensForRole(@RequestParam(value = "roleId") Long roleId) {
        return service.findScreensByRoleId(roleId);
    }

    @PostMapping
    public ResponseEntity<?> assign(@RequestBody RoleScreen rs) {
        if (rs.getRole() == null || rs.getScreen() == null) return ResponseEntity.badRequest().body("role and screen required");
        Long roleId = rs.getRole().getId();
        Long screenId = rs.getScreen().getId();
        if (!roleRepo.existsById(roleId)) return ResponseEntity.badRequest().body("role not found");
        if (!screenRepo.existsById(screenId)) return ResponseEntity.badRequest().body("screen not found");
        if (service.existsByRoleIdAndScreenId(roleId, screenId)) return ResponseEntity.badRequest().body("already assigned");
        roleRepo.findById(roleId).ifPresent(r -> rs.setRole(r));
        screenRepo.findById(screenId).ifPresent(s -> rs.setScreen(s));
        RoleScreen saved = service.save(rs);
        return ResponseEntity.created(URI.create("/role-screens/" + saved.getId())).body(saved);
    }

    @DeleteMapping
    public ResponseEntity<?> unassign(@RequestParam(value = "roleId") Long roleId, @RequestParam(value = "screenId") Long screenId) {
        if (!service.existsByRoleIdAndScreenId(roleId, screenId)) return ResponseEntity.notFound().build();
        service.deleteByRoleIdAndScreenId(roleId, screenId);
        return ResponseEntity.noContent().build();
    }
}