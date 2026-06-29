package org.example.controller;

import org.example.entity.AppConnectionEntity;
import org.example.entity.DeviceEntity;
import org.example.entity.UserEntity;
import org.example.repository.AppConnectionRepository;
import org.example.repository.DeviceRepository;
import org.example.repository.TelemetryCacheRepository;
import org.example.service.SimulationManagerService;

import org.example.zoho.DeviceSyncService;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/devices")
public class DeviceController {

    private final DeviceRepository deviceRepository;
    private final SimulationManagerService simulationManagerService;
    private final DeviceSyncService deviceSyncService;
    private final TelemetryCacheRepository telemetryCacheRepository;
    private final AppConnectionRepository appConnectionRepository;

    public DeviceController(DeviceRepository deviceRepository,
                             SimulationManagerService simulationManagerService,
                             DeviceSyncService deviceSyncService,
                             TelemetryCacheRepository telemetryCacheRepository,
                             AppConnectionRepository appConnectionRepository) {
        this.deviceRepository         = deviceRepository;
        this.simulationManagerService = simulationManagerService;
        this.deviceSyncService        = deviceSyncService;
        this.telemetryCacheRepository = telemetryCacheRepository;
        this.appConnectionRepository  = appConnectionRepository;
    }

    // ─── CRUD ─────────────────────────────────────────────────────────────────

    @GetMapping
    public ResponseEntity<List<DeviceEntity>> listDevices(@AuthenticationPrincipal UserEntity user) {
        return activeSandbox(user)
                .map(sandbox -> ResponseEntity.ok(deviceRepository.findBySandbox(sandbox)))
                .orElseGet(() -> ResponseEntity.ok(List.of()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<DeviceEntity> getDevice(@PathVariable UUID id,
                                                   @AuthenticationPrincipal UserEntity user) {
        return findActiveDevice(id, user)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDevice(@PathVariable UUID id,
                                              @AuthenticationPrincipal UserEntity user) {
        return findActiveDevice(id, user).map(device -> {
            if (simulationManagerService.isRunning(id)) {
                simulationManagerService.stopSimulation(id);
            }
            deviceRepository.delete(device);
            return ResponseEntity.ok().<Void>build();
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> createDevice(@RequestBody Map<String, String> payload, 
                                          @AuthenticationPrincipal UserEntity user) {
        try {
            String name = payload.get("name");
            String description = payload.get("description");
            String modelId = payload.get("model_id");

            if (name == null || name.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Device name is required"));
            }

            DeviceEntity newDevice = deviceSyncService.createDevice(user, name, description, modelId);
            if (newDevice != null) {
                return ResponseEntity.ok(newDevice);
            } else {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body(Map.of("error", "Failed to retrieve the created device from sync"));
            }
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body(Map.of("error", "Failed to create device: " + e.getMessage()));
        }
    }

    // ─── Zoho Sync ────────────────────────────────────────────────────────────

    @GetMapping("/models")
    public ResponseEntity<?> getModels(@AuthenticationPrincipal UserEntity user) {
        try {
            var models = deviceSyncService.getModels(user);
            return ResponseEntity.ok(models);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body(Map.of("error", "Failed to fetch models: " + e.getMessage()));
        }
    }

    @PostMapping("/sync")
    public ResponseEntity<?> syncDevices(@AuthenticationPrincipal UserEntity user) {
        try {
            List<DeviceEntity> synced = deviceSyncService.syncDevices(user);
            return ResponseEntity.ok(Map.of(
                    "synced", synced.size(),
                    "message", "Devices synced from Zoho IoT"
            ));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body(Map.of("error", "Zoho sync failed: " + e.getMessage()));
        }
    }

    @PostMapping("/{id}/register")
    public ResponseEntity<?> registerDevice(@PathVariable UUID id,
                                            @AuthenticationPrincipal UserEntity user) {
        try {
            DeviceEntity registered = deviceSyncService.registerDevice(user, id);
            return ResponseEntity.ok(registered);
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body(Map.of("error", "Device registration failed: " + e.getMessage()));
        }
    }



    // ─── Simulation Control ───────────────────────────────────────────────────

    @PostMapping("/{id}/start")
    public ResponseEntity<?> start(@PathVariable UUID id, @AuthenticationPrincipal UserEntity user) {
        return findActiveDevice(id, user).map(device -> {
            try {
                simulationManagerService.startSimulation(id);
                return ResponseEntity.ok(Map.of("status", "RUNNING"));
            } catch (IllegalStateException e) {
                return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
            }
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/stop")
    public ResponseEntity<?> stop(@PathVariable UUID id, @AuthenticationPrincipal UserEntity user) {
        return findActiveDevice(id, user).map(device -> {
            simulationManagerService.stopSimulation(id);
            return ResponseEntity.ok(Map.of("status", "STOPPED"));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/pause")
    public ResponseEntity<?> pause(@PathVariable UUID id, @AuthenticationPrincipal UserEntity user) {
        return findActiveDevice(id, user).map(device -> {
            try {
                simulationManagerService.pauseSimulation(id);
                return ResponseEntity.ok(Map.of("status", "PAUSED"));
            } catch (IllegalStateException e) {
                return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
            }
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/resume")
    public ResponseEntity<?> resume(@PathVariable UUID id, @AuthenticationPrincipal UserEntity user) {
        return findActiveDevice(id, user).map(device -> {
            try {
                simulationManagerService.resumeSimulation(id);
                return ResponseEntity.ok(Map.of("status", "RUNNING"));
            } catch (IllegalStateException e) {
                return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
            }
        }).orElse(ResponseEntity.notFound().build());
    }

    // ─── Telemetry History ────────────────────────────────────────────────────

    @GetMapping("/{id}/telemetry/history")
    public ResponseEntity<?> getTelemetryHistory(@PathVariable UUID id,
                                                  @AuthenticationPrincipal UserEntity user) {
        return findActiveDevice(id, user).map(device -> {
            var history = telemetryCacheRepository
                    .findByDeviceIdOrderByRecordedAtDesc(id, PageRequest.of(0, 100));
            return ResponseEntity.ok(history);
        }).orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}/telemetry/live")
    public ResponseEntity<?> getLiveTelemetry(@PathVariable UUID id,
                                               @AuthenticationPrincipal UserEntity user) {
        return findActiveDevice(id, user).map(device -> {
            if (!simulationManagerService.isRunning(id)) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Simulation not running"));
            }
            return ResponseEntity.ok(simulationManagerService.getTelemetry(id));
        }).orElse(ResponseEntity.notFound().build());
    }

    // ─── Global Stats ─────────────────────────────────────────────────────────

    @GetMapping("/stats")
    public ResponseEntity<?> getStats(@AuthenticationPrincipal UserEntity user) {
        List<DeviceEntity> devices = activeSandbox(user)
                .map(deviceRepository::findBySandbox)
                .orElseGet(List::of);
        long total   = devices.size();
        long running = devices.stream().filter(d -> "RUNNING".equals(d.getStatus())).count();
        long paused  = devices.stream().filter(d -> "PAUSED".equals(d.getStatus())).count();

        return ResponseEntity.ok(Map.of(
                "totalDevices",       total,
                "activeSimulations",  running,
                "pausedSimulations",  paused,
                "stoppedDevices",     total - running - paused
        ));
    }

    private Optional<AppConnectionEntity> activeSandbox(UserEntity user) {
        return appConnectionRepository.findByUserAndActiveTrue(user)
                .filter(sandbox -> sandbox.getAppDomain() != null
                        && sandbox.getAppDomain().equals(user.getAppDomain()));
    }

    private Optional<DeviceEntity> findActiveDevice(UUID id, UserEntity user) {
        return activeSandbox(user)
                .flatMap(sandbox -> deviceRepository.findByIdAndUser(id, user)
                        .filter(device -> device.getSandbox() != null
                                && sandbox.getId().equals(device.getSandbox().getId())));
    }

}
