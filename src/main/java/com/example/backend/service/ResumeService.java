package com.example.backend.service;

import com.example.backend.dto.AnalysisReportDto;
import com.example.backend.dto.ChatRequest;
import com.example.backend.dto.ChatResponse;
import com.example.backend.parser.DocumentParser;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

/**
 * Orchestrator service coordinating document parsing, embedding creation, RAG semantic queries, and Gemini generation.
 */
@Service
public class ResumeService {

    private final DocumentParser documentParser;
    private final VectorStoreService vectorStoreService;
    private final AzureOpenAiService azureOpenAiService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public ResumeService(DocumentParser documentParser,
                         VectorStoreService vectorStoreService,
                         AzureOpenAiService azureOpenAiService) {
        this.documentParser = documentParser;
        this.vectorStoreService = vectorStoreService;
        this.azureOpenAiService = azureOpenAiService;
    }

    /**
     * Parse document, compute embeddings, run structured analysis, and return the report.
     */
    public AnalysisReportDto analyzeResume(MultipartFile file, String jobRole) throws IOException {
        // 1. Parse plain text content
        String plainText = documentParser.parse(file);

        // 2. Fragment, embed, and store chunks (returns unique documentId)
        String documentId = vectorStoreService.storeDocument(plainText);

        // 3. Build prompt requesting detailed structured evaluation
        String analysisPrompt = buildAnalysisPrompt(plainText, jobRole);

        // 4. Send request to Azure OpenAI
        String rawJson = azureOpenAiService.generateStructuredContent(analysisPrompt);

        // 5. Clean and parse JSON response
        String cleanJson = sanitizeJsonString(rawJson);
        
        try {
            AnalysisReportDto report = objectMapper.readValue(cleanJson, AnalysisReportDto.class);
            report.setDocumentId(documentId); // Attach document UUID for future chat Q&A
            return report;
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse Azure OpenAI analysis output JSON: " + e.getMessage() + "\nRaw response: " + rawJson, e);
        }
    }

    /**
     * Perform semantic RAG-assisted conversational answers about the resume content.
     */
    public ChatResponse chatWithResume(ChatRequest request) {
        if (request.getDocumentId() == null || request.getDocumentId().trim().isEmpty()) {
            throw new IllegalArgumentException("DocumentId must be provided");
        }
        if (request.getQuery() == null || request.getQuery().trim().isEmpty()) {
            throw new IllegalArgumentException("Query cannot be empty");
        }

        // 1. Retrieve most relevant sentences using cosine similarity
        List<String> relevantChunks = vectorStoreService.retrieveRelevantContext(
                request.getDocumentId(),
                request.getQuery(),
                3 // retrieve top 3 chunks
        );

        // 2. Build conversational context prompt
        String chatPrompt = buildChatPrompt(relevantChunks, request.getQuery());

        // 3. Generate response text from LLM
        String rawResponse = azureOpenAiService.generatePlainContent(chatPrompt);
        
        // Strip unnecessary json structures if returned, since we requested generic conversational text
        String cleanResponse = sanitizeConversationalResponse(rawResponse);

        return new ChatResponse(cleanResponse);
    }

    private String buildAnalysisPrompt(String resumeText, String jobRole) {
        return "You are an expert ATS (Applicant Tracking System) optimizer and professional recruiter.\n" +
                "Evaluate the candidate resume text specifically against the target job role: '" + jobRole + "'.\n" +
                "Focus on providing rigorous, constructive feedback. Return a structured JSON object matching the schema below.\n" +
                "Ensure the JSON returned is clean, matches this schema exactly, and has no surrounding markdown wrapping outside of the raw JSON itself:\n\n" +
                "{\n" +
                "  \"role\": \"Target Job Role Name\",\n" +
                "  \"score\": 85, // Integer matching score from 0 to 100 based on role requirements\n" +
                "  \"skillsRequired\": [\"List of core skills required for this role\"],\n" +
                "  \"skillsFound\": [\"Matching skills identified from the resume\"],\n" +
                "  \"skillsMissing\": [\"Critical skills missing or recommended to learn\"],\n" +
                "  \"formattingSuggestions\": [\"Specific resume formatting, structure, or readability recommendations\"],\n" +
                "  \"atsOptimization\": [\"ATS keywords to add\", \"parsing improvements\"],\n" +
                "  \"strengths\": [\"Resume strengths\"],\n" +
                "  \"weaknesses\": [\"Resume gaps or weaknesses\"],\n" +
                "  \"actionableRecommendations\": [\"Courses, certifications, or projects suggested to boost score\"],\n" +
                "  \"roleFeedback\": \"Provide a thorough written evaluation containing grammar suggestions, project critiques, and experience depth feedback.\"\n" +
                "}\n\n" +
                "Resume plain text:\n" +
                resumeText;
    }

    private String buildChatPrompt(List<String> contextChunks, String userQuery) {
        StringBuilder prompt = new StringBuilder();
        prompt.append("You are a helpful AI Career Coach, Recruiter, and Resume Assistant. Your goal is to guide the candidate in optimizing their profile and answering their career queries.\n");
        prompt.append("You have access to context snippets extracted from the candidate's resume below.\n\n");
        prompt.append("Context chunks from candidate resume:\n");
        
        if (contextChunks.isEmpty()) {
            prompt.append("[No context found. Candidate hasn't uploaded or parsing returned empty text.]\n");
        } else {
            for (int i = 0; i < contextChunks.size(); i++) {
                prompt.append(String.format("--- Chunk %d ---\n%s\n\n", i + 1, contextChunks.get(i)));
            }
        }
        
        prompt.append("Guidelines:\n");
        prompt.append("1. If the user query is a specific fact-check or retrieval question about their resume contents (e.g. 'What is my experience?', 'What skills are in my resume?'), answer objectively using the provided context chunks.\n");
        prompt.append("2. If the user query is a general career advice question, interview preparation help, or job company questions (e.g. 'Can I join Wipro?', 'How can I learn React?', 'Write a cover letter summary'), use the context chunks for background context about the candidate, but answer fully and comprehensively using your general knowledge as an AI career coach. Do not refuse to answer simply because a company or technology is not listed in the resume chunks.\n\n");
        
        prompt.append("Candidate Question: ").append(userQuery).append("\n\n");
        prompt.append("AI Assistant Answer (Provide clear, helpful, structured markdown feedback):");
        
        return prompt.toString();
    }

    private String sanitizeJsonString(String rawJson) {
        if (rawJson == null) return "{}";
        String clean = rawJson.trim();
        // Remove markdown block backticks if present
        if (clean.startsWith("```json")) {
            clean = clean.substring(7);
        } else if (clean.startsWith("```")) {
            clean = clean.substring(3);
        }
        if (clean.endsWith("```")) {
            clean = clean.substring(0, clean.length() - 3);
        }
        return clean.trim();
    }

    private String sanitizeConversationalResponse(String response) {
        if (response == null) return "";
        // Clean off wrapper JSON structures if Gemini accidentally wrapped it
        String clean = response.trim();
        if (clean.startsWith("{") && clean.contains("\"answer\"")) {
            try {
                // If it returned json, pull just the answer text
                ChatResponse resObj = objectMapper.readValue(clean, ChatResponse.class);
                return resObj.getAnswer();
            } catch (Exception ignored) {}
        }
        return response;
    }
}
