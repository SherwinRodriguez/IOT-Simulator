package org.example.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "devices",
       uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "zoho_device_id"}))
@Getter @Setter @NoArgsConstructor
public class DeviceEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private UserEntity user;

    @Column(name = "zoho_device_id", nullable = false)
    private String zohoDeviceId;

    @Column(nullable = false)
    private String name;

    @Column(name = "device_type")
    private String deviceType;

    @Column(name = "connectivity")
    private String connectivity;

    @Column(name = "mqtt_client_id")
    private String mqttClientId;

    @Column(name = "mqtt_username")
    private String mqttUsername;

    /** AES-256 encrypted MQTT password/token */
    @Column(name = "mqtt_password", columnDefinition = "TEXT")
    private String mqttPassword;

    @Column(name = "publish_topic", length = 500)
    private String publishTopic;

    @Column(nullable = false)
    private String status = "STOPPED"; // STOPPED | RUNNING | PAUSED

    @Column(name = "last_synced_at")
    private Instant lastSyncedAt;

    @Column(name = "created_at", updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "zoho_model_id")
    private String zohoModelId;
}
