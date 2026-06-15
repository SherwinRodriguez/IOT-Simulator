package org.example.controller;

import org.example.entity.DeviceEntity;
import org.example.entity.UserEntity;
import org.example.repository.DeviceRepository;
import org.example.repository.TelemetryCacheRepository;
import org.example.service.SimulationManagerService;
import org.example.zoho.DatapointSyncService;
import org.example.zoho.DeviceSyncService;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/devices")
public class DeviceController {

    private final DeviceRepository deviceRepository;
    private final SimulationManagerService simulationManagerService;
    private final DeviceSyncService deviceSyncService;
    private final DatapointSyncService datapointSyncService;
    private final TelemetryCacheRepository telemetryCacheRepository;

    public DeviceController(DeviceRepository deviceRepository,
                             SimulationManagerService simulationManagerService,
                             DeviceSyncService deviceSyncService,
                             DatapointSyncService datapointSyncService,
                             TelemetryCacheRepository telemetryCacheRepository) {
        this.deviceRepository         = deviceRepository;
        this.simulationManagerService = simulationManagerService;
        this.deviceSyncService        = deviceSyncService;
        this.datapointSyncService     = datapointSyncService;
        this.telemetryCacheRepository = telemetryCacheRepository;
    }

    // ─── CRUD ─────────────────────────────────────────────────────────────────

    @GetMapping
    public ResponseEntity<List<DeviceEntity>> listDevices(@AuthenticationPrincipal UserEntity user) {
        return ResponseEntity.ok(deviceRepository.findByUser(user));
    }

    @GetMapping("/{id}")
    public ResponseEntity<DeviceEntity> getDevice(@PathVariable UUID id,
                                                   @AuthenticationPrincipal UserEntity user) {
        return deviceRepository.findByIdAndUser(id, user)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDevice(@PathVariable UUID id,
                                              @AuthenticationPrincipal UserEntity user) {
        return deviceRepository.findByIdAndUser(id, user).map(device -> {
            if (simulationManagerService.isRunning(id)) {
                simulationManagerService.stopSimulation(id);
            }
            deviceRepository.delete(device);
            return ResponseEntity.ok().<Void>build();
        }).orElse(ResponseEntity.notFound().build());
    }

    // ─── Zoho Sync ────────────────────────────────────────────────────────────

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

    @PostMapping("/{id}/datapoints/sync")
    public ResponseEntity<?> syncDatapoints(@PathVariable UUID id,
                                             @AuthenticationPrincipal UserEntity user) {
        return deviceRepository.findByIdAndUser(id, user).map(device -> {
            try {
                var dps = datapointSyncService.syncDatapoints(user, device);
                return ResponseEntity.ok(Map.of(
                        "synced", dps.size(),
                        "message", "Datapoints synced from Zoho IoT"
                ));
            } catch (Exception e) {
                org.slf4j.LoggerFactory.getLogger(DeviceController.class).error("Datapoints Sync failed for device " + id, e);
                return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                        .body(Map.of("error", "Zoho sync failed: " + e.getMessage()));
            }
        }).orElse(ResponseEntity.notFound().build());
    }

    // ─── Simulation Control ───────────────────────────────────────────────────

    @PostMapping("/{id}/start")
    public ResponseEntity<?> start(@PathVariable UUID id, @AuthenticationPrincipal UserEntity user) {
        return deviceRepository.findByIdAndUser(id, user).map(device -> {
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
        return deviceRepository.findByIdAndUser(id, user).map(device -> {
            simulationManagerService.stopSimulation(id);
            return ResponseEntity.ok(Map.of("status", "STOPPED"));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/pause")
    public ResponseEntity<?> pause(@PathVariable UUID id, @AuthenticationPrincipal UserEntity user) {
        return deviceRepository.findByIdAndUser(id, user).map(device -> {
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
        return deviceRepository.findByIdAndUser(id, user).map(device -> {
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
        return deviceRepository.findByIdAndUser(id, user).map(device -> {
            var history = telemetryCacheRepository
                    .findByDeviceIdOrderByRecordedAtDesc(id, PageRequest.of(0, 100));
            return ResponseEntity.ok(history);
        }).orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}/telemetry/live")
    public ResponseEntity<?> getLiveTelemetry(@PathVariable UUID id,
                                               @AuthenticationPrincipal UserEntity user) {
        return deviceRepository.findByIdAndUser(id, user).map(device -> {
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
        List<DeviceEntity> devices = deviceRepository.findByUser(user);
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
}
