package com.example.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CommentResponseDto {
    private Long id;
    private Long postId;
    private String authorId;
    private String authorName;
    private String authorRole; // "Teacher" hoặc "Student"
    private String authorImagePath;
    private String content;
    private OffsetDateTime createdAt;
}
