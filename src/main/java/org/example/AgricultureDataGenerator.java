package org.example;

import java.util.Map;

public class AgricultureDataGenerator {

    public AgricultureData generate(DeviceConfig device) {

        Map<String, SensorConfig> sensors =
                device.getSensors();

        double temperature =
                sensors.get("temperature")
                        .getPattern()
                        .nextValue();

        double humidity =
                sensors.get("humidity")
                        .getPattern()
                        .nextValue();

        double lightLevel =
                sensors.get("light_level")
                        .getPattern()
                        .nextValue();

        double soilMoisture =
                sensors.get("soil_moisture")
                        .getPattern()
                        .nextValue();

        double electricalConductivity =
                sensors.get("electrical_conductivity")
                        .getPattern()
                        .nextValue();

        return new AgricultureData(
                round(temperature),
                round(humidity),
                round(lightLevel),
                round(soilMoisture),
                round(electricalConductivity)
        );
    }


    private double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}