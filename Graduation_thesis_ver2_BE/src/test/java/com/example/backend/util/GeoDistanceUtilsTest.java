package com.example.backend.util;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class GeoDistanceUtilsTest {

    @Test
    void distanceMetersReturnsZeroForSameCoordinate() {
        double distance = GeoDistanceUtils.distanceMeters(21.0278, 105.8342, 21.0278, 105.8342);

        assertEquals(0.0, distance, 0.001);
    }

    @Test
    void distanceMetersUsesHaversineDistance() {
        double distance = GeoDistanceUtils.distanceMeters(21.0278, 105.8342, 21.0287, 105.8342);

        assertEquals(100.1, distance, 1.0);
    }

    @Test
    void distanceMetersRejectsInvalidLatitude() {
        assertThrows(
                IllegalArgumentException.class,
                () -> GeoDistanceUtils.distanceMeters(91.0, 105.8342, 21.0287, 105.8342)
        );
    }

    @Test
    void distanceMetersRejectsInvalidLongitude() {
        assertThrows(
                IllegalArgumentException.class,
                () -> GeoDistanceUtils.distanceMeters(21.0278, 181.0, 21.0287, 105.8342)
        );
    }
}
