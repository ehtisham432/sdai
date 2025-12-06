package com.example.inventory.repository;

import com.example.inventory.RoleScreen;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface RoleScreenRepository extends JpaRepository<RoleScreen, Long> {
    @Query("SELECT rs FROM RoleScreen rs WHERE rs.role.id = :roleId")
    List<RoleScreen> findByRoleId(@Param("roleId") Long roleId);

    @Query("SELECT rs.screen FROM RoleScreen rs WHERE rs.role.id = :roleId")
    List<com.example.inventory.Screen> findScreensByRoleId(@Param("roleId") Long roleId);

    boolean existsByRoleIdAndScreenId(Long roleId, Long screenId);

    void deleteByRoleIdAndScreenId(Long roleId, Long screenId);
}