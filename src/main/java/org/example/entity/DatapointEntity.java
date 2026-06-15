package org.example.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "datapoints",
       uniqueConstraints = @UniqueConstraint(columnNames = {"device_id", "name"}))
@Getter @Setter @NoArgsConstructor
public class DatapointEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "device_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private DeviceEntity device;

    @Column(name = "zoho_dp_id")
    private String zohoDpId;

    @Column(nullable = false)
    private String name;

    private String unit;

    @Column(name = "data_type", nullable = false)
    private String dataType = "NUMERIC";

    @Column(name = "created_at", updatable = false)
    private Instant createdAt = Instant.now();

    @OneToOne(mappedBy = "datapoint", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private SimulationConfigEntity simulationConfig;
}
