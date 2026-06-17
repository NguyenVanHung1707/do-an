package com.example.backend.util;

public final class GeoDistanceUtils {
    public static final int MIN_RADIUS_METERS = 50;
    public static final int MAX_RADIUS_METERS = 500;
    private static final double EARTH_RADIUS_METERS = 6_371_000.0;

    private GeoDistanceUtils() {
    }

    public static double distanceMeters(double lat1, double lng1, double lat2, double lng2) {
        validateCoordinates(lat1, lng1);
        validateCoordinates(lat2, lng2);

        double latDistance = Math.toRadians(lat2 - lat1);
        double lngDistance = Math.toRadians(lng2 - lng1);
        double startLat = Math.toRadians(lat1);
        double endLat = Math.toRadians(lat2);

        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                + Math.cos(startLat) * Math.cos(endLat)
                * Math.sin(lngDistance / 2) * Math.sin(lngDistance / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return EARTH_RADIUS_METERS * c;
    }

    public static void validateCoordinates(Double latitude, Double longitude) {
        if (latitude == null || longitude == null) {
            throw new IllegalArgumentException("Latitude and longitude are required");
        }
        validateCoordinates(latitude.doubleValue(), longitude.doubleValue());
    }

    public static void validateCoordinates(double latitude, double longitude) {
        if (latitude < -90.0 || latitude > 90.0) {
            throw new IllegalArgumentException("Latitude must be between -90 and 90");
        }
        if (longitude < -180.0 || longitude > 180.0) {
            throw new IllegalArgumentException("Longitude must be between -180 and 180");
        }
    }

    public static void validateAllowedRadius(Integer radiusMeters) {
        if (radiusMeters == null
                || radiusMeters < MIN_RADIUS_METERS
                || radiusMeters > MAX_RADIUS_METERS) {
            throw new IllegalArgumentException("Allowed radius must be between 50 and 500 meters");
        }
    }
}
