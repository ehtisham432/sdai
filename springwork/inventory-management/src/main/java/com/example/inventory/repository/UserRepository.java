package com.example.inventory.repository;

import com.example.inventory.*;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long> {
	User findByLoginName(String loginName);
}
