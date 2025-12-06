package com.example.inventory.repository;

import com.example.inventory.Screen;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ScreenRepository extends JpaRepository<Screen, Long> {
    boolean existsByNameIgnoreCase(String name);

    @Query("SELECT s FROM Screen s WHERE s.group.id = :groupId")
    List<Screen> findByGroupId(@Param("groupId") Long groupId);
}