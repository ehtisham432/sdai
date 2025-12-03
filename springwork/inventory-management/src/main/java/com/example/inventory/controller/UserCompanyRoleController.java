package com.example.inventory.controller;

import com.example.inventory.UserCompanyRole;
import com.example.inventory.repository.UserCompanyRoleRepository;
import com.example.inventory.repository.UserRepository;
import com.example.inventory.repository.CompanyRepository;
import com.example.inventory.repository.RoleRepository;
import com.example.inventory.User;
import com.example.inventory.Company;
import com.example.inventory.Role;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/user-company-roles")
public class UserCompanyRoleController {
    private final UserCompanyRoleRepository repo;
    private final UserRepository userRepo;
    private final CompanyRepository companyRepo;
    private final RoleRepository roleRepo;

    public UserCompanyRoleController(UserCompanyRoleRepository repo, UserRepository userRepo, CompanyRepository companyRepo, RoleRepository roleRepo) {
        this.repo = repo;
        this.userRepo = userRepo;
        this.companyRepo = companyRepo;
        this.roleRepo = roleRepo;
    }

    @GetMapping
    public List<UserCompanyRole> list(@RequestParam(value = "userId", required = false) Long userId,
                                      @RequestParam(value = "companyId", required = false) Long companyId) {
        if (userId != null) return repo.findByUserId(userId);
        if (companyId != null) return repo.findByCompanyId(companyId);
        return repo.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserCompanyRole> get(@PathVariable Long id) {
        return repo.findById(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    public static class AssignPayload {
        public Long userId;
        public Long companyId;
        public Long roleId;
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody AssignPayload p) {
        if (p.userId == null || p.companyId == null || p.roleId == null) {
            return ResponseEntity.badRequest().body("userId, companyId and roleId are required");
        }
        User user = userRepo.findById(p.userId).orElse(null);
        if (user == null) return ResponseEntity.badRequest().body("User not found");
        Company company = companyRepo.findById(p.companyId).orElse(null);
        if (company == null) return ResponseEntity.badRequest().body("Company not found");
        Role role = roleRepo.findById(p.roleId).orElse(null);
        if (role == null) return ResponseEntity.badRequest().body("Role not found");

        // check if mapping already exists
        UserCompanyRole existing = repo.findByUserIdAndCompanyId(p.userId, p.companyId);
        if (existing != null) return ResponseEntity.badRequest().body("Role already assigned for this user and company");

        UserCompanyRole mapping = new UserCompanyRole();
        mapping.setUser(user);
        mapping.setCompany(company);
        mapping.setRole(role);
        UserCompanyRole saved = repo.save(mapping);
        return ResponseEntity.created(URI.create("/user-company-roles/" + saved.getId())).body(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody AssignPayload p) {
        return repo.findById(id).map(existing -> {
            if (p.roleId == null) return ResponseEntity.badRequest().body("roleId is required");
            Role role = roleRepo.findById(p.roleId).orElse(null);
            if (role == null) return ResponseEntity.badRequest().body("Role not found");
            existing.setRole(role);
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
