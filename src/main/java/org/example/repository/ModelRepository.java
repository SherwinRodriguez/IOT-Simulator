package org.example.repository;

import org.example.entity.AppConnectionEntity;
import org.example.entity.ModelEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ModelRepository extends JpaRepository<ModelEntity, UUID> {
    List<ModelEntity> findBySandbox(AppConnectionEntity sandbox);
    Optional<ModelEntity> findBySandboxAndZohoModelId(AppConnectionEntity sandbox, String zohoModelId);
}
