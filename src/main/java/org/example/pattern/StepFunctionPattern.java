package org.example.pattern;

/**
 * Produces a staircase (step-function) output.
 * Holds at the current level for {@code HOLD_TICKS} ticks, then jumps
 * by {@code step}. When the value exceeds {@code max} it wraps back to
 * {@code min}.
 */
public class StepFunctionPattern implements ValuePattern {

    private static final int HOLD_TICKS = 10;

    private double currentValue;
    private final double step;
    private final double min;
    private final double max;
    private int tickCount = 0;

    public StepFunctionPattern(double start, double step, double min, double max) {
        this.currentValue = start;
        this.step = step;
        this.min  = min;
        this.max  = max;
    }

    @Override
    public double nextValue() {
        double value = currentValue;
        tickCount++;
        if (tickCount >= HOLD_TICKS) {
            tickCount = 0;
            currentValue += step;
            if (currentValue > max) {
                currentValue = min;
            }
        }
        return value;
    }
}
