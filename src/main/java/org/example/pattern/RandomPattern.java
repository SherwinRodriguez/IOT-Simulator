package org.example.pattern;

import java.util.concurrent.ThreadLocalRandom;

public class RandomPattern
        implements ValuePattern {

    private final double min;
    private final double max;

    public RandomPattern(
            double min,
            double max) {

        this.min = min;
        this.max = max;
    }

    @Override
    public double nextValue() {

        return ThreadLocalRandom
                .current()
                .nextDouble(min, max);
    }
}
