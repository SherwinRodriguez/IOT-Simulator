package org.example.repository;

import org.example.entity.SimulationConfigEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface SimulationConfigRepository extends JpaRepository<SimulationConfigEntity, UUID> {
    Optional<SimulationConfigEntity> findByDatapointId(UUID datapointId);
}
