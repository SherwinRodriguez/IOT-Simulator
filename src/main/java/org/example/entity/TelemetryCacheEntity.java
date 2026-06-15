package org.example.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "telemetry_cache")
@Getter @Setter @NoArgsConstructor
public class TelemetryCacheEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "device_id", nullable = false, columnDefinition = "uuid")
    private UUID deviceId;

    @Column(name = "datapoint_name", nullable = false)
    private String datapointName;

    private Double value;

    @Column(name = "recorded_at")
    private Instant recordedAt = Instant.now();
}
