package org.example.simulator;

import com.google.gson.Gson;
import org.example.config.DeviceConfig;
import org.example.mqtt.MqttPublisher;

import java.util.Map;

public class DeviceSimulator
        implements Runnable {

    private final DeviceConfig device;
    private final MqttPublisher publisher;
    private final AgricultureDataGenerator dataGenerator;
    private final Gson gson;

    public DeviceSimulator(
            DeviceConfig device,
            String broker) {

        this.device = device;

        try {

            this.publisher =
                    new MqttPublisher(
                            broker,
                            device);

        } catch (Exception e) {

            throw new RuntimeException(e);
        }

        this.dataGenerator =
                new AgricultureDataGenerator();

        this.gson =
                new Gson();
    }

    @Override
    public void run() {

        try {

            while (!Thread.currentThread()
                    .isInterrupted()) {

                Map<String, Double> telemetry =
                        dataGenerator.generate(
                                device);

                String payload =
                        gson.toJson(
                                telemetry);

                publisher.publish(
                        payload);

                System.out.println(
                        device.getName()
                                + " -> "
                                + payload);

                Thread.sleep(
                        device.getInterval());
            }

        } catch (Exception e) {

            e.printStackTrace();

        } finally {

            try {

                publisher.disconnect();

            } catch (Exception e) {

                e.printStackTrace();
            }
        }
    }
}