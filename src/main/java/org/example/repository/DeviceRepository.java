package org.example.repository;

import org.example.entity.DeviceEntity;
import org.example.entity.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DeviceRepository extends JpaRepository<DeviceEntity, UUID> {
    List<DeviceEntity> findByUser(UserEntity user);
    Optional<DeviceEntity> findByIdAndUser(UUID id, UserEntity user);
    Optional<DeviceEntity> findByZohoDeviceIdAndUser(String zohoDeviceId, UserEntity user);
    boolean existsByZohoDeviceIdAndUser(String zohoDeviceId, UserEntity user);
}
