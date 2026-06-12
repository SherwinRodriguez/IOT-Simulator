package org.example;

import org.example.config.DeviceConfig;
import org.example.loader.DeviceLoader;
import org.example.loader.PropertyLoader;
import org.example.simulator.DeviceSimulator;

import java.util.List;

public class Main {

    public static void main(String[] args) {

        //MQTT PROVIDER - BROKER
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