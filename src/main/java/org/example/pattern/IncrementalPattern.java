package org.example.pattern;

import org.example.ValuePattern;

public class IncrementalPattern implements ValuePattern {

    private double currentValue;
    private final double step;
    private final double max;

    public IncrementalPattern(double start,double step, double max) {
        this.currentValue = start;
        this.step = step;
        this.max = max;
    }

    @Override
    public double nextValue() {
        double value = currentValue;
        currentValue += step;
        if (currentValue >= max) {
            currentValue = max;
        }
        return value;
    }
}
