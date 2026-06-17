package com.example.backend.repository;

import com.example.backend.entity.SystemVisitLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@Repository
public interface SystemVisitLogRepository extends JpaRepository<SystemVisitLog, Long> {

    long countByTimestampAfter(Instant since);

    @Query("SELECT COUNT(DISTINCT s.ipAddress) FROM SystemVisitLog s WHERE s.timestamp >= :since")
    long countUniqueVisitorsAfter(@Param("since") Instant since);

    @Query("SELECT COALESCE(AVG(s.responseTimeMs), 0) FROM SystemVisitLog s WHERE s.timestamp >= :since")
    double getAverageResponseTimeAfter(@Param("since") Instant since);

    @Query("SELECT COUNT(s) FROM SystemVisitLog s WHERE s.timestamp >= :since AND s.statusCode >= 400")
    long countErrorsAfter(@Param("since") Instant since);

    // Thống kê truy cập theo giờ cho chu kỳ Ngày (Day)
    @Query(value = "SELECT TO_CHAR(timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh', 'HH24:00') as label, COUNT(*) as value " +
            "FROM system_visit_log WHERE timestamp >= :since " +
            "GROUP BY label ORDER BY label", nativeQuery = true)
    List<Map<String, Object>> getHourlyTraffic(@Param("since") Instant since);

    // Thống kê truy cập theo ngày trong tuần cho chu kỳ Tuần (Week)
    @Query(value = "SELECT EXTRACT(ISODOW FROM timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh') as dow, COUNT(*) as value " +
            "FROM system_visit_log WHERE timestamp >= :since " +
            "GROUP BY dow ORDER BY dow", nativeQuery = true)
    List<Map<String, Object>> getWeeklyTraffic(@Param("since") Instant since);

    // Thống kê truy cập theo tuần cho chu kỳ Tháng (Month)
    @Query(value = "SELECT CONCAT('Tuần ', CAST(EXTRACT(WEEK FROM timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh') - " +
            "EXTRACT(WEEK FROM DATE_TRUNC('month', timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh')) + 1 AS INTEGER)) as label, COUNT(*) as value " +
            "FROM system_visit_log WHERE timestamp >= :since " +
            "GROUP BY label ORDER BY label", nativeQuery = true)
    List<Map<String, Object>> getMonthlyTraffic(@Param("since") Instant since);
}
