package org.example;
import com.google.gson.Gson;

public class Main {

    private static final int TOTAL_MESSAGES = 180; // for 15 minutes

    public static void main(String[] args) {

        try {

            Gson gson = new Gson(); //translate Java objects into JSON (serialization and deserialization)

            AgricultureDataGenerator generator =
                    new AgricultureDataGenerator();

            MqttPublisher publisher =
                    new MqttPublisher();

            for (int i = 1; i <= TOTAL_MESSAGES; i++) {

                AgricultureData data =
                        generator.generate(i);

                String payload =
                        gson.toJson(data);

                publisher.publish(payload);

                Thread.sleep(5000);
            }

            publisher.disconnect();

            System.out.println("Simulation Completed");

        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}