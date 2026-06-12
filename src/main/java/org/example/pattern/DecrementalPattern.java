package org.example.pattern;

public class DecrementalPattern implements ValuePattern {
    private double currentValue;
    private double stepValue;
    private double min;

    public DecrementalPattern(double min, double step, double start){
        this.min = min;
        this.stepValue = step;
        this.currentValue = start;
    }

    @Override
    public double nextValue(){
        double value = currentValue;
        currentValue -= stepValue;
        if(currentValue <= min){
            currentValue = min;
        }
        return value;
    }
}
