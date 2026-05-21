package com.example.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class PostResponseDto {
    private Long id;
    private String content;
    private String authorId;
    private String authorName;
    private String authorRole; // "Teacher" hoặc "Student"
    private String authorImagePath;
    private Long courseId;
    private OffsetDateTime createdAt;
    private Boolean isPinned;
    private Long commentCount;
    private List<CommentResponseDto> comments;
}
