package com.example.backend.controller;

import com.example.backend.dto.CommentDto;
import com.example.backend.dto.CommentResponseDto;
import com.example.backend.dto.PostDto;
import com.example.backend.dto.PostResponseDto;
import com.example.backend.service.DiscussionService;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/discussion")
public class DiscussionController {
    private final DiscussionService discussionService;

    public DiscussionController(DiscussionService discussionService) {
        this.discussionService = discussionService;
    }

    @PostMapping("/posts")
    public ResponseEntity<PostResponseDto> createPost(
            @RequestBody PostDto postDto,
            @AuthenticationPrincipal Jwt jwt) {
        String keycloakId = jwt.getClaimAsString("sub");
        return ResponseEntity.ok(discussionService.createPost(postDto, keycloakId));
    }

    @GetMapping("/courses/{courseId}/posts")
    public ResponseEntity<Page<PostResponseDto>> getPostsByCourse(
            @PathVariable Long courseId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @AuthenticationPrincipal Jwt jwt) {
        String keycloakId = jwt.getClaimAsString("sub");
        return ResponseEntity.ok(discussionService.getPostsByCourse(courseId, page, size, keycloakId));
    }

    @PostMapping("/comments")
    public ResponseEntity<CommentResponseDto> createComment(
            @RequestBody CommentDto commentDto,
            @AuthenticationPrincipal Jwt jwt) {
        String keycloakId = jwt.getClaimAsString("sub");
        return ResponseEntity.ok(discussionService.createComment(commentDto, keycloakId));
    }

    @GetMapping("/posts/{postId}/comments")
    public ResponseEntity<List<CommentResponseDto>> getCommentsByPost(
            @PathVariable Long postId,
            @AuthenticationPrincipal Jwt jwt) {
        String keycloakId = jwt.getClaimAsString("sub");
        return ResponseEntity.ok(discussionService.getCommentsByPost(postId, keycloakId));
    }

    @DeleteMapping("/posts/{postId}")
    public ResponseEntity<Void> deletePost(
            @PathVariable Long postId,
            @AuthenticationPrincipal Jwt jwt) {
        String keycloakId = jwt.getClaimAsString("sub");
        discussionService.deletePost(postId, keycloakId);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/comments/{commentId}")
    public ResponseEntity<Void> deleteComment(
            @PathVariable Long commentId,
            @AuthenticationPrincipal Jwt jwt) {
        String keycloakId = jwt.getClaimAsString("sub");
        discussionService.deleteComment(commentId, keycloakId);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/posts/{postId}/pin")
    public ResponseEntity<Void> pinPost(
            @PathVariable Long postId,
            @AuthenticationPrincipal Jwt jwt) {
        String keycloakId = jwt.getClaimAsString("sub");
        discussionService.pinPost(postId, keycloakId);
        return ResponseEntity.ok().build();
    }
}
