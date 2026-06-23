package org.example.pattern;

/**
 * Produces a sinusoidal wave that completes one cycle every 24 hours.
 * Values oscillate between {@code min} and {@code max}, following the
 * real wall-clock time so that identical datapoints on different devices
 * stay in phase.
 */
public class DailySinusoidalPattern implements ValuePattern {

    private static final long PERIOD_MS = 24L * 60 * 60 * 1000; // 24 hours

    private final double min;
    private final double max;

    public DailySinusoidalPattern(double min, double max) {
        this.min = min;
        this.max = max;
    }

    @Override
    public double nextValue() {
        double phase = (System.currentTimeMillis() % PERIOD_MS) / (double) PERIOD_MS;
        double sine  = Math.sin(2 * Math.PI * phase);         // −1 … +1
        double mid   = (min + max) / 2.0;
        double amp   = (max - min) / 2.0;
        return mid + amp * sine;
    }
}
