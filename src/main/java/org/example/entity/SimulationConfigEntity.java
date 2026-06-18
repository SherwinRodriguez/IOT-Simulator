package org.example.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

@Entity
@Table(name = "simulation_configs")
@Getter @Setter @NoArgsConstructor
public class SimulationConfigEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(name = "device_id", nullable = false)
    private UUID deviceId;

    @Column(name = "parsing_key", nullable = false)
    private String parsingKey;

    /**
     * Pattern type: RANDOM | INCREMENTAL | DECREMENTAL
     */
    @Column(nullable = false)
    private String pattern = "RANDOM";

    @Column(name = "min_value", nullable = false)
    private Double minValue = 0.0;

    @Column(name = "max_value", nullable = false)
    private Double maxValue = 100.0;

    @Column(name = "start_value", nullable = false)
    private Double startValue = 0.0;

    @Column(name = "step_value", nullable = false)
    private Double stepValue = 1.0;

    @Column(name = "publish_interval_ms", nullable = false)
    private Integer publishIntervalMs = 5000;
}
