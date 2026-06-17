package com.example.backend.service;

import com.example.backend.dto.CommentDto;
import com.example.backend.dto.CommentResponseDto;
import com.example.backend.dto.PostDto;
import com.example.backend.dto.PostResponseDto;
import org.springframework.data.domain.Page;

import java.util.List;

public interface DiscussionService {
    PostResponseDto createPost(PostDto postDto, String keycloakId);
    Page<PostResponseDto> getPostsByCourse(Long courseId, int page, int size, String keycloakId);
    CommentResponseDto createComment(CommentDto commentDto, String keycloakId);
    List<CommentResponseDto> getCommentsByPost(Long postId, String keycloakId);
    void deletePost(Long postId, String keycloakId);
    void deleteComment(Long commentId, String keycloakId);
    void pinPost(Long postId, String keycloakId);
}
