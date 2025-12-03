package com.example.inventory.repository;

import com.example.inventory.UserCompanyRole;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface UserCompanyRoleRepository extends JpaRepository<UserCompanyRole, Long> {
    List<UserCompanyRole> findByUserId(Long userId);
    List<UserCompanyRole> findByCompanyId(Long companyId);
    UserCompanyRole findByUserIdAndCompanyId(Long userId, Long companyId);
}