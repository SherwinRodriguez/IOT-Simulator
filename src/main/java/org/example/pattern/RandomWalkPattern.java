package org.example.pattern;

import java.util.concurrent.ThreadLocalRandom;

/**
 * Brownian-motion-style random walk. Starts at {@code startValue},
 * each tick adds a random value in [−step, +step], clamped to [min, max].
 */
public class RandomWalkPattern implements ValuePattern {

    private double currentValue;
    private final double step;
    private final double min;
    private final double max;

    public RandomWalkPattern(double start, double step, double min, double max) {
        this.currentValue = start;
        this.step = step;
        this.min  = min;
        this.max  = max;
    }

    @Override
    public double nextValue() {
        double delta = ThreadLocalRandom.current().nextDouble(-step, step);
        currentValue += delta;
        currentValue = Math.max(min, Math.min(max, currentValue));
        return currentValue;
    }
}
