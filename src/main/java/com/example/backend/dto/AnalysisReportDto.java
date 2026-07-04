package com.example.backend.dto;

import lombok.Data;
import java.util.List;

/**
 * Data Transfer Object representing the structured analysis report returned by the AI agent.
 */
@Data
public class AnalysisReportDto {
    private String documentId; // Unique session ID for subsequent RAG queries
    private String role;
    private Integer score;
    private List<String> skillsRequired;
    private List<String> skillsFound;
    private List<String> skillsMissing;
    private List<String> formattingSuggestions;
    private List<String> atsOptimization;
    private List<String> strengths;
    private List<String> weaknesses;
    private List<String> actionableRecommendations;
    private String roleFeedback;
}
