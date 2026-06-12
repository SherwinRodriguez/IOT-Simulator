package org.example.config;

import java.util.Map;

public class DeviceConfig {
    private String name;
    private String clientId;
    private String username;
    private String token;
    private String topic;
    private int interval;

    private Map<String,SensorConfig> sensors;

    public Map<String, SensorConfig> getSensors() {
        return sensors;
    }
    public void setSensors(
            Map<String, SensorConfig> sensors) {
        this.sensors = sensors;
    }

    public DeviceConfig(String name,
                        String clientId,
                        String username,
                        String token,
                        String topic,
                        int interval) {

        this.name = name;
        this.clientId = clientId;
        this.username = username;
        this.token = token;
        this.topic = topic;
        this.interval = interval;
    }

    public String getName() {
        return name;
    }

    public String getClientId() {
        return clientId;
    }

    public String getUsername() {
        return username;
    }

    public String getToken() {
        return token;
    }

    public String getTopic() {
        return topic;
    }

    public int getInterval() {
        return interval;
    }
}
