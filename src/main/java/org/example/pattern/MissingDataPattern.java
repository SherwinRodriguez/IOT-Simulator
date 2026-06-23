package org.example.pattern;

import java.util.concurrent.ThreadLocalRandom;

/**
 * Produces random values in [min, max], but returns {@code Double.NaN}
 * approximately 10 % of the time to simulate sensor dropouts / missing data.
 * NaN serialises as {@code null} in JSON, which Recharts renders as a gap.
 */
public class MissingDataPattern implements ValuePattern {

    private static final double MISSING_PROBABILITY = 0.10;

    private final double min;
    private final double max;

    public MissingDataPattern(double min, double max) {
        this.min = min;
        this.max = max;
    }

    @Override
    public double nextValue() {
        if (ThreadLocalRandom.current().nextDouble() < MISSING_PROBABILITY) {
            return Double.NaN;
        }
        return ThreadLocalRandom.current().nextDouble(min, max);
    }
}
