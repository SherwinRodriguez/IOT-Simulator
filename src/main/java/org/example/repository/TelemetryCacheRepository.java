package org.example.repository;

import org.example.entity.TelemetryCacheEntity;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TelemetryCacheRepository extends JpaRepository<TelemetryCacheEntity, Long> {

    List<TelemetryCacheEntity> findByDeviceIdAndDatapointNameOrderByRecordedAtDesc(
            UUID deviceId, String datapointName, Pageable pageable);

    List<TelemetryCacheEntity> findByDeviceIdOrderByRecordedAtDesc(UUID deviceId, Pageable pageable);

    /**
     * Prune old telemetry, keeping only the latest N rows per datapoint.
     * Called after each insert to maintain the 100-point sliding window.
     */
    @Modifying
    @Query(value = """
            DELETE FROM telemetry_cache
            WHERE id IN (
                SELECT id FROM (
                    SELECT id,
                           ROW_NUMBER() OVER (
                               PARTITION BY device_id, datapoint_name
                               ORDER BY recorded_at DESC
                           ) AS rn
                    FROM telemetry_cache
                    WHERE device_id = :deviceId AND datapoint_name = :datapointName
                ) ranked
                WHERE rn > :maxRows
            )
            """, nativeQuery = true)
    void pruneOldRecords(@Param("deviceId") UUID deviceId,
                         @Param("datapointName") String datapointName,
                         @Param("maxRows") int maxRows);
}
