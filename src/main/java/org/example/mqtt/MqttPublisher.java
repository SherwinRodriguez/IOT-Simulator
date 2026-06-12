package org.example.mqtt;

import org.eclipse.paho.client.mqttv3.*;
import org.example.config.DeviceConfig;

public class MqttPublisher {

    private final MqttClient mqttClient;
    private final DeviceConfig deviceConfig;

    public MqttPublisher(
            String broker,
            DeviceConfig config) throws Exception {

        this.deviceConfig = config;

        mqttClient = new MqttClient(
                broker,
                config.getClientId());

        MqttConnectOptions options =
                new MqttConnectOptions();

        options.setUserName(
                config.getUsername());

        options.setPassword(
                config.getToken().toCharArray());
        options.setCleanSession(true);

        mqttClient.connect(options);

        System.out.println(
                config.getName()
                        + " connected");
    }

    public void publish(String payload)
            throws Exception {

        MqttMessage message =
                new MqttMessage(
                        payload.getBytes());

        message.setQos(1);

        mqttClient.publish(
                deviceConfig.getTopic(),
                message);
    }

    public void disconnect()
            throws Exception {

        if (mqttClient.isConnected()) {
            mqttClient.disconnect();
        }

        mqttClient.close();
    }
}