package org.example;

import java.util.List;

public class Main {

    public static void main(String[] args) {

        String broker =
                PropertyLoader.get(
                        "mqtt.broker");

        List<DeviceConfig> devices =
                DeviceLoader.loadDevices();

        for (DeviceConfig device : devices) {

            Thread thread =
                    new Thread(
                            new DeviceSimulator(
                                    device,
                                    broker));

            thread.setName(
                    device.getName());

            thread.start();
        }
    }
}