package org.example.config;

import org.example.pattern.PatternType;
import org.example.pattern.ValuePattern;

public class SensorConfig {
    private String sensorName;
    private double min;
    private double max;
    private double start;
    private double step;
    private PatternType patternType;
    private ValuePattern pattern;

    //SETTERS
    public SensorConfig(String sensorName, double min, double max, double start, double step, PatternType patternType) {
        validate(
                sensorName,
                patternType.name(),
                min,
                max,
                start,
                step);
        this.sensorName = sensorName;
        this.min = min;
        this.max = max;
        this.start = start;
        this.step = step;
        this.patternType = patternType;
    }

    public ValuePattern getPattern() {
        return pattern;
    }


    //VALIDATE
    private void validate(String sensorName,
                          String patternType,
                          double min,
                          double max,
                          double start,
                          double step) {
        if (min > max) {
            throw new IllegalArgumentException(
                    sensorName +
                            " : min value cannot be greater than max value");
        }
        if (patternType.equalsIgnoreCase("INCREMENTAL")
                || patternType.equalsIgnoreCase("DECREMENTAL")) {
            if (start < min || start > max) {
                throw new IllegalArgumentException(
                        sensorName +
                                " : start value must be between min and max");
            }
            if (step <= 0) {
                throw new IllegalArgumentException(
                        sensorName +
                                " : step value must be greater than 0");
            }
        }
    }

    //GETTERS
    public String getName() {
        return sensorName;
    }
    public double getMin() {
        return min;
    }
    public double getMax() {
        return max;
    }
    public double getStart() {
        return start;
    }
    public double getStep() {
        return step;
    }
    public PatternType getPatternType() {
        return patternType;
    }
    public void setPattern(
            ValuePattern pattern) {
        this.pattern = pattern;
    }
}
