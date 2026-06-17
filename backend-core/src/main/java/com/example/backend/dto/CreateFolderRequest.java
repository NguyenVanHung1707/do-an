package com.example.backend.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CreateFolderRequest {
    private Long courseId;
    private Long parentFolderId;
    private String folderName;
}
