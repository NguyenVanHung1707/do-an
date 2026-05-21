package com.example.backend.repository;

import com.example.backend.entity.Course;
import com.example.backend.entity.Form;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface FormRepository extends JpaRepository<Form, Long> {
  @Query("select f from Form f where f.code = ?1")
  Optional<Form> findByCode(String uniqueCode);

  Optional<Form> findByCourse(Course course);
  Optional<Form> findFirstByCourse(Course course);
  Optional<Form> findFirstByCode(String code);
}