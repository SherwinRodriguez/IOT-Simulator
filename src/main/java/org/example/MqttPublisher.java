package org.example;

import org.eclipse.paho.client.mqttv3.*;

public class MqttPublisher {

    private final MqttClient client;
    private final DeviceConfig config;

    public MqttPublisher(
            String broker,
            DeviceConfig config) throws Exception {

        this.config = config;

        client = new MqttClient(
                broker,
                config.getClientId());

        MqttConnectOptions options =
                new MqttConnectOptions();

        options.setUserName(
                config.getUsername());

        options.setPassword(
                config.getToken().toCharArray());

        options.setCleanSession(true);

        client.connect(options);

        System.out.println(
                config.getClientId()
                        + " connected");
    }

    public void publish(String payload)
            throws Exception {

        MqttMessage message =
                new MqttMessage(
                        payload.getBytes());

        message.setQos(1);

        client.publish(
                config.getTopic(),
                message);
    }

    public void disconnect()
            throws Exception {

        if (client.isConnected()) {
            client.disconnect();
        }

        client.close();
    }
}