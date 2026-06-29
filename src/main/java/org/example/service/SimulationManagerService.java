package org.example.service;

import jakarta.annotation.PreDestroy;
import org.example.entity.DeviceEntity;
import org.example.entity.TelemetryCacheEntity;
import org.example.repository.DeviceRepository;
import org.example.repository.TelemetryCacheRepository;
import org.example.simulator.DeviceSimulator;
import org.example.security.EncryptionService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.*;

/**
 * Manages the lifecycle of device simulators.
 *
 * Changes from the original:
 *  - ExecutorService thread pool instead of raw Thread
 *  - Pause / Resume support
 *  - WebSocket integration (SimpMessagingTemplate injected into DeviceSimulator)
 *  - Telemetry persistence (100-point rolling window)
 *  - Token decryption before passing MQTT credentials to simulator
 */
@Service
public class SimulationManagerService {

    private static final Logger log = LoggerFactory.getLogger(SimulationManagerService.class);
    private static final int TELEMETRY_MAX_ROWS = 100;

    @Value("${mqtt.broker:tcp://60863cfqlp.zohoiothub.in:1883}")
    private String defaultBroker;

    private final DeviceRepository deviceRepository;
    private final TelemetryCacheRepository telemetryCacheRepository;
    private final EncryptionService encryptionService;
    private final SimpMessagingTemplate messagingTemplate;
    private final org.example.repository.SimulationConfigRepository simConfigRepository;
    private final org.springframework.transaction.support.TransactionTemplate transactionTemplate;

    // Thread pool — one thread per active simulation
    private final ExecutorService executor = Executors.newCachedThreadPool(r -> {
        Thread t = new Thread(r);
        t.setDaemon(true);
        t.setName("device-simulator-" + t.getId());
        return t;
    });

    // Active simulators and their futures
    private final Map<UUID, Future<?>> activeFutures    = new ConcurrentHashMap<>();
    private final Map<UUID, DeviceSimulator> activeSimulators = new ConcurrentHashMap<>();

    public SimulationManagerService(DeviceRepository deviceRepository,
                                    TelemetryCacheRepository telemetryCacheRepository,
                                    EncryptionService encryptionService,
                                    SimpMessagingTemplate messagingTemplate,
                                    org.example.repository.SimulationConfigRepository simConfigRepository,
                                    org.springframework.transaction.support.TransactionTemplate transactionTemplate) {
        this.deviceRepository        = deviceRepository;
        this.telemetryCacheRepository = telemetryCacheRepository;
        this.encryptionService       = encryptionService;
        this.messagingTemplate       = messagingTemplate;
        this.simConfigRepository     = simConfigRepository;
        this.transactionTemplate     = transactionTemplate;
    }

    // ─── Start ────────────────────────────────────────────────────────────────

    @Transactional
    public synchronized void startSimulation(UUID deviceId) {
        if (activeSimulators.containsKey(deviceId)) {
            throw new IllegalStateException("Simulation already running for device " + deviceId);
        }

        DeviceEntity device = deviceRepository.findById(deviceId)
                .orElseThrow(() -> new IllegalArgumentException("Device not found: " + deviceId));

        if (isBlank(device.getMqttBrokerUrl())) {
            deriveBrokerUrlFromUsername(device.getMqttUsername()).ifPresent(brokerUrl -> {
                device.setMqttBrokerUrl(brokerUrl);
                deviceRepository.save(device);
                log.info("[Manager] Derived MQTT broker URL for device {} from username: {}", device.getName(), brokerUrl);
            });
        }

        validateRegisteredForSimulation(device);

        // Fetch local simulation configs
        List<org.example.entity.SimulationConfigEntity> configs = simConfigRepository.findByDeviceId(deviceId);
        if (configs.isEmpty()) {
            throw new IllegalStateException("No datapoints are configured for this device. Open the device datapoints once or sync datapoints before starting simulation.");
        }

        // Decrypt MQTT password into a local variable — do NOT write it back to the entity
        // that will be saved, otherwise the DB gets the plaintext and future decrypts fail.
        String mqttPassword = device.getMqttPassword();
        if (mqttPassword != null) {
            mqttPassword = encryptionService.decrypt(mqttPassword);
        }

        // Create a transient copy with the decrypted password for the simulator
        DeviceEntity simDevice = new DeviceEntity();
        simDevice.setId(device.getId());
        simDevice.setName(device.getName());
        simDevice.setMqttClientId(device.getMqttClientId());
        simDevice.setMqttUsername(device.getMqttUsername());
        simDevice.setMqttPassword(mqttPassword);
        simDevice.setPublishTopic(device.getPublishTopic());
        simDevice.setMqttBrokerUrl(device.getMqttBrokerUrl());
        simDevice.setStatus(device.getStatus());

        DeviceSimulator simulator = new DeviceSimulator(
                simDevice,
                configs,
                simDevice.getMqttBrokerUrl() != null ? simDevice.getMqttBrokerUrl() : defaultBroker,
                messagingTemplate,
                this::persistTelemetry
        );

        Future<?> future = executor.submit(() -> runSimulator(deviceId, simulator));
        activeFutures.put(deviceId, future);
        activeSimulators.put(deviceId, simulator);

        device.setStatus("RUNNING");
        deviceRepository.save(device);
        log.info("[Manager] Started simulation for device {}", device.getName());
    }

    private void validateRegisteredForSimulation(DeviceEntity device) {
        List<String> missing = new ArrayList<>();
        if (isBlank(device.getMqttClientId())) missing.add("client ID");
        if (isBlank(device.getMqttUsername())) missing.add("username");
        if (isBlank(device.getMqttPassword())) missing.add("device token");
        if (isBlank(device.getPublishTopic())) missing.add("publish topic");
        if (isBlank(device.getMqttBrokerUrl())) missing.add("broker URL");

        if (!missing.isEmpty()) {
            throw new IllegalStateException(
                    "Device is not registered for simulation yet. Missing MQTT " + String.join(", ", missing)
                            + ". Open the device in Zoho IoT, complete onboarding/registration, then sync again.");
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private Optional<String> deriveBrokerUrlFromUsername(String username) {
        if (isBlank(username)) {
            return Optional.empty();
        }

        String value = username.trim();
        int hostStart = value.startsWith("/") ? 1 : 0;
        int hostEnd = value.indexOf('/', hostStart);
        if (hostEnd <= hostStart) {
            return Optional.empty();
        }

        String host = value.substring(hostStart, hostEnd);
        if (!host.contains(".zohoiothub.")) {
            return Optional.empty();
        }
        return Optional.of("tcp://" + host + ":1883");
    }

    public synchronized void startTransientSimulation(DeviceEntity device, List<org.example.entity.SimulationConfigEntity> configs, String brokerUrl) {
        if (activeSimulators.containsKey(device.getId())) {
            throw new IllegalStateException("Simulation already running for device " + device.getId());
        }

        // For transient simulators, the password is provided raw, so no decryption needed
        DeviceSimulator simulator = new DeviceSimulator(
                device,
                configs,
                brokerUrl != null ? brokerUrl : defaultBroker,
                messagingTemplate,
                null // Do not persist telemetry for transient demo devices
        );

        Future<?> future = executor.submit(() -> runSimulator(device.getId(), simulator));
        activeFutures.put(device.getId(), future);
        activeSimulators.put(device.getId(), simulator);

        log.info("[Manager] Started transient simulation for device {}", device.getName());
    }

    // ─── Stop ─────────────────────────────────────────────────────────────────

    @Transactional
    public synchronized void stopSimulation(UUID deviceId) {
        DeviceSimulator simulator = activeSimulators.get(deviceId);
        if (simulator != null) {
            simulator.requestStop();
        }

        Future<?> future = activeFutures.remove(deviceId);
        if (future != null) {
            try {
                future.get(5, TimeUnit.SECONDS);
            } catch (TimeoutException e) {
                log.warn("[Manager] Timed out waiting for simulator {} to stop, interrupting it", deviceId);
                future.cancel(true);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                future.cancel(true);
            } catch (ExecutionException e) {
                log.warn("[Manager] Simulator {} ended with error during stop: {}", deviceId, e.getMessage());
            }
        }
        activeSimulators.remove(deviceId);

        deviceRepository.findById(deviceId).ifPresent(device -> {
            device.setStatus("STOPPED");
            deviceRepository.save(device);
        });
        log.info("[Manager] Stopped simulation for device {}", deviceId);
    }

    // ─── Pause ────────────────────────────────────────────────────────────────

    @Transactional
    public void pauseSimulation(UUID deviceId) {
        DeviceSimulator sim = activeSimulators.get(deviceId);
        if (sim == null) throw new IllegalStateException("Simulation not running for device " + deviceId);
        sim.pause();

        deviceRepository.findById(deviceId).ifPresent(device -> {
            device.setStatus("PAUSED");
            deviceRepository.save(device);
        });
    }

    // ─── Resume ───────────────────────────────────────────────────────────────

    @Transactional
    public void resumeSimulation(UUID deviceId) {
        DeviceSimulator sim = activeSimulators.get(deviceId);
        if (sim == null) throw new IllegalStateException("Simulation not running for device " + deviceId);
        sim.resume();

        deviceRepository.findById(deviceId).ifPresent(device -> {
            device.setStatus("RUNNING");
            deviceRepository.save(device);
        });
    }

    // ─── Update Config ────────────────────────────────────────────────────────

    public void updateSimulatorConfig(UUID deviceId, org.example.entity.SimulationConfigEntity cfg) {
        DeviceSimulator sim = activeSimulators.get(deviceId);
        if (sim != null) {
            sim.updateConfig(cfg);
            log.info("[Manager] Updated config dynamically for device {} parsingKey {}", deviceId, cfg.getParsingKey());
        }
    }

    // ─── Status ────────────────────────────────────────────────────────────────

    public boolean isRunning(UUID deviceId) { return activeFutures.containsKey(deviceId); }
    public boolean isPaused(UUID deviceId) {
        DeviceSimulator sim = activeSimulators.get(deviceId);
        return sim != null && sim.isPaused();
    }

    public Map<String, Object> getTelemetry(UUID deviceId) {
        DeviceSimulator sim = activeSimulators.get(deviceId);
        if (sim == null) return Map.of();
        Map<String, Object> data = new HashMap<>(sim.getLatestTelemetry());
        data.put("_messagesSent", sim.getMessageCount());
        data.put("_lastPublished", sim.getLastPublished());
        return data;
    }

    public long getActiveCount() { return activeFutures.size(); }

    private void runSimulator(UUID deviceId, DeviceSimulator simulator) {
        try {
            simulator.run();
        } finally {
            activeFutures.remove(deviceId);
            activeSimulators.remove(deviceId);
            transactionTemplate.executeWithoutResult(status ->
                    deviceRepository.findById(deviceId).ifPresent(device -> {
                        if ("RUNNING".equals(device.getStatus())) {
                            device.setStatus("STOPPED");
                            deviceRepository.save(device);
                        }
                    })
            );
            log.info("[Manager] Simulator thread ended for device {}", deviceId);
        }
    }

    // ─── Telemetry Persistence ────────────────────────────────────────────────

    public void persistTelemetry(UUID deviceId, Map<String, Double> telemetry) {
        transactionTemplate.executeWithoutResult(status -> {
            telemetry.forEach((dpName, value) -> {
                TelemetryCacheEntity entry = new TelemetryCacheEntity();
                entry.setDeviceId(deviceId);
                entry.setDatapointName(dpName);
                entry.setValue(value);
                entry.setRecordedAt(Instant.now());
                telemetryCacheRepository.save(entry);

                // Prune to keep only 100 rows
                telemetryCacheRepository.pruneOldRecords(deviceId, dpName, TELEMETRY_MAX_ROWS);
            });
        });
    }

    // ─── Graceful Shutdown ────────────────────────────────────────────────────

    @PreDestroy
    public void shutdown() {
        log.info("[Manager] Shutting down all simulations...");
        activeFutures.values().forEach(f -> f.cancel(true));
        executor.shutdownNow();
    }
}
