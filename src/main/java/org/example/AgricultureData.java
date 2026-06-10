package org.example;

public class AgricultureData {

    private double temperature;
    private double humidity;
    private double light_level;
    private double soil_moisture;
    private double electrical_conductivity;

    public AgricultureData(double temperature,
                           double humidity,
                           double light_level,
                           double soil_moisture,
                           double electrical_conductivity) {

        this.temperature = temperature;
        this.humidity = humidity;
        this.light_level = light_level;
        this.soil_moisture = soil_moisture;
        this.electrical_conductivity = electrical_conductivity;
    }
}
