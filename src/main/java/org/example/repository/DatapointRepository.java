package org.example.repository;

import org.example.entity.DatapointEntity;
import org.example.entity.DeviceEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DatapointRepository extends JpaRepository<DatapointEntity, UUID> {
    List<DatapointEntity> findByDevice(DeviceEntity device);
    Optional<DatapointEntity> findByNameAndDevice(String name, DeviceEntity device);
    boolean existsByNameAndDevice(String name, DeviceEntity device);
}
