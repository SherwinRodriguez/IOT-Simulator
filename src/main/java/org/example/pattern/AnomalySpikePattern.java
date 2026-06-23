package org.example.pattern;

import java.util.concurrent.ThreadLocalRandom;

/**
 * Normally produces random values in [min, max], but with ~2 % probability
 * generates an anomaly spike at 2× max. Useful for testing anomaly detection
 * algorithms on sensor streams.
 */
public class AnomalySpikePattern implements ValuePattern {

    private static final double SPIKE_PROBABILITY = 0.02;

    private final double min;
    private final double max;

    public AnomalySpikePattern(double min, double max) {
        this.min = min;
        this.max = max;
    }

    @Override
    public double nextValue() {
        if (ThreadLocalRandom.current().nextDouble() < SPIKE_PROBABILITY) {
            return max * 2.0; // anomaly spike
        }
        return ThreadLocalRandom.current().nextDouble(min, max);
    }
}
