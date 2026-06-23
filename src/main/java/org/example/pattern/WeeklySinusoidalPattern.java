package org.example.pattern;

/**
 * Produces a sinusoidal wave that completes one cycle every 7 days.
 * Values oscillate between {@code min} and {@code max}.
 */
public class WeeklySinusoidalPattern implements ValuePattern {

    private static final long PERIOD_MS = 7L * 24 * 60 * 60 * 1000; // 7 days

    private final double min;
    private final double max;

    public WeeklySinusoidalPattern(double min, double max) {
        this.min = min;
        this.max = max;
    }

    @Override
    public double nextValue() {
        double phase = (System.currentTimeMillis() % PERIOD_MS) / (double) PERIOD_MS;
        double sine  = Math.sin(2 * Math.PI * phase);
        double mid   = (min + max) / 2.0;
        double amp   = (max - min) / 2.0;
        return mid + amp * sine;
    }
}
