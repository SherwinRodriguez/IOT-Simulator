package org.example.pattern;

import org.example.entity.SimulationConfigEntity;

/**
 * Factory that creates the appropriate ValuePattern from a SimulationConfigEntity.
 * Legacy methods retained for backwards compatibility.
 */
public class PatternFactory {

    /** Create a ValuePattern from the new SimulationConfigEntity (primary path). */
    public static ValuePattern createFromConfig(SimulationConfigEntity cfg) {
        double min   = cfg.getMinValue();
        double max   = cfg.getMaxValue();
        double start = cfg.getStartValue();
        double step  = cfg.getStepValue();

        return switch (cfg.getPattern().toUpperCase()) {
            case "INCREMENTAL" -> new IncrementalPattern(start, step, max);
            case "DECREMENTAL" -> new DecrementalPattern(min, step, start);
            default            -> new RandomPattern(min, max); // RANDOM
        };
    }
}
