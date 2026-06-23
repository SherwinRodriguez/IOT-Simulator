package org.example.pattern;

/**
 * Simulates exponential decay (e.g. battery discharge, cooling).
 * Starts at {@code startValue} and multiplies by {@code (1 − step/100)}
 * on each tick, asymptotically approaching {@code min}.
 */
public class ExponentialDecayPattern implements ValuePattern {

    private double currentValue;
    private final double decayFactor;
    private final double floor;

    public ExponentialDecayPattern(double start, double step, double min) {
        this.currentValue = start;
        this.decayFactor  = 1.0 - (step / 100.0);
        this.floor        = min;
    }

    @Override
    public double nextValue() {
        double value = currentValue;
        currentValue = floor + (currentValue - floor) * decayFactor;
        if (currentValue < floor) {
            currentValue = floor;
        }
        return value;
    }
}
