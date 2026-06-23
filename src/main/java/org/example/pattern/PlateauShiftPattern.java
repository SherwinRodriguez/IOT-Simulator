package org.example.pattern;

import java.util.concurrent.ThreadLocalRandom;

/**
 * Holds a randomly-chosen plateau level (within [min, max]) for 20-50
 * ticks, then abruptly shifts to a new random level. Simulates step-like
 * environmental changes (e.g. irrigation zones toggling on/off).
 */
public class PlateauShiftPattern implements ValuePattern {

    private static final int MIN_HOLD = 20;
    private static final int MAX_HOLD = 50;

    private final double min;
    private final double max;
    private double currentLevel;
    private int holdRemaining;

    public PlateauShiftPattern(double min, double max) {
        this.min = min;
        this.max = max;
        this.currentLevel = randomLevel();
        this.holdRemaining = randomHold();
    }

    @Override
    public double nextValue() {
        holdRemaining--;
        if (holdRemaining <= 0) {
            currentLevel = randomLevel();
            holdRemaining = randomHold();
        }
        return currentLevel;
    }

    private double randomLevel() {
        return ThreadLocalRandom.current().nextDouble(min, max);
    }

    private int randomHold() {
        return ThreadLocalRandom.current().nextInt(MIN_HOLD, MAX_HOLD + 1);
    }
}
