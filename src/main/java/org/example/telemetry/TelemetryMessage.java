package org.example.telemetry;

import java.util.Map;

/**
 * WebSocket telemetry push message — serialized to JSON by Spring.
 */
public record TelemetryMessage(
        String deviceId,
        String deviceName,
        Map<String, Double> values,
        String timestamp,
        long messageCount
) {}
