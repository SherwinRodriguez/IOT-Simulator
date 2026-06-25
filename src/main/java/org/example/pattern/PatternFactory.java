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
            case "INCREMENTAL"        -> new IncrementalPattern(start, step, max);
            case "DECREMENTAL"        -> new DecrementalPattern(min, step, start);
            case "DAILY_SINUSOIDAL"   -> new DailySinusoidalPattern(min, max);
            case "WEEKLY_SINUSOIDAL"  -> new WeeklySinusoidalPattern(min, max);
            case "GAUSSIAN_NOISE"     -> new GaussianNoisePattern(min, max);
            case "ANOMALY_SPIKE"      -> new AnomalySpikePattern(min, max);
            case "LINEAR_DRIFT"       -> new LinearDriftPattern(start, step);
            case "EXPONENTIAL_DECAY"  -> new ExponentialDecayPattern(start, step, min);
            case "RANDOM_WALK"        -> new RandomWalkPattern(start, step, min, max);
            case "MISSING_DATA"       -> new MissingDataPattern(min, max);
            case "STEP_FUNCTION"      -> new StepFunctionPattern(start, step, min, max);
            case "SAWTOOTH"           -> new SawtoothPattern(start, step, min, max);
            case "BURST_EVENT"        -> new BurstEventPattern(min, max);
            case "PLATEAU_SHIFT"      -> new PlateauShiftPattern(min, max);
            case "SEASONAL_COMPOSITE" -> new SeasonalCompositePattern(min, max);
            case "CORRELATED"         -> new CorrelatedPattern(start, min, max);
            default                   -> new RandomPattern(min, max);
        };
    }
}

