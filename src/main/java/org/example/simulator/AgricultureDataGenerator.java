package org.example.simulator;

import org.example.config.DeviceConfig;
import org.example.config.SensorConfig;

import java.util.HashMap;
import java.util.Map;

public class AgricultureDataGenerator {

    public Map<String, Double> generate(
            DeviceConfig device) {

        Map<String, Double> telemetry =
                new HashMap<>();

        for (SensorConfig sensor :
                device.getSensors().values()) {

            telemetry.put(
                    sensor.getName(),
                    round(
                            sensor.getPattern()
                                    .nextValue()));
        }

        return telemetry;
    }

    private double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}