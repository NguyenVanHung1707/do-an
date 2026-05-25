package com.example.backend.service.implement;

import com.example.backend.dto.SemesterDto;
import com.example.backend.entity.Semester;
import com.example.backend.entity.SemesterWeek;
import com.example.backend.repository.SemesterRepository;
import com.example.backend.repository.SemesterWeekRepository;
import com.example.backend.service.SemesterService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class SemesterServiceImplement implements SemesterService {

    private final SemesterRepository semesterRepository;
    private final SemesterWeekRepository semesterWeekRepository;

    @Override
    @Transactional
    public Semester createSemester(SemesterDto dto) {
        // Validate if code exists
        if (semesterRepository.findByCode(dto.getCode()).isPresent()) {
            throw new IllegalArgumentException("Mã học kỳ đã tồn tại!");
        }

        Semester semester = new Semester();
        semester.setCode(dto.getCode());
        semester.setStartDate(dto.getStartDate());
        semester.setEndDate(dto.getEndDate());
        semester.setIsActive(dto.getIsActive() != null ? dto.getIsActive() : false);

        // If newly created semester is active, deactivate others
        if (semester.getIsActive()) {
            deactivateAllOtherSemesters();
        }

        Semester savedSemester = semesterRepository.save(semester);
        generateSemesterWeeks(savedSemester, dto.getWeekConfigs());

        return savedSemester;
    }

    @Override
    @Transactional
    public Semester updateSemester(Long id, SemesterDto dto) {
        Semester semester = semesterRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Học kỳ không tồn tại!"));

        // Check unique code on edit
        Optional<Semester> existing = semesterRepository.findByCode(dto.getCode());
        if (existing.isPresent() && !existing.get().getId().equals(id)) {
            throw new IllegalArgumentException("Mã học kỳ đã tồn tại!");
        }

        semester.setCode(dto.getCode());
        semester.setStartDate(dto.getStartDate());
        semester.setEndDate(dto.getEndDate());
        semester.setIsActive(dto.getIsActive() != null ? dto.getIsActive() : false);

        if (semester.getIsActive()) {
            deactivateAllOtherSemesters();
        }

        Semester savedSemester = semesterRepository.save(semester);

        // Regenerate weeks since dates or configurations might have changed
        semesterWeekRepository.deleteBySemesterId(savedSemester.getId());
        generateSemesterWeeks(savedSemester, dto.getWeekConfigs());

        return savedSemester;
    }

    @Override
    public List<Semester> getAllSemesters() {
        return semesterRepository.findByOrderByCodeDesc();
    }

    @Override
    public Semester getActiveSemester() {
        return semesterRepository.findByIsActiveTrue()
                .orElse(null);
    }

    @Override
    @Transactional
    public void setActiveSemester(Long id) {
        Semester semester = semesterRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Học kỳ không tồn tại!"));

        deactivateAllOtherSemesters();
        semester.setIsActive(true);
        semesterRepository.save(semester);
    }

    @Override
    public List<SemesterWeek> getSemesterWeeks(Long semesterId) {
        return semesterWeekRepository.findBySemesterIdOrderByWeekNumberAsc(semesterId);
    }

    private void deactivateAllOtherSemesters() {
        List<Semester> activeSemesters = semesterRepository.findAll();
        for (Semester s : activeSemesters) {
            if (s.getIsActive()) {
                s.setIsActive(false);
                semesterRepository.save(s);
            }
        }
    }

    private void generateSemesterWeeks(Semester semester, List<SemesterDto.WeekConfigDto> weekConfigs) {
        LocalDate startDate = semester.getStartDate();
        LocalDate endDate = semester.getEndDate();

        long days = ChronoUnit.DAYS.between(startDate, endDate) + 1;
        int weeksCount = (int) Math.ceil(days / 7.0);

        List<SemesterWeek> weeks = new ArrayList<>();
        for (int i = 1; i <= weeksCount; i++) {
            LocalDate weekStart = startDate.plusDays((i - 1) * 7);
            LocalDate weekEnd = weekStart.plusDays(6);
            if (weekEnd.isAfter(endDate)) {
                weekEnd = endDate;
            }

            // Find matching week config type
            String weekType = "STUDY"; // Default type
            if (weekConfigs != null) {
                for (SemesterDto.WeekConfigDto config : weekConfigs) {
                    if (i >= config.getStartWeek() && i <= config.getEndWeek()) {
                        weekType = config.getType();
                        break;
                    }
                }
            }

            SemesterWeek week = new SemesterWeek();
            week.setSemester(semester);
            week.setWeekNumber(i);
            week.setStartDate(weekStart);
            week.setEndDate(weekEnd);
            week.setWeekType(weekType);
            weeks.add(week);
        }

        semesterWeekRepository.saveAll(weeks);
    }
}
