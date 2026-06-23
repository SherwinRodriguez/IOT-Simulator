package org.example.pattern;

/**
 * Linear ramp from {@code min} to {@code max} increasing by {@code step}
 * each tick, then immediately resetting to {@code min}. Produces a
 * classic sawtooth waveform.
 */
public class SawtoothPattern implements ValuePattern {

    private double currentValue;
    private final double step;
    private final double min;
    private final double max;

    public SawtoothPattern(double start, double step, double min, double max) {
        this.currentValue = start;
        this.step = step;
        this.min  = min;
        this.max  = max;
    }

    @Override
    public double nextValue() {
        double value = currentValue;
        currentValue += step;
        if (currentValue > max) {
            currentValue = min;
        }
        return value;
    }
}
