package org.example;

import io.github.cdimascio.dotenv.Dotenv;

import java.util.ArrayList;
import java.util.List;

public class DeviceLoader {

    public static List<DeviceConfig> loadDevices() {

        Dotenv dotenv = Dotenv.load();

        List<DeviceConfig> devices = new ArrayList<>();
        int deviceCount =

                Integer.parseInt(

                        dotenv.get("DEVICE_COUNT"));
        for (int i = 1; i <=deviceCount; i++) {

            devices.add(
                    new DeviceConfig(
                            dotenv.get("DEVICE_" + i + "_CLIENT_ID"),
                            dotenv.get("DEVICE_" + i + "_USERNAME"),
                            dotenv.get("DEVICE_" + i + "_TOKEN"),
                            dotenv.get("DEVICE_" + i + "_TOPIC")
                    )
            );
        }

        return devices;
    }
}
