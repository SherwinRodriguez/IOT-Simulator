package org.example.simulator;

import com.google.gson.Gson;

import org.example.entity.DeviceEntity;
import org.example.entity.SimulationConfigEntity;
import org.example.mqtt.MqttPublisher;
import org.example.pattern.PatternFactory;
import org.example.pattern.ValuePattern;
import org.example.telemetry.TelemetryMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Per-device simulator thread.
 *
 * - Generates telemetry dynamically from SimulationConfig (no hardcoded
 * datapoints).
 * - Publishes via MQTT using device credentials from Zoho.
 * - Pushes real-time telemetry to the WebSocket topic /topic/device/{deviceId}.
 * - Supports Pause / Resume via an AtomicBoolean flag.
 */
public class DeviceSimulator implements Runnable {

    private static final Logger log = LoggerFactory.getLogger(DeviceSimulator.class);

    private final DeviceEntity device;
    private final String mqttBroker;
    private final SimpMessagingTemplate messagingTemplate;
    private final TelemetryPersistenceCallback persistCallback;

    // Pattern state per datapoint name
    private final Map<String, ValuePattern> patterns = new LinkedHashMap<>();
    private final Map<String, SimulationConfigEntity> configs = new LinkedHashMap<>();

    // Shared mutable state (thread-safe)
    private final Map<String, Object> latestTelemetry = new ConcurrentHashMap<>();
    private final AtomicLong messageCount = new AtomicLong(0);
    private volatile long lastPublishedMs = 0;
    private final AtomicBoolean paused = new AtomicBoolean(false);

    private MqttPublisher publisher;
    private final Gson gson = new Gson();
    private final AtomicBoolean stopRequested = new AtomicBoolean(false);

    /** Default interval in ms if no config present */
    private static final int DEFAULT_INTERVAL_MS = 5000;

    public DeviceSimulator(DeviceEntity device,
            List<SimulationConfigEntity> simConfigs,
            String mqttBroker,
            SimpMessagingTemplate messagingTemplate,
            TelemetryPersistenceCallback persistCallback) {
        this.device = device;
        this.mqttBroker = mqttBroker;
        this.messagingTemplate = messagingTemplate;
        this.persistCallback = persistCallback;

        // Initialize patterns from local SimulationConfigs
        for (SimulationConfigEntity cfg : simConfigs) {
            updateConfig(cfg);
        }
    }

    public void updateConfig(SimulationConfigEntity cfg) {
        if (cfg != null && cfg.getParsingKey() != null) {
            patterns.put(cfg.getParsingKey(), PatternFactory.createFromConfig(cfg));
            configs.put(cfg.getParsingKey(), cfg);
        }
    }

    @Override
    public void run() {
        try {
            // Build MQTT connection using device credentials
            this.publisher = new MqttPublisher(
                    mqttBroker,
                    device.getMqttClientId(),
                    device.getMqttUsername(),
                    device.getMqttPassword(),
                    device.getPublishTopic());
            log.info("[{}] Simulator started", device.getName());

            while (!stopRequested.get() && !Thread.currentThread().isInterrupted()) {
                // Pause check — spin-wait with 200ms sleep
                while (paused.get() && !stopRequested.get() && !Thread.currentThread().isInterrupted()) {
                    Thread.sleep(200);
                }
                if (stopRequested.get() || Thread.currentThread().isInterrupted())
                    break;

                // Generate telemetry
                Map<String, Double> telemetry = generateTelemetry();
                String payload = gson.toJson(telemetry);

                // Publish to MQTT
                publisher.publish(payload);

                // Update in-memory state
                latestTelemetry.clear();
                latestTelemetry.putAll(telemetry);
                long count = messageCount.incrementAndGet();
                lastPublishedMs = System.currentTimeMillis();

                // Push to WebSocket subscribers
                TelemetryMessage wsMsg = new TelemetryMessage(
                        device.getId().toString(),
                        device.getName(),
                        telemetry,
                        Instant.now().toString(),
                        count);
                messagingTemplate.convertAndSend("/topic/device/" + device.getId(), wsMsg);

                // Persist for history API
                if (persistCallback != null) {
                    persistCallback.persist(device.getId(), telemetry);
                }

                log.debug("[{}] → {}", device.getName(), payload);
                Thread.sleep(getPublishInterval());
            }

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.info("[{}] Simulator interrupted", device.getName());
        } catch (Exception e) {
            log.error("[{}] Simulator error: {}", device.getName(), e.getMessage(), e);
        } finally {
            if (publisher != null) {
                try {
                    publisher.disconnect();
                } catch (Exception ex) {
                    log.warn("[{}] Error disconnecting MQTT: {}", device.getName(), ex.getMessage());
                }
            }
        }
    }

    // ─── Pause / Resume ────────────────────────────────────────────────────────

    public void pause() {
        paused.set(true);
        log.info("[{}] Paused", device.getName());
    }

    public void requestStop() {
        stopRequested.set(true);
        if (publisher != null) {
            try {
                publisher.disconnect();
            } catch (Exception ex) {
                log.warn("[{}] Error disconnecting MQTT during stop: {}", device.getName(), ex.getMessage());
            }
        }
    }

    public void resume() {
        paused.set(false);
        log.info("[{}] Resumed", device.getName());
    }

    public boolean isPaused() {
        return paused.get();
    }

    // ─── Telemetry Accessors ───────────────────────────────────────────────────

    public Map<String, Object> getLatestTelemetry() {
        return Map.copyOf(latestTelemetry);
    }

    public long getMessageCount() {
        return messageCount.get();
    }

    public long getLastPublished() {
        return lastPublishedMs;
    }

    // ─── Private Helpers ───────────────────────────────────────────────────────

    private Map<String, Double> generateTelemetry() {
        Map<String, Double> result = new LinkedHashMap<>();
        for (Map.Entry<String, ValuePattern> entry : patterns.entrySet()) {
            result.put(entry.getKey(), round(entry.getValue().nextValue()));
        }
        return result;
    }

    private int getPublishInterval() {
        return configs.values().stream()
                .findFirst()
                .map(SimulationConfigEntity::getPublishIntervalMs)
                .orElse(DEFAULT_INTERVAL_MS);
    }

    private double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    /**
     * Callback interface so SimulationManagerService can inject persistence logic
     */
    @FunctionalInterface
    public interface TelemetryPersistenceCallback {
        void persist(UUID deviceId, Map<String, Double> telemetry);
    }
}
