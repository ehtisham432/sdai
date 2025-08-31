package com.example.inventory.controller;

import org.springframework.beans.factory.annotation.Autowired;
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
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    @PostMapping
    public User createUser(@RequestBody User user) {
        if (user.getCompany() != null && user.getCompany().getId() != null) {
            System.out.println(user.getCompany().getId());
            user.setCompany(companyRepository.findById(user.getCompany().getId()).orElse(null));
        } 
        if(user.getCompany() == null) {
            System.out.println("Company is null");
        }
        return userRepository.save(user);
    }

    @GetMapping("/{id}")
    public User getUser(@PathVariable Long id) {
        return userRepository.findById(id).orElse(null);
    }

    @PutMapping("/{id}")
    public User updateUser(@PathVariable Long id, @RequestBody User user) {
        user.setId(id);
        if (user.getCompany() != null && user.getCompany().getId() != null) {
            user.setCompany(companyRepository.findById(user.getCompany().getId()).orElse(null));
        }
        return userRepository.save(user);
    }

    @DeleteMapping("/{id}")
    public void deleteUser(@PathVariable Long id) {
        userRepository.deleteById(id);
    }
}
