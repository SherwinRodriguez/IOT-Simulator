package org.example;

import com.google.gson.Gson;

public class DeviceSimulator implements Runnable {

    private final DeviceConfig device;
    private final MqttPublisher publisher;
    private final AgricultureDataGenerator generator;
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
        }  catch (Exception e) {
            throw new RuntimeException(e);
        }

        this.generator =
                new AgricultureDataGenerator();

        this.gson = new Gson();
    }

    @Override
    public void run() {

        try {

            while (true) {

                AgricultureData data =
                        generator.generate(
                                device);

                String payload =
                        gson.toJson(data);

                publisher.publish(payload);

                System.out.println(
                        Thread.currentThread()
                                .getName()
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
                throw new RuntimeException(e);
            }
        }
    }
}