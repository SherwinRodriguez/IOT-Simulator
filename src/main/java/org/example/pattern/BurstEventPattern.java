package org.example.pattern;

import java.util.concurrent.ThreadLocalRandom;

/**
 * Mostly outputs a baseline value ({@code min}), but with ~5 % probability
 * enters a "burst" state for 3-8 ticks during which it outputs values
 * near {@code max}. Simulates intermittent sensor events like irrigation
 * pump activation or motion detection.
 */
public class BurstEventPattern implements ValuePattern {

    private static final double BURST_PROBABILITY = 0.05;
    private static final int MIN_BURST_TICKS = 3;
    private static final int MAX_BURST_TICKS = 8;

    private final double min;
    private final double max;
    private int burstRemaining = 0;

    public BurstEventPattern(double min, double max) {
        this.min = min;
        this.max = max;
    }

    @Override
    public double nextValue() {
        if (burstRemaining > 0) {
            burstRemaining--;
            // During burst: value near max with small jitter
            double jitter = (max - min) * 0.05;
            return max - ThreadLocalRandom.current().nextDouble(0, jitter);
        }

        if (ThreadLocalRandom.current().nextDouble() < BURST_PROBABILITY) {
            burstRemaining = ThreadLocalRandom.current().nextInt(MIN_BURST_TICKS, MAX_BURST_TICKS + 1);
        }

        // Baseline: value near min with small jitter
        double jitter = (max - min) * 0.05;
        return min + ThreadLocalRandom.current().nextDouble(0, jitter);
    }
}
