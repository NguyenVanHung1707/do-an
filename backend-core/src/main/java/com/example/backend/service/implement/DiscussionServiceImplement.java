package com.example.backend.service.implement;

import com.example.backend.dto.CommentDto;
import com.example.backend.dto.CommentResponseDto;
import com.example.backend.dto.PostDto;
import com.example.backend.dto.PostResponseDto;
import com.example.backend.entity.*;
import com.example.backend.exception.CustomException;
import com.example.backend.repository.*;
import com.example.backend.service.DiscussionService;
import com.example.backend.config.WebSocketSessionManager;
import org.springframework.context.annotation.Lazy;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class DiscussionServiceImplement implements DiscussionService {
    private final PostRepository postRepository;
    private final CommentRepository commentRepository;
    private final CourseRepository courseRepository;
    private final StudentRepository studentRepository;
    private final TeacherRepository teacherRepository;
    private final RegisterRepository registerRepository;
    private final WebSocketSessionManager webSocketSessionManager;

    public DiscussionServiceImplement(
            PostRepository postRepository,
            CommentRepository commentRepository,
            CourseRepository courseRepository,
            StudentRepository studentRepository,
            TeacherRepository teacherRepository,
            RegisterRepository registerRepository,
            @Lazy WebSocketSessionManager webSocketSessionManager) {
        this.postRepository = postRepository;
        this.commentRepository = commentRepository;
        this.courseRepository = courseRepository;
        this.studentRepository = studentRepository;
        this.teacherRepository = teacherRepository;
        this.registerRepository = registerRepository;
        this.webSocketSessionManager = webSocketSessionManager;
    }

    private Course getCourseAndAuthorize(Long courseId, String keycloakId) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new CustomException("Không tìm thấy lớp học", HttpStatus.NOT_FOUND));

        if (!checkUserInCourse(keycloakId, course)) {
            throw new CustomException("Bạn không có quyền truy cập vào lớp học này", HttpStatus.FORBIDDEN);
        }
        return course;
    }

    private boolean checkUserInCourse(String keycloakId, Course course) {
        // Kiểm tra xem có phải Giáo viên dạy lớp này không
        Optional<Teacher> teacherOpt = teacherRepository.findByKeycloakId(keycloakId);
        if (teacherOpt.isPresent()) {
            return course.getTeacher() != null && course.getTeacher().getId().equals(teacherOpt.get().getId());
        }

        // Kiểm tra xem có phải Sinh viên đăng ký lớp này không
        Optional<Student> studentOpt = studentRepository.findByKeycloakId(keycloakId);
        if (studentOpt.isPresent()) {
            RegisterId registerId = new RegisterId();
            registerId.setStudent(studentOpt.get());
            registerId.setCourse(course);
            return registerRepository.findById(registerId).isPresent();
        }

        return false;
    }

    private boolean isTeacherOfCourse(String keycloakId, Course course) {
        Optional<Teacher> teacherOpt = teacherRepository.findByKeycloakId(keycloakId);
        return teacherOpt.isPresent() && course.getTeacher() != null &&
                course.getTeacher().getId().equals(teacherOpt.get().getId());
    }

    private AuthorDetails getAuthorDetails(String keycloakId) {
        Optional<Teacher> teacherOpt = teacherRepository.findByKeycloakId(keycloakId);
        if (teacherOpt.isPresent()) {
            return new AuthorDetails(teacherOpt.get().getName(), "Teacher", null);
        }
        Optional<Student> studentOpt = studentRepository.findByKeycloakId(keycloakId);
        if (studentOpt.isPresent()) {
            return new AuthorDetails(studentOpt.get().getName(), "Student", studentOpt.get().getImagePath());
        }
        return new AuthorDetails("Người dùng Keycloak", "Student", null);
    }

    private PostResponseDto convertToPostResponseDto(Post post) {
        AuthorDetails author = getAuthorDetails(post.getAuthorId());
        
        List<CommentResponseDto> commentDtos = commentRepository.findByPostOrderByCreatedAtAsc(post)
                .stream()
                .map(this::convertToCommentResponseDto)
                .collect(Collectors.toList());

        PostResponseDto dto = new PostResponseDto();
        dto.setId(post.getId());
        dto.setContent(post.getContent());
        dto.setAuthorId(post.getAuthorId());
        dto.setAuthorName(author.name);
        dto.setAuthorRole(author.role);
        dto.setAuthorImagePath(author.imagePath);
        dto.setCourseId(post.getCourse().getId());
        dto.setCreatedAt(post.getCreatedAt());
        dto.setIsPinned(post.getIsPinned() != null && post.getIsPinned());
        dto.setCommentCount((long) commentDtos.size());
        dto.setComments(commentDtos);
        return dto;
    }

    private CommentResponseDto convertToCommentResponseDto(Comment comment) {
        AuthorDetails author = getAuthorDetails(comment.getAuthorId());

        CommentResponseDto dto = new CommentResponseDto();
        dto.setId(comment.getId());
        dto.setPostId(comment.getPost().getId());
        dto.setAuthorId(comment.getAuthorId());
        dto.setAuthorName(author.name);
        dto.setAuthorRole(author.role);
        dto.setAuthorImagePath(author.imagePath);
        dto.setContent(comment.getContent());
        dto.setCreatedAt(comment.getCreatedAt());
        return dto;
    }

    @Override
    @Transactional
    public PostResponseDto createPost(PostDto postDto, String keycloakId) {
        if (postDto.getContent() == null || postDto.getContent().trim().isEmpty()) {
            throw new CustomException("Nội dung bài viết không được để trống", HttpStatus.BAD_REQUEST);
        }
        Course course = getCourseAndAuthorize(postDto.getCourseId(), keycloakId);

        Post post = new Post();
        post.setContent(postDto.getContent());
        post.setAuthorId(keycloakId);
        post.setCourse(course);
        post.setCreatedAt(OffsetDateTime.now());
        post.setIsPinned(false);

        Post savedPost = postRepository.save(post);
        PostResponseDto responseDto = convertToPostResponseDto(savedPost);

        // Phát sóng sự kiện qua WebSocket tới các thành viên online trong lớp
        webSocketSessionManager.broadcastToCourse(course.getId(), "NEW_POST", responseDto);

        return responseDto;
    }

    @Override
    @Transactional(readOnly = true)
    public Page<PostResponseDto> getPostsByCourse(Long courseId, int page, int size, String keycloakId) {
        Course course = getCourseAndAuthorize(courseId, keycloakId);
        Pageable pageable = PageRequest.of(page, size);
        
        Page<Post> posts = postRepository.findByCourseOrderByIsPinnedDescCreatedAtDesc(course, pageable);
        return posts.map(this::convertToPostResponseDto);
    }

    @Override
    @Transactional
    public CommentResponseDto createComment(CommentDto commentDto, String keycloakId) {
        if (commentDto.getContent() == null || commentDto.getContent().trim().isEmpty()) {
            throw new CustomException("Nội dung bình luận không được để trống", HttpStatus.BAD_REQUEST);
        }

        Post post = postRepository.findById(commentDto.getPostId())
                .orElseThrow(() -> new CustomException("Không tìm thấy bài viết", HttpStatus.NOT_FOUND));

        // Kiểm tra quyền của người dùng đối với lớp học chứa bài viết này
        getCourseAndAuthorize(post.getCourse().getId(), keycloakId);

        Comment comment = new Comment();
        comment.setPost(post);
        comment.setAuthorId(keycloakId);
        comment.setContent(commentDto.getContent());
        comment.setCreatedAt(OffsetDateTime.now());

        Comment savedComment = commentRepository.save(comment);
        CommentResponseDto responseDto = convertToCommentResponseDto(savedComment);

        // Phát sóng sự kiện qua WebSocket tới các thành viên online trong lớp
        webSocketSessionManager.broadcastToCourse(post.getCourse().getId(), "NEW_COMMENT", responseDto);

        return responseDto;
    }

    @Override
    @Transactional(readOnly = true)
    public List<CommentResponseDto> getCommentsByPost(Long postId, String keycloakId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new CustomException("Không tìm thấy bài viết", HttpStatus.NOT_FOUND));

        // Kiểm tra quyền truy cập lớp học
        getCourseAndAuthorize(post.getCourse().getId(), keycloakId);

        return commentRepository.findByPostOrderByCreatedAtAsc(post)
                .stream()
                .map(this::convertToCommentResponseDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void deletePost(Long postId, String keycloakId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new CustomException("Không tìm thấy bài viết", HttpStatus.NOT_FOUND));

        // Giáo viên dạy lớp này được quyền xóa tất cả bài viết. Sinh viên chỉ được xóa bài của chính mình.
        boolean isTeacher = isTeacherOfCourse(keycloakId, post.getCourse());
        boolean isAuthor = post.getAuthorId().equals(keycloakId);

        if (!isTeacher && !isAuthor) {
            throw new CustomException("Bạn không có quyền xóa bài viết này", HttpStatus.FORBIDDEN);
        }

        postRepository.delete(post);
        
        // Phát sóng sự kiện xóa bài đăng
        webSocketSessionManager.broadcastToCourse(post.getCourse().getId(), "DELETE_POST", postId);
    }

    @Override
    @Transactional
    public void deleteComment(Long commentId, String keycloakId) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new CustomException("Không tìm thấy bình luận", HttpStatus.NOT_FOUND));

        // Giáo viên dạy lớp này được quyền xóa mọi bình luận. Sinh viên chỉ được xóa bình luận của chính mình.
        boolean isTeacher = isTeacherOfCourse(keycloakId, comment.getPost().getCourse());
        boolean isAuthor = comment.getAuthorId().equals(keycloakId);

        if (!isTeacher && !isAuthor) {
            throw new CustomException("Bạn không có quyền xóa bình luận này", HttpStatus.FORBIDDEN);
        }

        commentRepository.delete(comment);

        // Phát sóng sự kiện xóa bình luận
        var payload = new java.util.HashMap<String, Object>();
        payload.put("postId", comment.getPost().getId());
        payload.put("commentId", commentId);
        webSocketSessionManager.broadcastToCourse(comment.getPost().getCourse().getId(), "DELETE_COMMENT", payload);
    }

    @Override
    @Transactional
    public void pinPost(Long postId, String keycloakId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new CustomException("Không tìm thấy bài viết", HttpStatus.NOT_FOUND));

        // Chỉ giáo viên mới được quyền ghim bài viết
        if (!isTeacherOfCourse(keycloakId, post.getCourse())) {
            throw new CustomException("Chỉ giảng viên mới được quyền ghim bài viết", HttpStatus.FORBIDDEN);
        }

        // Đảo trạng thái ghim
        post.setIsPinned(post.getIsPinned() == null || !post.getIsPinned());
        postRepository.save(post);

        // Phát sóng sự kiện cập nhật trạng thái ghim
        var payload = new java.util.HashMap<String, Object>();
        payload.put("postId", postId);
        payload.put("isPinned", post.getIsPinned());
        webSocketSessionManager.broadcastToCourse(post.getCourse().getId(), "PIN_POST", payload);
    }

    private static class AuthorDetails {
        String name;
        String role;
        String imagePath;

        public AuthorDetails(String name, String role, String imagePath) {
            this.name = name;
            this.role = role;
            this.imagePath = imagePath;
        }
    }
}
