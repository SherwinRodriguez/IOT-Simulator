package org.example.controller;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.example.entity.DatapointEntity;
import org.example.entity.DeviceEntity;
import org.example.entity.SimulationConfigEntity;
import org.example.entity.UserEntity;
import org.example.repository.DatapointRepository;
import org.example.repository.DeviceRepository;
import org.example.repository.SimulationConfigRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/devices/{deviceId}/datapoints")
public class DatapointController {

    private final DeviceRepository deviceRepository;
    private final DatapointRepository datapointRepository;
    private final SimulationConfigRepository simConfigRepository;

    public DatapointController(DeviceRepository deviceRepository,
                                DatapointRepository datapointRepository,
                                SimulationConfigRepository simConfigRepository) {
        this.deviceRepository   = deviceRepository;
        this.datapointRepository = datapointRepository;
        this.simConfigRepository = simConfigRepository;
    }

    @GetMapping
    public ResponseEntity<List<DatapointEntity>> listDatapoints(
            @PathVariable UUID deviceId,
            @AuthenticationPrincipal UserEntity user) {
        return deviceRepository.findByIdAndUser(deviceId, user)
                .map(device -> ResponseEntity.ok(datapointRepository.findByDevice(device)))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{dpId}/config")
    public ResponseEntity<?> getConfig(@PathVariable UUID deviceId,
                                        @PathVariable UUID dpId,
                                        @AuthenticationPrincipal UserEntity user) {
        return deviceRepository.findByIdAndUser(deviceId, user).map(device ->
            datapointRepository.findById(dpId)
                .filter(dp -> dp.getDevice().getId().equals(deviceId))
                .map(dp -> {
                    SimulationConfigEntity cfg = dp.getSimulationConfig();
                    if (cfg == null) return ResponseEntity.notFound().<SimulationConfigEntity>build();
                    return ResponseEntity.ok(cfg);
                })
                .orElseGet(() -> ResponseEntity.notFound().build())
        ).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PutMapping("/{dpId}/config")
    public ResponseEntity<?> updateConfig(@PathVariable UUID deviceId,
                                           @PathVariable UUID dpId,
                                           @Valid @RequestBody SimulationConfigRequest request,
                                           @AuthenticationPrincipal UserEntity user) {
        return deviceRepository.findByIdAndUser(deviceId, user).map(device ->
            datapointRepository.findById(dpId)
                .filter(dp -> dp.getDevice().getId().equals(deviceId))
                .map(dp -> {
                    SimulationConfigEntity cfg = dp.getSimulationConfig();
                    if (cfg == null) {
                        cfg = new SimulationConfigEntity();
                        cfg.setDatapoint(dp);
                    }
                    cfg.setPattern(request.pattern());
                    cfg.setMinValue(request.minValue());
                    cfg.setMaxValue(request.maxValue());
                    cfg.setStartValue(request.startValue());
                    cfg.setStepValue(request.stepValue());
                    cfg.setPublishIntervalMs(request.publishIntervalMs());
                    simConfigRepository.save(cfg);
                    return ResponseEntity.ok(cfg);
                })
                .orElseGet(() -> ResponseEntity.notFound().build())
        ).orElseGet(() -> ResponseEntity.notFound().build());
    }

    public record SimulationConfigRequest(
            @NotBlank(message = "Pattern cannot be blank")
            String pattern,
            @NotNull
            Double minValue,
            @NotNull
            Double maxValue,
            @NotNull
            Double startValue,
            @NotNull
            @Min(value = 0, message = "Step value must be non-negative")
            Double stepValue,
            @NotNull
            @Min(value = 500, message = "Publish interval must be at least 500ms")
            Integer publishIntervalMs
    ) {}
}
