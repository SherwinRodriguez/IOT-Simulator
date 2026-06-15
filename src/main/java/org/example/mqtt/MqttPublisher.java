package org.example.mqtt;

import org.eclipse.paho.client.mqttv3.*;

/**
 * MQTT publisher for a single device connection.
 * Takes raw connection parameters directly (no DeviceConfig dependency).
 */
public class MqttPublisher {

    private final MqttClient mqttClient;
    private final String topic;

    public MqttPublisher(String broker, String clientId, String username,
                         String password, String topic) throws Exception {
        this.topic = topic;

        mqttClient = new MqttClient(broker, clientId);

        MqttConnectOptions options = new MqttConnectOptions();
        options.setMqttVersion(MqttConnectOptions.MQTT_VERSION_3_1_1);
        if (username != null) options.setUserName(username);
        if (password != null) options.setPassword(password.toCharArray());
        options.setCleanSession(true);
        options.setKeepAliveInterval(60);
        options.setConnectionTimeout(30);

        mqttClient.connect(options);
    }


    public void publish(String payload) throws Exception {
        MqttMessage message = new MqttMessage(payload.getBytes());
        message.setQos(1);
        mqttClient.publish(topic, message);
    }

    public void disconnect() throws Exception {
        if (mqttClient.isConnected()) mqttClient.disconnect();
        mqttClient.close();
    }
}