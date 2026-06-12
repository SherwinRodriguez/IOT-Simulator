package org.example.pattern;

import org.example.config.SensorConfig;

public class PatternFactory {

    public static ValuePattern create(
            SensorConfig sensor) {

        switch (sensor.getPatternType()) {

            case INCREMENTAL:
                return new IncrementalPattern(
                        sensor.getStart(),
                        sensor.getStep(),
                        sensor.getMax());

            case DECREMENTAL:
                return new DecrementalPattern(
                        sensor.getMin(),
                        sensor.getStep(),
                        sensor.getStart());

            case RANDOM:
            default:
                return new RandomPattern(
                        sensor.getMin(),
                        sensor.getMax());
        }
    }
}
