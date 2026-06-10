package org.example;

import com.google.gson.Gson;
import io.github.cdimascio.dotenv.Dotenv;

import java.util.ArrayList;
import java.util.List;

public class Main {

    public static void main(String[] args)
            throws Exception {

        Dotenv dotenv = Dotenv.load();

        String broker =
                dotenv.get("MQTT_BROKER");

        List<DeviceConfig> devices =
                DeviceLoader.loadDevices();

        List<MqttPublisher> publishers =
                new ArrayList<>();

        for (DeviceConfig device : devices) {

            publishers.add(
                    new MqttPublisher(
                            broker,
                            device));
        }

        AgricultureDataGenerator generator =
                new AgricultureDataGenerator();

        Gson gson = new Gson();

        for (int i = 1;
             i <= 180;
             i++) {

            for (int deviceIndex = 0;
                 deviceIndex < publishers.size();
                 deviceIndex++) {

                AgricultureData data =
                        generator.generate(
                                i,
                                deviceIndex);

                String payload =
                        gson.toJson(data);

                publishers
                        .get(deviceIndex)
                        .publish(payload);

                System.out.println(
                        "Device "
                                + (deviceIndex + 1)
                                + " -> "
                                + payload);
            }

            Thread.sleep(5000);
        }

        for (MqttPublisher publisher :
                publishers) {

            publisher.disconnect();
        }
    }
}