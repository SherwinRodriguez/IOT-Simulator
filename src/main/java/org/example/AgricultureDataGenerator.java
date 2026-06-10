package org.example;

import java.util.concurrent.ThreadLocalRandom;

public class AgricultureDataGenerator {

    public AgricultureData generate(int iteration,int deviceIndex) {

        double progress = (double) iteration / 180.0;
        double deviceOffset = deviceIndex*2;

        double temperature =
                24
                        +deviceOffset
                        + (11 * progress)
                        + Math.sin(iteration / 8.0) * 1.5
                        + random(-0.4, 0.4);

        double humidity =
                85
                        -deviceOffset
                        - (30 * progress)
                        - Math.sin(iteration / 8.0) * 2
                        + random(-2, 2);

        double lightLevel =
                200     +deviceOffset
                        + (800 * progress)
                        + Math.sin(iteration / 5.0) * 100
                        + random(-30, 30);

        double soilMoisture =
                80
                        -deviceOffset
                        - (30 * progress)
                        + random(-1.5, 1.5);

        double electricalConductivity =
                1.8
                        +deviceOffset
                        + (0.6 * progress)
                        + random(-0.05, 0.05);

        return new AgricultureData(
                round(temperature),
                round(humidity),
                round(lightLevel),
                round(soilMoisture),
                round(electricalConductivity)
        );
    }

    private double random(double min, double max) {
        return ThreadLocalRandom.current().nextDouble(min, max);
    }

    private double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}