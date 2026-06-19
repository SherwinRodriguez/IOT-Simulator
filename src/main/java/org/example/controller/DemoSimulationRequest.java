package org.example.controller;

import java.util.List;

public class DemoSimulationRequest {
    public String brokerUrl;
    public String clientId;
    public String username;
    public String password;
    public String publishTopic;
    public List<DatapointConfig> datapoints;

    public static class DatapointConfig {
        public String name;
        public String parsingKey;
        public Double min;
        public Double max;
        public Double start;
        public Double step;
        public String pattern;
        public Integer intervalMs;
    }
}
