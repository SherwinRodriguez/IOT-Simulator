package org.example.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Represents a saved Zoho IoT Sandbox application connection for a user.
 * A single Zoho Developer Account can have multiple Sandbox applications.
 * Each sandbox has its own devices, models and datapoints accessible only
 * via its specific application domain (e.g. https://app19310rjfay.zohoiot.in).
 */
@Entity
@Table(name = "app_connections")
@Getter @Setter @NoArgsConstructor
public class AppConnectionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private UserEntity user;

    /** Full application domain URL, e.g. https://app19310rjfay.zohoiot.in */
    @Column(name = "app_domain", nullable = false)
    private String appDomain;

    /** Human-friendly name for the sandbox, e.g. "Simulator" or "testing" */
    @Column(name = "app_name")
    private String appName;

    /** Whether this is the currently selected/active application */
    @Column(name = "is_active", nullable = false)
    private boolean active = false;

    @Column(name = "created_at", updatable = false)
    private Instant createdAt = Instant.now();

    @OneToMany(mappedBy = "sandbox", cascade = CascadeType.ALL, orphanRemoval = true)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private List<DeviceEntity> devices = new ArrayList<>();

    @OneToMany(mappedBy = "sandbox", cascade = CascadeType.ALL, orphanRemoval = true)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private List<ModelEntity> models = new ArrayList<>();
}
