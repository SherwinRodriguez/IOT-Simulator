package org.example.loader;
import java.io.InputStream;
import java.util.Properties;

public class PropertyLoader {

    private static final Properties properties =
            new Properties();

//    static {
//        try (InputStream input =
//                     PropertyLoader.class
//                             .getClassLoader()
//                             .getResourceAsStream("application.properties")) {
//            if (input == null) {
//                throw new RuntimeException(
//                        "application.properties not found in classpath");
//            }
//            properties.load(input);
//
//        } catch (IOException e) {
//            throw new RuntimeException(e);
//        }
//    }
static {

    System.out.println(

            PropertyLoader.class

                    .getClassLoader()

                    .getResource("application.properties"));

    try (InputStream input =

                 PropertyLoader.class

                         .getClassLoader()

                         .getResourceAsStream(

                                 "application.properties")) {

        if (input == null) {

            throw new RuntimeException(

                    "application.properties not found");

        }

        properties.load(input);

    } catch (Exception e) {

        throw new RuntimeException(e);

    }

}

    public static String get(String key) {
        return properties.getProperty(key);
    }

    public static int getInt(String key) {
        return Integer.parseInt(properties.getProperty(key));
    }

    public static double getDouble(String key) {
        String value =
                properties.getProperty(key);
        if (value == null) {
            throw new IllegalArgumentException(
                    "Missing property: " + key);
        }
        return Double.parseDouble(value);
    }

    public static String[] getArray(String key) {
        return properties
                .getProperty(key)
                .split(",");
    }
}
