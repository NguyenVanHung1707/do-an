package com.example.backend.repository;

import com.example.backend.entity.Document;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DocumentRepository extends JpaRepository<Document, Long> {
    @Query("SELECT d FROM Document d WHERE d.course.id = :courseId AND d.parentFolder.id = :parentFolderId ORDER BY d.type DESC, d.name ASC")
    List<Document> findByCourseIdAndParentFolderId(@Param("courseId") Long courseId, @Param("parentFolderId") Long parentFolderId);

    @Query("SELECT d FROM Document d WHERE d.course.id = :courseId AND d.parentFolder IS NULL ORDER BY d.type DESC, d.name ASC")
    List<Document> findByCourseIdAndParentFolderIsNull(@Param("courseId") Long courseId);

    long countByCourseId(Long courseId);
}
