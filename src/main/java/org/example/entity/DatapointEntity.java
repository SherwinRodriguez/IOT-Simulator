package org.example.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "datapoints",
       uniqueConstraints = {
               @UniqueConstraint(columnNames = {"model_id", "parsing_key"}),
               @UniqueConstraint(columnNames = {"model_id", "zoho_datapoint_id"})
       })
@Getter @Setter @NoArgsConstructor
public class DatapointEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "model_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private ModelEntity model;

    @Column(name = "zoho_datapoint_id")
    private String zohoDatapointId;

    @Column(nullable = false)
    private String name;

    @Column(name = "parsing_key", nullable = false)
    private String parsingKey;

    @Column(name = "data_type")
    private String dataType;

    @Column(name = "unit")
    private String unit;

    @Column(name = "created_at", updatable = false)
    private Instant createdAt = Instant.now();
}
