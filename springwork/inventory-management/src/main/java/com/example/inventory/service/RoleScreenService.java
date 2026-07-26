package com.example.inventory.service;

import com.example.inventory.RoleScreen;
import com.example.inventory.Screen;
import com.example.inventory.repository.RoleScreenRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class RoleScreenService {
    private final RoleScreenRepository repo;

    public RoleScreenService(RoleScreenRepository repo) {
        this.repo = repo;
    }

    public List<RoleScreen> findByRoleId(Long roleId) {
        return repo.findByRoleId(roleId);
    }

    public List<Screen> findScreensByRoleId(Long roleId) {
        return repo.findScreensByRoleId(roleId);
    }

    public boolean existsByRoleIdAndScreenId(Long roleId, Long screenId) {
        return repo.existsByRoleIdAndScreenId(roleId, screenId);
    }

    @Transactional
    public void deleteByRoleIdAndScreenId(Long roleId, Long screenId) {
        repo.deleteByRoleIdAndScreenId(roleId, screenId);
    }

    @Transactional
    public RoleScreen save(RoleScreen roleScreen) {
        return repo.save(roleScreen);
    }

    public List<RoleScreen> findAll() {
        return repo.findAll();
    }
}
