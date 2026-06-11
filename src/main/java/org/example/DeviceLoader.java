package org.example;

import org.example.pattern.PatternFactory;

import java.util.*;

public class DeviceLoader {

    static String[] SENSORS =
            PropertyLoader.getArray(
                    "data.points");

    public static List<DeviceConfig> loadDevices() {

        List<DeviceConfig> devices =
                new ArrayList<>();

        //getting the device count
        int deviceCount =
                PropertyLoader.getInt(
                        "device.count");

        // setting the prefix
        for (int i = 1;
             i <= deviceCount;
             i++) {

            String prefix =
                    "device." + i + ".";

            DeviceConfig device =
                    new DeviceConfig(
                            PropertyLoader.get(
                                    prefix + "name"),

                            PropertyLoader.get(
                                    prefix + "clientId"),

                            PropertyLoader.get(
                                    prefix + "username"),

                            PropertyLoader.get(
                                    prefix + "token"),

                            PropertyLoader.get(
                                    prefix + "topic"),

                            PropertyLoader.getInt(
                                    prefix + "interval")
                    );

            Map<String, SensorConfig> sensors =
                    loadSensors(prefix);

            device.setSensors(sensors);

            devices.add(device);
        }

        return devices;
    }

    private static Map<String, SensorConfig>
    loadSensors(String devicePrefix) {

        Map<String, SensorConfig> sensors =
                new HashMap<>();

        for (String sensorName : SENSORS) {

            String sensorPrefix =
                    devicePrefix
                            + sensorName
                            + ".";

            String pattern =
                    PropertyLoader.get(
                            sensorPrefix
                                    + "pattern");

            if (pattern == null) {
                continue;
            }

            double min =
                    PropertyLoader.getDouble(
                            sensorPrefix + "min");

            double max =
                    PropertyLoader.getDouble(
                            sensorPrefix + "max");

            double start = 0;
            double step = 0;

            if (!pattern.equals("RANDOM")) {

                start =
                        PropertyLoader.getDouble(
                                sensorPrefix
                                        + "start");

                step =
                        PropertyLoader.getDouble(
                                sensorPrefix
                                        + "step");
            }

            SensorConfig sensor =
                    new SensorConfig(
                            sensorName,
                            min,
                            max,
                            start,
                            step,
                            PatternType.valueOf(
                                    pattern)
                    );

            sensor.setPattern(
                    PatternFactory.create(
                            sensor));

            sensors.put(
                    sensorName,
                    sensor);
        }

        return sensors;
    }
}