package com.example.backend.controller;

import com.example.backend.dto.AnalysisReportDto;
import com.example.backend.dto.ChatRequest;
import com.example.backend.dto.ChatResponse;
import com.example.backend.service.ResumeService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

/**
 * Controller exposing endpoints for parsing and analyzing resumes, and asking semantic RAG questions.
 */
@RestController
@RequestMapping("/api/resume")
@CrossOrigin(origins = "*", allowedHeaders = "*") // Allows React cross-origin calls
public class ResumeController {

    private final ResumeService resumeService;

    public ResumeController(ResumeService resumeService) {
        this.resumeService = resumeService;
    }

    /**
     * Upload and analyze a resume document relative to a target role.
     */
    @PostMapping("/analyze")
    public ResponseEntity<?> analyzeResume(
            @RequestParam("file") MultipartFile file,
            @RequestParam("role") String role) {

        if (file.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Uploaded file is empty. Please select a valid document."));
        }
        if (role == null || role.trim().isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Target role selection cannot be blank."));
        }

        try {
            AnalysisReportDto report = resumeService.analyzeResume(file, role);
            return ResponseEntity.ok(report);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "File reading error: " + e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "AI Analysis failed: " + e.getMessage()));
        }
    }

    /**
     * Ask semantic RAG-assisted questions about the resume.
     */
    @PostMapping("/chat")
    public ResponseEntity<?> chatWithResume(@RequestBody ChatRequest request) {
        if (request.getDocumentId() == null || request.getDocumentId().trim().isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Missing required session parameter: documentId."));
        }
        if (request.getQuery() == null || request.getQuery().trim().isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Search query cannot be empty."));
        }

        try {
            ChatResponse response = resumeService.chatWithResume(request);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "RAG search failed: " + e.getMessage()));
        }
    }
}
// Helper wrapper to map errors inside controller response
class Map {
    public static java.util.Map<String, String> of(String key, String value) {
        return java.util.Map.of(key, value);
    }
}
