package com.example.backend.service.implement;

import com.example.backend.dto.DocumentResponseDto;
import com.example.backend.dto.StudentPermissionResponseDto;
import com.example.backend.entity.*;
import com.example.backend.exception.CustomException;
import com.example.backend.repository.*;
import com.example.backend.service.DocumentService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.*;
import java.time.OffsetDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class DocumentServiceImplement implements DocumentService {

    private final DocumentRepository documentRepository;
    private final CourseRepository courseRepository;
    private final StudentRepository studentRepository;
    private final TeacherRepository teacherRepository;
    private final RegisterRepository registerRepository;

    @Value("${app.document.dir:Data/document}")
    private String baseDir;

    // Block dangerous executable/script file extensions
    private static final Set<String> BLOCKED_EXTENSIONS = new HashSet<>(Arrays.asList(
            "exe", "msi", "sh", "bat", "cmd", "js", "vbs", "jar", "com", "scr", "apk", "bin"
    ));

    public DocumentServiceImplement(DocumentRepository documentRepository,
                                    CourseRepository courseRepository,
                                    StudentRepository studentRepository,
                                    TeacherRepository teacherRepository,
                                    RegisterRepository registerRepository) {
        this.documentRepository = documentRepository;
        this.courseRepository = courseRepository;
        this.studentRepository = studentRepository;
        this.teacherRepository = teacherRepository;
        this.registerRepository = registerRepository;
    }

    private UserDetails resolveUser(String sub) {
        Optional<Teacher> teacherOpt = teacherRepository.findByKeycloakId(sub);
        if (teacherOpt.isPresent()) {
            return new UserDetails(teacherOpt.get(), null, "TEACHER");
        }
        Optional<Student> studentOpt = studentRepository.findByKeycloakId(sub);
        if (studentOpt.isPresent()) {
            return new UserDetails(null, studentOpt.get(), "STUDENT");
        }
        throw new CustomException("User not found in system with sub ID: " + sub, HttpStatus.UNAUTHORIZED);
    }

    private String getFileExtension(String filename) {
        if (filename == null || !filename.contains(".")) {
            return "";
        }
        return filename.substring(filename.lastIndexOf(".") + 1).toLowerCase();
    }

    @Override
    @Transactional
    public DocumentResponseDto uploadFile(Long courseId, Long parentFolderId, MultipartFile file, String sub, String uploaderName) {
        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || originalFilename.isEmpty()) {
            throw new CustomException("Filename cannot be empty", HttpStatus.BAD_REQUEST);
        }

        // Validate extension
        String extension = getFileExtension(originalFilename);
        if (BLOCKED_EXTENSIONS.contains(extension)) {
            throw new CustomException("Unsupported or dangerous file extension: ." + extension, HttpStatus.BAD_REQUEST);
        }

        // Validate size (25MB max)
        long maxSize = 25 * 1024 * 1024;
        if (file.getSize() > maxSize) {
            throw new CustomException("File size exceeds the maximum limit of 25MB", HttpStatus.BAD_REQUEST);
        }

        // Resolve user & permissions
        UserDetails user = resolveUser(sub);
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new CustomException("Course not found", HttpStatus.NOT_FOUND));

        if ("TEACHER".equals(user.role)) {
            if (!course.getTeacher().getId().equals(user.teacher.getId())) {
                throw new CustomException("Access denied: You are not teaching this course", HttpStatus.FORBIDDEN);
            }
        } else {
            // Student permission check
            RegisterId registerId = new RegisterId(user.student, course);
            Register register = registerRepository.findById(registerId)
                    .orElseThrow(() -> new CustomException("Access denied: You are not enrolled in this course", HttpStatus.FORBIDDEN));
            if (!Boolean.TRUE.equals(register.getCanUploadDocuments())) {
                throw new CustomException("Access denied: You do not have permission to upload files to this class", HttpStatus.FORBIDDEN);
            }
        }

        // Parent folder check
        Document parentFolder = null;
        if (parentFolderId != null) {
            parentFolder = documentRepository.findById(parentFolderId)
                    .orElseThrow(() -> new CustomException("Parent folder not found", HttpStatus.NOT_FOUND));
            if (!"FOLDER".equals(parentFolder.getType())) {
                throw new CustomException("Parent is not a folder", HttpStatus.BAD_REQUEST);
            }
            if (!parentFolder.getCourse().getId().equals(courseId)) {
                throw new CustomException("Parent folder belongs to a different course", HttpStatus.BAD_REQUEST);
            }
        }

        // Store file physically
        String relativeFolder = "class_" + courseId;
        String physicalName = UUID.randomUUID().toString() + "_" + originalFilename;
        String relativeFilePath = relativeFolder + "/" + physicalName;

        try {
            Path courseDirPath = Paths.get(baseDir, relativeFolder);
            Files.createDirectories(courseDirPath);
            Path targetPath = courseDirPath.resolve(physicalName);
            Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new CustomException("Failed to save file physically on server: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }

        // Save metadata
        Document doc = new Document();
        doc.setCourse(course);
        doc.setParentFolder(parentFolder);
        doc.setName(originalFilename);
        doc.setType("FILE");
        doc.setFilePath(relativeFilePath);
        doc.setFileExtension(extension);
        doc.setFileSize(file.getSize());
        doc.setUploaderId(sub);
        
        // Resolve uploader name
        String resolvedUploaderName = uploaderName;
        if (resolvedUploaderName == null || resolvedUploaderName.trim().isEmpty()) {
            resolvedUploaderName = "TEACHER".equals(user.role) ? user.teacher.getName() : user.student.getName();
        }
        doc.setUploaderName(resolvedUploaderName);

        Document savedDoc = documentRepository.save(doc);
        return mapToDto(savedDoc);
    }

    @Override
    public Resource downloadFile(Long docId, String sub, String userRole) {
        Document doc = documentRepository.findById(docId)
                .orElseThrow(() -> new CustomException("Document not found", HttpStatus.NOT_FOUND));

        if ("FOLDER".equals(doc.getType())) {
            throw new CustomException("Cannot download a folder", HttpStatus.BAD_REQUEST);
        }

        UserDetails user = resolveUser(sub);
        Course course = doc.getCourse();

        if ("TEACHER".equals(user.role)) {
            if (!course.getTeacher().getId().equals(user.teacher.getId())) {
                throw new CustomException("Access denied: You are not teaching this course", HttpStatus.FORBIDDEN);
            }
        } else {
            // Student download permission check
            RegisterId registerId = new RegisterId(user.student, course);
            Register register = registerRepository.findById(registerId)
                    .orElseThrow(() -> new CustomException("Access denied: You are not enrolled in this course", HttpStatus.FORBIDDEN));
            if (!Boolean.TRUE.equals(register.getCanDownloadDocuments())) {
                throw new CustomException("Access denied: You do not have permission to download files in this class", HttpStatus.FORBIDDEN);
            }
        }

        // Load physical file
        try {
            Path filePath = Paths.get(baseDir, doc.getFilePath());
            Resource resource = new UrlResource(filePath.toUri());
            if (resource.exists() && resource.isReadable()) {
                return resource;
            } else {
                throw new CustomException("Physical file not found or unreadable on server", HttpStatus.NOT_FOUND);
            }
        } catch (MalformedURLException e) {
            throw new CustomException("Invalid file path format: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Override
    @Transactional
    public DocumentResponseDto createFolder(Long courseId, Long parentFolderId, String folderName, String sub, String creatorName) {
        if (folderName == null || folderName.trim().isEmpty()) {
            throw new CustomException("Folder name cannot be empty", HttpStatus.BAD_REQUEST);
        }

        UserDetails user = resolveUser(sub);
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new CustomException("Course not found", HttpStatus.NOT_FOUND));

        if ("TEACHER".equals(user.role)) {
            if (!course.getTeacher().getId().equals(user.teacher.getId())) {
                throw new CustomException("Access denied: You are not teaching this course", HttpStatus.FORBIDDEN);
            }
        } else {
            // Student can_upload permission check to create folder
            RegisterId registerId = new RegisterId(user.student, course);
            Register register = registerRepository.findById(registerId)
                    .orElseThrow(() -> new CustomException("Access denied: You are not enrolled in this course", HttpStatus.FORBIDDEN));
            if (!Boolean.TRUE.equals(register.getCanUploadDocuments())) {
                throw new CustomException("Access denied: You do not have permission to create folders in this class", HttpStatus.FORBIDDEN);
            }
        }

        // Parent folder check
        Document parentFolder = null;
        if (parentFolderId != null) {
            parentFolder = documentRepository.findById(parentFolderId)
                    .orElseThrow(() -> new CustomException("Parent folder not found", HttpStatus.NOT_FOUND));
            if (!"FOLDER".equals(parentFolder.getType())) {
                throw new CustomException("Parent is not a folder", HttpStatus.BAD_REQUEST);
            }
            if (!parentFolder.getCourse().getId().equals(courseId)) {
                throw new CustomException("Parent folder belongs to a different course", HttpStatus.BAD_REQUEST);
            }
        }

        // Save folder entity (folders do not have physical paths, or can use an empty string/relative name)
        Document doc = new Document();
        doc.setCourse(course);
        doc.setParentFolder(parentFolder);
        doc.setName(folderName.trim());
        doc.setType("FOLDER");
        doc.setFilePath(""); // Folders do not require physical path
        doc.setFileExtension(null);
        doc.setFileSize(null);
        doc.setUploaderId(sub);

        String resolvedCreatorName = creatorName;
        if (resolvedCreatorName == null || resolvedCreatorName.trim().isEmpty()) {
            resolvedCreatorName = "TEACHER".equals(user.role) ? user.teacher.getName() : user.student.getName();
        }
        doc.setUploaderName(resolvedCreatorName);

        Document savedDoc = documentRepository.save(doc);
        return mapToDto(savedDoc);
    }

    @Override
    public List<DocumentResponseDto> getDocuments(Long courseId, Long parentFolderId, String sub, String userRole) {
        // Resolve user & ensure enrollment/teaching
        UserDetails user = resolveUser(sub);
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new CustomException("Course not found", HttpStatus.NOT_FOUND));

        if ("TEACHER".equals(user.role)) {
            if (!course.getTeacher().getId().equals(user.teacher.getId())) {
                throw new CustomException("Access denied: You are not teaching this course", HttpStatus.FORBIDDEN);
            }
        } else {
            RegisterId registerId = new RegisterId(user.student, course);
            if (!registerRepository.existsById(registerId)) {
                throw new CustomException("Access denied: You are not enrolled in this course", HttpStatus.FORBIDDEN);
            }
        }

        List<Document> docs;
        if (parentFolderId == null) {
            docs = documentRepository.findByCourseIdAndParentFolderIsNull(courseId);
        } else {
            docs = documentRepository.findByCourseIdAndParentFolderId(courseId, parentFolderId);
        }

        return docs.stream().map(this::mapToDto).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void deleteDocument(Long docId, String sub, String userRole) {
        Document doc = documentRepository.findById(docId)
                .orElseThrow(() -> new CustomException("Document not found", HttpStatus.NOT_FOUND));

        UserDetails user = resolveUser(sub);
        Course course = doc.getCourse();

        if ("TEACHER".equals(user.role)) {
            if (!course.getTeacher().getId().equals(user.teacher.getId())) {
                throw new CustomException("Access denied: You cannot delete files of another teacher's course", HttpStatus.FORBIDDEN);
            }
        } else {
            // Student: must be uploader and enrolled with upload permissions
            if (!doc.getUploaderId().equals(sub)) {
                throw new CustomException("Access denied: You can only delete your own uploaded files", HttpStatus.FORBIDDEN);
            }
            RegisterId registerId = new RegisterId(user.student, course);
            Register register = registerRepository.findById(registerId)
                    .orElseThrow(() -> new CustomException("Access denied: You are not enrolled in this course", HttpStatus.FORBIDDEN));
            if (!Boolean.TRUE.equals(register.getCanUploadDocuments())) {
                throw new CustomException("Access denied: You do not have upload permissions", HttpStatus.FORBIDDEN);
            }
        }

        deleteRecursive(doc);
    }

    private void deleteRecursive(Document doc) {
        if ("FOLDER".equals(doc.getType())) {
            List<Document> children = documentRepository.findByCourseIdAndParentFolderId(doc.getCourse().getId(), doc.getId());
            for (Document child : children) {
                deleteRecursive(child);
            }
        } else {
            // Delete physical file
            if (doc.getFilePath() != null && !doc.getFilePath().isEmpty()) {
                try {
                    Path filePath = Paths.get(baseDir, doc.getFilePath());
                    Files.deleteIfExists(filePath);
                } catch (IOException e) {
                    System.err.println("Warning: Failed to delete physical file: " + doc.getFilePath() + " - " + e.getMessage());
                }
            }
        }
        documentRepository.delete(doc);
    }

    @Override
    public List<StudentPermissionResponseDto> getStudentPermissions(Long courseId, String sub, String userRole) {
        UserDetails user = resolveUser(sub);
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new CustomException("Course not found", HttpStatus.NOT_FOUND));

        if (!"TEACHER".equals(user.role) || !course.getTeacher().getId().equals(user.teacher.getId())) {
            throw new CustomException("Access denied: Only the teacher of this course can access permissions", HttpStatus.FORBIDDEN);
        }

        List<Register> registers = registerRepository.findByIdCourse(course);
        return registers.stream().map(reg -> {
            Student s = reg.getId().getStudent();
            return new StudentPermissionResponseDto(
                    s.getId(),
                    s.getStudentCode(),
                    s.getName(),
                    s.getEmail(),
                    reg.getCanUploadDocuments(),
                    reg.getCanDownloadDocuments()
            );
        }).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void updateStudentPermissions(Long courseId, Long studentId, boolean canUpload, boolean canDownload, String sub) {
        UserDetails user = resolveUser(sub);
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new CustomException("Course not found", HttpStatus.NOT_FOUND));

        if (!"TEACHER".equals(user.role) || !course.getTeacher().getId().equals(user.teacher.getId())) {
            throw new CustomException("Access denied: Only the teacher of this course can modify permissions", HttpStatus.FORBIDDEN);
        }

        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new CustomException("Student not found", HttpStatus.NOT_FOUND));

        RegisterId registerId = new RegisterId(student, course);
        Register register = registerRepository.findById(registerId)
                .orElseThrow(() -> new CustomException("Student is not registered in this class", HttpStatus.NOT_FOUND));

        register.setCanUploadDocuments(canUpload);
        register.setCanDownloadDocuments(canDownload);
        registerRepository.save(register);
    }

    @Override
    @Transactional
    public void updateClassPermissionsBulk(Long courseId, boolean canUpload, boolean canDownload, String sub) {
        UserDetails user = resolveUser(sub);
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new CustomException("Course not found", HttpStatus.NOT_FOUND));

        if (!"TEACHER".equals(user.role) || !course.getTeacher().getId().equals(user.teacher.getId())) {
            throw new CustomException("Access denied: Only the teacher of this course can modify permissions", HttpStatus.FORBIDDEN);
        }

        List<Register> registers = registerRepository.findByIdCourse(course);
        for (Register reg : registers) {
            reg.setCanUploadDocuments(canUpload);
            reg.setCanDownloadDocuments(canDownload);
        }
        registerRepository.saveAll(registers);
    }

    @Override
    public StudentPermissionResponseDto getMyPermission(Long courseId, String sub) {
        UserDetails user = resolveUser(sub);
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new CustomException("Course not found", HttpStatus.NOT_FOUND));

        if ("TEACHER".equals(user.role)) {
            // Teacher has all rights
            return new StudentPermissionResponseDto(null, null, user.teacher.getName(), user.teacher.getEmail(), true, true);
        } else {
            RegisterId registerId = new RegisterId(user.student, course);
            Register register = registerRepository.findById(registerId)
                    .orElseThrow(() -> new CustomException("You are not registered in this class", HttpStatus.FORBIDDEN));
            return new StudentPermissionResponseDto(
                    user.student.getId(),
                    user.student.getStudentCode(),
                    user.student.getName(),
                    user.student.getEmail(),
                    register.getCanUploadDocuments(),
                    register.getCanDownloadDocuments()
            );
        }
    }

    private DocumentResponseDto mapToDto(Document doc) {
        return new DocumentResponseDto(
                doc.getId(),
                doc.getCourse().getId(),
                doc.getParentFolder() != null ? doc.getParentFolder().getId() : null,
                doc.getName(),
                doc.getType(),
                doc.getFilePath(),
                doc.getFileExtension(),
                doc.getFileSize(),
                doc.getUploaderId(),
                doc.getUploaderName(),
                doc.getCreatedAt()
        );
    }

    private static class UserDetails {
        final Teacher teacher;
        final Student student;
        final String role;

        UserDetails(Teacher teacher, Student student, String role) {
            this.teacher = teacher;
            this.student = student;
            this.role = role;
        }
    }
}
