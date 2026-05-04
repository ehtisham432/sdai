package com.example.inventory.controller;

import com.example.inventory.Role;
import com.example.inventory.Company;
import com.example.inventory.UserCompanyRole;
import com.example.inventory.repository.RoleRepository;
import com.example.inventory.repository.CompanyRepository;
import com.example.inventory.repository.UserCompanyRoleRepository;
import com.example.inventory.service.JwtTokenProvider;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/roles")
public class RoleController {

    private final RoleRepository roleRepo;
    private final CompanyRepository companyRepo;
    private final UserCompanyRoleRepository userCompanyRoleRepo;
    private final JwtTokenProvider jwtTokenProvider;

    public RoleController(RoleRepository roleRepo, CompanyRepository companyRepo, 
                        UserCompanyRoleRepository userCompanyRoleRepo, JwtTokenProvider jwtTokenProvider) {
        this.roleRepo = roleRepo;
        this.companyRepo = companyRepo;
        this.userCompanyRoleRepo = userCompanyRoleRepo;
        this.jwtTokenProvider = jwtTokenProvider;
    }
    
    /**
     * Check if the requesting user is a global user (has a UserCompanyRole with NULL company_id)
     */
    private boolean isGlobalUser(Long userId) {
        List<UserCompanyRole> userRoles = userCompanyRoleRepo.findByUserId(userId);
        return userRoles.stream().anyMatch(role -> role.getCompany() == null);
    }

    @GetMapping
    public List<Role> list(@RequestParam(required = false) Long companyId) {
        if (companyId != null) {
            Optional<Company> company = companyRepo.findById(companyId);
            return company.map(roleRepo::findByCompany).orElse(List.of());
        }
        return roleRepo.findAll();
    }

    @GetMapping("/by-company/{companyId}")
    public ResponseEntity<?> listByCompany(@PathVariable Long companyId) {
        Optional<Company> company = companyRepo.findById(companyId);
        if (company.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(roleRepo.findByCompany(company.get()));
    }

    @GetMapping("/global")
    public List<Role> listGlobalRoles() {
        return roleRepo.findByCompanyIsNull();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Role> get(@PathVariable Long id) {
        return roleRepo.findById(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Role r, 
                                   @RequestParam(required = false) Long companyId,
                                   @RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (r.getName() == null || r.getName().trim().isEmpty())
            return ResponseEntity.badRequest().body("Name is required");

        // Validate that only global users can create global roles
        if (companyId == null) {
            // This is a global role creation
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
                        .body("Only global users can create global roles");
            }
        }

        // Set company if provided
        if (companyId != null) {
            Optional<Company> company = companyRepo.findById(companyId);
            if (company.isEmpty()) {
                return ResponseEntity.badRequest().body("Company not found");
            }
            r.setCompany(company.get());
            // Check uniqueness within company
            if (roleRepo.existsByNameIgnoreCaseAndCompany(r.getName().trim(), company.get())) {
                return ResponseEntity.badRequest().body("Role name must be unique within this company");
            }
        } else {
            // Check uniqueness for global roles
            if (roleRepo.existsByNameIgnoreCaseAndCompanyIsNull(r.getName().trim())) {
                return ResponseEntity.badRequest().body("Role name must be unique for global roles");
            }
        }

        try {
            Role saved = roleRepo.save(r);
            return ResponseEntity.created(URI.create("/roles/" + saved.getId())).body(saved);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Role r, 
                                   @RequestParam(required = false) Long companyId,
                                   @RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (r.getName() == null || r.getName().trim().isEmpty())
            return ResponseEntity.badRequest().body("Name is required");

        return roleRepo.findById(id).map(existing -> {
            // Check if this is a global role update (current role is global or being changed to global)
            boolean isCurrentGlobal = existing.getCompany() == null;
            boolean willBeGlobal = companyId == null;
            
            if (isCurrentGlobal || willBeGlobal) {
                // This involves a global role
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
            
            // Handle company assignment
            if (companyId != null) {
                Optional<Company> company = companyRepo.findById(companyId);
                if (company.isEmpty()) {
                    return ResponseEntity.badRequest().body("Company not found");
                }
                existing.setCompany(company.get());
                
                // Check name uniqueness within company (excluding current role)
                if (!existing.getName().equalsIgnoreCase(r.getName().trim()) &&
                    roleRepo.findByCompany(company.get()).stream()
                        .anyMatch(role -> role.getName().equalsIgnoreCase(r.getName().trim()) && !role.getId().equals(id))) {
                    return ResponseEntity.badRequest().body("Role name must be unique within this company");
                }
            } else {
                // Clearing company (making it global)
                existing.setCompany(null);
                
                // Check name uniqueness for global roles (excluding current role)
                if (!existing.getName().equalsIgnoreCase(r.getName().trim()) && 
                    roleRepo.findByCompanyIsNull().stream()
                        .anyMatch(role -> role.getName().equalsIgnoreCase(r.getName().trim()) && !role.getId().equals(id))) {
                    return ResponseEntity.badRequest().body("Role name must be unique for global roles");
                }
            }

            existing.setName(r.getName());
            existing.setDescription(r.getDescription());
            roleRepo.save(existing);
            return ResponseEntity.ok(existing);
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id,
                                      @RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (!roleRepo.existsById(id)) return ResponseEntity.notFound().build();
        
        Role existing = roleRepo.findById(id).orElse(null);
        if (existing == null) return ResponseEntity.notFound().build();
        
        // Check if this is a global role (company is NULL)
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
        
        roleRepo.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
