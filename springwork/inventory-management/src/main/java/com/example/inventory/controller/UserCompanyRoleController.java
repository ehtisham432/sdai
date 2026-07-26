package com.example.inventory.controller;

import com.example.inventory.UserCompanyRole;
import com.example.inventory.repository.UserCompanyRoleRepository;
import com.example.inventory.repository.UserRepository;
import com.example.inventory.repository.CompanyRepository;
import com.example.inventory.repository.RoleRepository;
import com.example.inventory.User;
import com.example.inventory.Company;
import com.example.inventory.Role;
import com.example.inventory.service.JwtTokenProvider;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
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
    private final JwtTokenProvider jwtTokenProvider;

    public UserCompanyRoleController(UserCompanyRoleRepository repo, UserRepository userRepo, CompanyRepository companyRepo, RoleRepository roleRepo, JwtTokenProvider jwtTokenProvider) {
        this.repo = repo;
        this.userRepo = userRepo;
        this.companyRepo = companyRepo;
        this.roleRepo = roleRepo;
        this.jwtTokenProvider = jwtTokenProvider;
    }
    
    /**
     * Check if the requesting user is a global user (has a UserCompanyRole with NULL company_id)
     */
    private boolean isGlobalUser(Long userId) {
        List<UserCompanyRole> userRoles = repo.findByUserId(userId);
        return userRoles.stream().anyMatch(role -> role.getCompany() == null);
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
    public ResponseEntity<?> create(@RequestBody AssignPayload p, 
                                   @RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (p.userId == null || p.roleId == null) {
            return ResponseEntity.badRequest().body("userId and roleId are required");
        }
        
        // Validate that only global users can assign global roles
        if (p.companyId == null) {
            // This is a global role assignment
            // Extract and validate JWT token to get the requesting user
            Long requestingUserId = null;
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                String token = authHeader.substring(7);
                if (jwtTokenProvider.validateToken(token)) {
                    requestingUserId = jwtTokenProvider.getUserIdFromToken(token);
                }
            }
            
            // Check if requesting user is global
            if (requestingUserId == null || !isGlobalUser(requestingUserId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body("Only global users can assign global roles");
            }
        }
        
        User user = userRepo.findById(p.userId).orElse(null);
        if (user == null) return ResponseEntity.badRequest().body("User not found");
        
        Company company = null;
        if (p.companyId != null) {
            company = companyRepo.findById(p.companyId).orElse(null);
            if (company == null) return ResponseEntity.badRequest().body("Company not found");
        }
        
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
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody AssignPayload p,
                                   @RequestHeader(value = "Authorization", required = false) String authHeader) {
        return repo.findById(id).map(existing -> {
            if (p.roleId == null) return ResponseEntity.badRequest().body("roleId is required");
            
            // Check if this is a global role (company_id is NULL)
            if (existing.getCompany() == null) {
                // This is a global role update
                // Extract and validate JWT token to get the requesting user
                Long requestingUserId = null;
                if (authHeader != null && authHeader.startsWith("Bearer ")) {
                    String token = authHeader.substring(7);
                    if (jwtTokenProvider.validateToken(token)) {
                        requestingUserId = jwtTokenProvider.getUserIdFromToken(token);
                    }
                }
                
                // Check if requesting user is global
                if (requestingUserId == null || !isGlobalUser(requestingUserId)) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body("Only global users can modify global roles");
                }
            }
            
            Role role = roleRepo.findById(p.roleId).orElse(null);
            if (role == null) return ResponseEntity.badRequest().body("Role not found");
            existing.setRole(role);
            repo.save(existing);
            return ResponseEntity.ok(existing);
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id,
                                      @RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (!repo.existsById(id)) return ResponseEntity.notFound().build();
        
        UserCompanyRole existing = repo.findById(id).orElse(null);
        if (existing == null) return ResponseEntity.notFound().build();
        
        // Check if this is a global role (company_id is NULL)
        if (existing.getCompany() == null) {
            // This is a global role deletion
            // Extract and validate JWT token to get the requesting user
            Long requestingUserId = null;
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                String token = authHeader.substring(7);
                if (jwtTokenProvider.validateToken(token)) {
                    requestingUserId = jwtTokenProvider.getUserIdFromToken(token);
                }
            }
            
            // Check if requesting user is global
            if (requestingUserId == null || !isGlobalUser(requestingUserId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
        }
        
        repo.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
