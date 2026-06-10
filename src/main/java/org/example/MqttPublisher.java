package org.example;

import org.eclipse.paho.client.mqttv3.*; //Eclipse Paho Java Client library

public class MqttPublisher {

    private static final String BROKER =
            "tcp://60863cfqlp.zohoiothub.in:1883";

    private static final String CLIENT_ID =
            "8352000000181345";

    private static final String USERNAME =
            "/60863cfqlp.zohoiothub.in/v1/devices/8352000000181345/connect";

    private static final String PASSWORD =
            "<YOUR_PASSWORD>";

    private static final String TOPIC =
            "/devices/8352000000181345/telemetry";

    private final MqttClient client;

    public MqttPublisher() throws Exception {

        client = new MqttClient(BROKER, CLIENT_ID);

        MqttConnectOptions options = new MqttConnectOptions();
        options.setUserName(USERNAME);
        options.setPassword(PASSWORD.toCharArray());
        options.setCleanSession(true);

        client.connect(options);

        System.out.println("Connected to Zoho IoT");
    }

    public void publish(String payload) throws Exception {

        MqttMessage message = new MqttMessage();
        message.setPayload(payload.getBytes());
        message.setQos(1);

        client.publish(TOPIC, message);

        System.out.println("Published: " + payload);
    }

    public void disconnect() throws Exception {

        if (client.isConnected()) {
            client.disconnect();
        }

        client.close();
    }
}