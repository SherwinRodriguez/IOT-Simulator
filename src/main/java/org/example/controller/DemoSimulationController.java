package org.example.controller;

import org.example.entity.DeviceEntity;
import org.example.entity.SimulationConfigEntity;
import org.example.service.SimulationManagerService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/demo")
public class DemoSimulationController {

    private static final Logger log = LoggerFactory.getLogger(DemoSimulationController.class);
    private final SimulationManagerService simulationManagerService;

    public DemoSimulationController(SimulationManagerService simulationManagerService) {
        this.simulationManagerService = simulationManagerService;
    }

    @PostMapping("/simulate/start")
    public ResponseEntity<?> startSimulation(@RequestBody DemoSimulationRequest req) {
        log.info("Starting Demo Simulation for clientId: {}", req.clientId);

        if (req.clientId == null || req.clientId.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Client ID is required"));
        }
        if (req.brokerUrl == null || req.brokerUrl.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Broker URL is required"));
        }

        // Create a transient DeviceEntity (NOT saved to DB)
        DeviceEntity device = new DeviceEntity();
        // Use a deterministic UUID or random one, but we need it for WebSocket topics
        device.setId(UUID.randomUUID());
        device.setName("Demo Device - " + req.clientId);
        device.setMqttClientId(req.clientId);
        device.setMqttUsername(req.username);
        device.setMqttPassword(req.password); // In demo mode, we just pass the raw password to Paho MQTT
        
        String topic = req.publishTopic;
        if (topic == null || topic.isEmpty()) {
            topic = "devices/" + req.clientId + "/telemetry";
        }
        device.setPublishTopic(topic);

        // Create transient SimulationConfigs
        List<SimulationConfigEntity> simConfigs = new ArrayList<>();
        if (req.datapoints != null) {
            for (DemoSimulationRequest.DatapointConfig dp : req.datapoints) {
                SimulationConfigEntity cfg = new SimulationConfigEntity();
                cfg.setDeviceId(device.getId());
                cfg.setParsingKey(dp.parsingKey != null ? dp.parsingKey : dp.name);
                cfg.setPattern(dp.pattern != null ? dp.pattern : "RANDOM");
                cfg.setMinValue(dp.min != null ? dp.min : 0.0);
                cfg.setMaxValue(dp.max != null ? dp.max : 100.0);
                cfg.setStartValue(dp.start != null ? dp.start : 0.0);
                cfg.setStepValue(dp.step != null ? dp.step : 1.0);
                cfg.setPublishIntervalMs(dp.intervalMs != null ? dp.intervalMs : 5000);
                simConfigs.add(cfg);
            }
        }

        try {
            // Start the transient simulator (bypassing DB checks)
            simulationManagerService.startTransientSimulation(device, simConfigs, req.brokerUrl);
            return ResponseEntity.ok(Map.of(
                "message", "Simulation started successfully",
                "deviceId", device.getId().toString()
            ));
        } catch (Exception e) {
            log.error("Failed to start demo simulation", e);
            return ResponseEntity.internalServerError().body(Map.of("message", "Failed to start simulation: " + e.getMessage()));
        }
    }

    @PostMapping("/simulate/{deviceId}/stop")
    public ResponseEntity<?> stopSimulation(@PathVariable UUID deviceId) {
        log.info("Stopping Demo Simulation for device: {}", deviceId);
        simulationManagerService.stopSimulation(deviceId);
        return ResponseEntity.ok(Map.of("message", "Simulation stopped"));
    }
}
