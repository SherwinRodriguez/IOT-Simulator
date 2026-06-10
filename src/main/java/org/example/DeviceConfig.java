package org.example;

public class DeviceConfig {

    private String clientId;
    private String username;
    private String token;
    private String topic;

    public DeviceConfig(String clientId,
                        String username,
                        String token,
                        String topic) {

        this.clientId = clientId;
        this.username = username;
        this.token = token;
        this.topic = topic;
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
}
