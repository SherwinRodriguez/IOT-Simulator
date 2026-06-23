package org.example.pattern;

/**
 * Produces a linearly drifting value. Starts at {@code startValue} and
 * increases by {@code step} on every tick with no upper bound.
 * Simulates sensor calibration drift or slow environmental changes.
 */
public class LinearDriftPattern implements ValuePattern {

    private double currentValue;
    private final double step;

    public LinearDriftPattern(double start, double step) {
        this.currentValue = start;
        this.step = step;
    }

    @Override
    public double nextValue() {
        double value = currentValue;
        currentValue += step;
        return value;
    }
}
