package com.example.backend.exception;

import com.example.backend.dto.ConflictDetailDto;
import java.util.Collections;
import java.util.List;
import java.util.Map;

public class ScheduleConflictException extends RuntimeException {
    private final List<ConflictDetailDto> conflicts;
    private final Map<String, Object> details;

    public ScheduleConflictException(String message, List<ConflictDetailDto> conflicts) {
        this(message, conflicts, Collections.emptyMap());
    }

    public ScheduleConflictException(String message, List<ConflictDetailDto> conflicts, Map<String, Object> details) {
        super(message);
        this.conflicts = conflicts;
        this.details = details == null ? Collections.emptyMap() : details;
    }

    public List<ConflictDetailDto> getConflicts() {
        return conflicts;
    }

    public Map<String, Object> getDetails() {
        return details;
    }
}
