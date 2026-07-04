package com.example.backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

/**
 * Service facilitating REST client integration with Google Gemini Embedding and Generation APIs.
 */
@Service
public class GeminiService {

    @Value("${gemini.api.key}")
    private String apiKey;

    private final RestTemplate restTemplate = new RestTemplate();

    private static final String EMBED_URL =
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=";

    private static final String BATCH_EMBED_URL =
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:batchEmbedContents?key=";

    private static final String GENERATE_URL =
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=";

    /**
     * Compute a 768-dimension semantic vector for the provided text chunk.
     */
    public float[] getEmbedding(String text) {
        validateApiKey();
        String url = EMBED_URL + apiKey;

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        // JSON payload using immutable Map.of/List.of utilities
        Map<String, Object> requestBody = Map.of(
                "model", "models/gemini-embedding-001",
                "content", Map.of(
                        "parts", List.of(Map.of("text", text))
                )
        );

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        try {
            Map<?, ?> response = restTemplate.postForObject(url, entity, Map.class);
            if (response != null && response.containsKey("embedding")) {
                Map<?, ?> embeddingMap = (Map<?, ?>) response.get("embedding");
                List<?> values = (List<?>) embeddingMap.get("values");
                float[] embedding = new float[values.size()];
                for (int i = 0; i < values.size(); i++) {
                    Number num = (Number) values.get(i);
                    embedding[i] = num.floatValue();
                }
                return embedding;
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate embedding from Gemini: " + e.getMessage(), e);
        }
        throw new RuntimeException("Malformed response from Gemini Embedding API");
    }

    /**
     * Compute semantic vectors for multiple text chunks in a single request (Batch API).
     */
    public List<float[]> getEmbeddings(List<String> texts) {
        validateApiKey();
        String url = BATCH_EMBED_URL + apiKey;

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        List<Map<String, Object>> requestsList = new java.util.ArrayList<>();
        for (String text : texts) {
            requestsList.add(Map.of(
                    "model", "models/gemini-embedding-001",
                    "content", Map.of(
                            "parts", List.of(Map.of("text", text))
                    )
            ));
        }

        Map<String, Object> requestBody = Map.of("requests", requestsList);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        try {
            Map<?, ?> response = restTemplate.postForObject(url, entity, Map.class);
            if (response != null && response.containsKey("embeddings")) {
                List<?> embeddingsList = (List<?>) response.get("embeddings");
                List<float[]> results = new java.util.ArrayList<>();
                for (Object item : embeddingsList) {
                    Map<?, ?> embedMap = (Map<?, ?>) item;
                    List<?> values = (List<?>) embedMap.get("values");
                    float[] embedding = new float[values.size()];
                    for (int i = 0; i < values.size(); i++) {
                        Number num = (Number) values.get(i);
                        embedding[i] = num.floatValue();
                    }
                    results.add(embedding);
                }
                return results;
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate batch embeddings from Gemini: " + e.getMessage(), e);
        }
        throw new RuntimeException("Malformed response from Gemini Batch Embedding API");
    }

    /**
     * Sends the prompt context to Gemini and enforces structured JSON returns.
     */
    public String generateStructuredContent(String prompt) {
        validateApiKey();
        String url = GENERATE_URL + apiKey;

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> requestBody = Map.of(
                "contents", List.of(
                        Map.of("parts", List.of(Map.of("text", prompt)))
                ),
                "generationConfig", Map.of(
                        "responseMimeType", "application/json"
                )
        );

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        try {
            Map<?, ?> response = restTemplate.postForObject(url, entity, Map.class);
            if (response != null && response.containsKey("candidates")) {
                List<?> candidates = (List<?>) response.get("candidates");
                if (!candidates.isEmpty()) {
                    Map<?, ?> candidate = (Map<?, ?>) candidates.get(0);
                    Map<?, ?> content = (Map<?, ?>) candidate.get("content");
                    List<?> parts = (List<?>) content.get("parts");
                    if (!parts.isEmpty()) {
                        Map<?, ?> part = (Map<?, ?>) parts.get(0);
                        return (String) part.get("text");
                    }
                }
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to fetch structured content from Gemini: " + e.getMessage(), e);
        }
        throw new RuntimeException("Empty response candidates returned from Gemini LLM");
    }

    /**
     * Sends the prompt context to Gemini and returns standard conversational text (markdown).
     */
    public String generatePlainContent(String prompt) {
        validateApiKey();
        String url = GENERATE_URL + apiKey;

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> requestBody = Map.of(
                "contents", List.of(
                        Map.of("parts", List.of(Map.of("text", prompt)))
                )
        );

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        try {
            Map<?, ?> response = restTemplate.postForObject(url, entity, Map.class);
            if (response != null && response.containsKey("candidates")) {
                List<?> candidates = (List<?>) response.get("candidates");
                if (!candidates.isEmpty()) {
                    Map<?, ?> candidate = (Map<?, ?>) candidates.get(0);
                    Map<?, ?> content = (Map<?, ?>) candidate.get("content");
                    List<?> parts = (List<?>) content.get("parts");
                    if (!parts.isEmpty()) {
                        Map<?, ?> part = (Map<?, ?>) parts.get(0);
                        return (String) part.get("text");
                    }
                }
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to fetch plain content from Gemini: " + e.getMessage(), e);
        }
        throw new RuntimeException("Empty response candidates returned from Gemini LLM");
    }

    private void validateApiKey() {
        if (apiKey == null || apiKey.trim().isEmpty()) {
            throw new IllegalStateException("Google Gemini API Key is not configured. Please define GEMINI_API_KEY environment variable.");
        }
    }
}
