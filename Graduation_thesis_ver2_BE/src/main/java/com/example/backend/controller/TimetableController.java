package com.example.backend.controller;

import com.example.backend.dto.TimetableResponseDto;
import com.example.backend.service.TimetableService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class TimetableController {

    private final TimetableService timetableService;

    @GetMapping("/timetable")
    public ResponseEntity<TimetableResponseDto> getTimetable(
            @RequestParam(name = "semester_id", required = false) Long semesterIdSnake,
            @RequestParam(name = "semesterId", required = false) Long semesterIdCamel,
            @RequestParam(name = "week_number", required = false) Integer weekNumberSnake,
            @RequestParam(name = "weekNumber", required = false) Integer weekNumberCamel,
            @AuthenticationPrincipal Jwt jwt) {
        Long semesterId = semesterIdSnake != null ? semesterIdSnake : semesterIdCamel;
        Integer weekNumber = weekNumberSnake != null ? weekNumberSnake : weekNumberCamel;
        return ResponseEntity.ok(timetableService.getTimetable(semesterId, weekNumber, jwt));
    }
}
