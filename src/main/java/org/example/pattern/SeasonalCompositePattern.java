package org.example.pattern;

import java.util.concurrent.ThreadLocalRandom;

/**
 * Realistic composite pattern that layers three signals:
 * <ul>
 *   <li>Daily sinusoidal cycle (60 % weight)</li>
 *   <li>Weekly sinusoidal trend (25 % weight)</li>
 *   <li>Gaussian noise (15 % weight)</li>
 * </ul>
 * Output is clamped to [min, max]. Produces very natural-looking
 * sensor data suitable for dashboards and demos.
 */
public class SeasonalCompositePattern implements ValuePattern {

    private static final long DAY_MS  = 24L * 60 * 60 * 1000;
    private static final long WEEK_MS = 7L * DAY_MS;

    private final double min;
    private final double max;

    public SeasonalCompositePattern(double min, double max) {
        this.min = min;
        this.max = max;
    }

    @Override
    public double nextValue() {
        long now = System.currentTimeMillis();
        double mid = (min + max) / 2.0;
        double amp = (max - min) / 2.0;

        // Daily component (60 %)
        double dailyPhase = (now % DAY_MS) / (double) DAY_MS;
        double daily = Math.sin(2 * Math.PI * dailyPhase) * 0.60;

        // Weekly component (25 %)
        double weeklyPhase = (now % WEEK_MS) / (double) WEEK_MS;
        double weekly = Math.sin(2 * Math.PI * weeklyPhase) * 0.25;

        // Noise component (15 %)
        double noise = ThreadLocalRandom.current().nextGaussian() * 0.15;

        double value = mid + amp * (daily + weekly + noise);
        return Math.max(min, Math.min(max, value));
    }
}
