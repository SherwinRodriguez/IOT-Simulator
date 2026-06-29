package org.example.repository;

import org.example.entity.AppConnectionEntity;
import org.example.entity.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AppConnectionRepository extends JpaRepository<AppConnectionEntity, UUID> {

    List<AppConnectionEntity> findByUserOrderByCreatedAtDesc(UserEntity user);

    Optional<AppConnectionEntity> findByUserAndAppDomain(UserEntity user, String appDomain);

    Optional<AppConnectionEntity> findByUserAndActiveTrue(UserEntity user);

    @Modifying
    @Query("UPDATE AppConnectionEntity a SET a.active = false WHERE a.user = :user")
    void deactivateAll(UserEntity user);

    @Modifying
    @Query("DELETE FROM AppConnectionEntity a WHERE a.user = :user")
    void deleteByUser(UserEntity user);
}
