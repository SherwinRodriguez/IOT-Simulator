package org.example.repository;

import org.example.entity.DatapointEntity;
import org.example.entity.ModelEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DatapointRepository extends JpaRepository<DatapointEntity, UUID> {
    List<DatapointEntity> findByModel(ModelEntity model);
    Optional<DatapointEntity> findByModelAndParsingKey(ModelEntity model, String parsingKey);
    Optional<DatapointEntity> findByModelAndZohoDatapointId(ModelEntity model, String zohoDatapointId);
}
