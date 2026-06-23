package org.example.pattern;

import java.util.concurrent.ThreadLocalRandom;

/**
 * Produces values drawn from a Gaussian (normal) distribution.
 * Mean = (min + max) / 2, standard deviation = (max − min) / 6 so that
 * ~99.7 % of values fall within [min, max]. Values outside the range
 * are clamped.
 */
public class GaussianNoisePattern implements ValuePattern {

    private final double mean;
    private final double stdDev;
    private final double min;
    private final double max;

    public GaussianNoisePattern(double min, double max) {
        this.min    = min;
        this.max    = max;
        this.mean   = (min + max) / 2.0;
        this.stdDev = (max - min) / 6.0;
    }

    @Override
    public double nextValue() {
        double value = mean + ThreadLocalRandom.current().nextGaussian() * stdDev;
        return Math.max(min, Math.min(max, value));
    }
}
