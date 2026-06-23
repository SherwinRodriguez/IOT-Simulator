package org.example.pattern;

import java.util.concurrent.ThreadLocalRandom;

/**
 * Auto-correlated time series. Each value is computed as:
 * <pre>next = 0.95 × previous + 0.05 × random(min, max)</pre>
 * This produces a smooth, slowly-wandering output that resembles
 * real-world sensor readings where consecutive values are highly
 * correlated.
 */
public class CorrelatedPattern implements ValuePattern {

    private static final double CORRELATION = 0.95;
    private static final double RANDOM_WEIGHT = 1.0 - CORRELATION;

    private double currentValue;
    private final double min;
    private final double max;

    public CorrelatedPattern(double start, double min, double max) {
        this.currentValue = start;
        this.min = min;
        this.max = max;
    }

    @Override
    public double nextValue() {
        double randomPart = ThreadLocalRandom.current().nextDouble(min, max);
        currentValue = CORRELATION * currentValue + RANDOM_WEIGHT * randomPart;
        currentValue = Math.max(min, Math.min(max, currentValue));
        return currentValue;
    }
}
