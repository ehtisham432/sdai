package com.example.inventory.controller;

import org.springframework.beans.factory.annotation.Autowired;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.example.inventory.User;
import com.example.inventory.repository.UserRepository;

import java.util.List;

@RestController
@RequestMapping("/users")
public class UserController {
    @Autowired
    private UserRepository userRepository;

    @Autowired
    private com.example.inventory.repository.CompanyRepository companyRepository;

    @GetMapping
    public List<User> searchUsers(
            @RequestParam(required = false) String username,
            @RequestParam(required = false) String loginName,
            @RequestParam(required = false) String email,
            @RequestParam(required = false) Long companyId
    ) {
        List<User> users = userRepository.findAll();
        return users.stream().filter(user -> {
            boolean match = true;
            if (username != null && !username.isEmpty()) {
                match &= user.getUsername() != null && user.getUsername().toLowerCase().contains(username.toLowerCase());
            }
            if (loginName != null && !loginName.isEmpty()) {
                match &= user.getLoginName() != null && user.getLoginName().toLowerCase().contains(loginName.toLowerCase());
            }
            if (email != null && !email.isEmpty()) {
                match &= user.getEmail() != null && user.getEmail().toLowerCase().contains(email.toLowerCase());
            }
            if (companyId != null && user.getCompany() != null) {
                match &= user.getCompany().getId().equals(companyId);
            } else if (companyId != null) {
                match = false;
            }
            return match;
        }).toList();
    }

    @PostMapping
    public ResponseEntity<?> createUser(@RequestBody User user) {
        if (user.getCompany() != null && user.getCompany().getId() != null) {
            user.setCompany(companyRepository.findById(user.getCompany().getId()).orElse(null));
        }
        if (user.getCompany() == null) {
            System.out.println("Company is null");
        }
        // Enforce unique loginName
        if (user.getLoginName() == null || user.getLoginName().isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("loginName is required");
        }
        if (userRepository.findByLoginName(user.getLoginName()) != null) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body("loginName already exists");
        }
        if (user.getPassword() == null || user.getPassword().isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("password is required");
        }
        try {
            return ResponseEntity.ok(userRepository.save(user));
        } catch (DataIntegrityViolationException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body("loginName must be unique");
        }
    }

    @GetMapping("/{id}")
    public User getUser(@PathVariable Long id) {
        return userRepository.findById(id).orElse(null);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateUser(@PathVariable Long id, @RequestBody User user) {
        user.setId(id);
        if (user.getCompany() != null && user.getCompany().getId() != null) {
            user.setCompany(companyRepository.findById(user.getCompany().getId()).orElse(null));
        }
        if (user.getLoginName() == null || user.getLoginName().isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("loginName is required");
        }
        User existing = userRepository.findByLoginName(user.getLoginName());
        if (existing != null && !existing.getId().equals(id)) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body("loginName already exists");
        }
        if (user.getPassword() == null || user.getPassword().isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("password is required");
        }
        try {
            return ResponseEntity.ok(userRepository.save(user));
        } catch (DataIntegrityViolationException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body("loginName must be unique");
        }
    }

    @DeleteMapping("/{id}")
    public void deleteUser(@PathVariable Long id) {
        userRepository.deleteById(id);
    }
}
