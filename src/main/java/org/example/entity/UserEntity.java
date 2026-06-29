package org.example.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "users")
@Getter @Setter @NoArgsConstructor
public class UserEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(name = "zoho_user_id", nullable = false, unique = true)
    private String zohoUserId;

    @Column(nullable = false)
    private String email;

    @Column(name = "display_name")
    private String displayName;

    /** Zoho data center: in, us, eu, au, sa */
    @Column(nullable = false, length = 10)
    private String region = "in";

    /** Dynamic application domain returned by Zoho OAuth (e.g. https://app123.zohoiot.in) */
    @Column(name = "app_domain")
    private String appDomain;

    /** AES-256 encrypted Zoho access token */
    @Column(name = "access_token", columnDefinition = "TEXT")
    private String accessToken;

    /** AES-256 encrypted Zoho refresh token */
    @Column(name = "refresh_token", columnDefinition = "TEXT")
    private String refreshToken;

    @Column(name = "token_expires_at")
    private Instant tokenExpiresAt;

    @Column(name = "created_at", updatable = false)
    private Instant createdAt = Instant.now();

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<DeviceEntity> devices = new ArrayList<>();
}
