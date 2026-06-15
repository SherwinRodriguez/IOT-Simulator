package org.example.repository;

import org.example.entity.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<UserEntity, UUID> {
    Optional<UserEntity> findByZohoUserId(String zohoUserId);
    Optional<UserEntity> findByEmail(String email);
    boolean existsByZohoUserId(String zohoUserId);
}
