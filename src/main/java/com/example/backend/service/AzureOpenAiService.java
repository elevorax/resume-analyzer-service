package com.example.backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Service facilitating REST client integration with Azure OpenAI Embedding and Generation APIs.
 */
@Service
public class AzureOpenAiService {

    @Value("${azure.openai.endpoint}")
    private String endpoint;

    @Value("${azure.openai.api.key}")
    private String apiKey;

    @Value("${azure.openai.chat.deployment}")
    private String chatDeployment;

    @Value("${azure.openai.embedding.deployment}")
    private String embeddingDeployment;

    @Value("${azure.openai.api.version}")
    private String apiVersion;

    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * Compute a semantic vector for the provided text chunk using Azure OpenAI.
     */
    public float[] getEmbedding(String text) {
        validateConfig();
        String url = buildEmbeddingUrl();

        HttpHeaders headers = createHeaders();
        Map<String, Object> requestBody = Map.of("input", text);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        try {
            Map<?, ?> response = restTemplate.postForObject(url, entity, Map.class);
            if (response != null && response.containsKey("data")) {
                List<?> dataList = (List<?>) response.get("data");
                if (!dataList.isEmpty()) {
                    Map<?, ?> dataMap = (Map<?, ?>) dataList.get(0);
                    List<?> embeddingList = (List<?>) dataMap.get("embedding");
                    return convertFloatArray(embeddingList);
                }
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate embedding from Azure OpenAI: " + e.getMessage(), e);
        }
        throw new RuntimeException("Malformed response from Azure OpenAI Embedding API");
    }

    /**
     * Compute semantic vectors for multiple text chunks in a single request (Batch API).
     */
    public List<float[]> getEmbeddings(List<String> texts) {
        validateConfig();
        String url = buildEmbeddingUrl();

        HttpHeaders headers = createHeaders();
        Map<String, Object> requestBody = Map.of("input", texts);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        try {
            Map<?, ?> response = restTemplate.postForObject(url, entity, Map.class);
            if (response != null && response.containsKey("data")) {
                List<?> dataList = (List<?>) response.get("data");
                List<float[]> results = new ArrayList<>(texts.size());
                
                float[][] tempResults = new float[texts.size()][];
                for (Object item : dataList) {
                    Map<?, ?> dataMap = (Map<?, ?>) item;
                    int index = ((Number) dataMap.get("index")).intValue();
                    List<?> embeddingList = (List<?>) dataMap.get("embedding");
                    tempResults[index] = convertFloatArray(embeddingList);
                }
                
                for (float[] emb : tempResults) {
                    if (emb != null) {
                        results.add(emb);
                    }
                }
                return results;
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate batch embeddings from Azure OpenAI: " + e.getMessage(), e);
        }
        throw new RuntimeException("Malformed response from Azure OpenAI Batch Embedding API");
    }

    /**
     * Sends the prompt context to Azure OpenAI Chat Completions and enforces structured JSON returns.
     */
    public String generateStructuredContent(String prompt) {
        validateConfig();
        String url = buildChatUrl();

        HttpHeaders headers = createHeaders();
        Map<String, Object> requestBody = Map.of(
                "messages", List.of(
                        Map.of("role", "user", "content", prompt)
                ),
                "response_format", Map.of("type", "json_object"),
                "model", chatDeployment,
                "max_completion_tokens", 16384,
                "reasoning_effort", "low"
        );

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        try {
            Map<?, ?> response = restTemplate.postForObject(url, entity, Map.class);
            return extractChatContent(response);
        } catch (Exception e) {
            throw new RuntimeException("Failed to fetch structured content from Azure OpenAI: " + e.getMessage(), e);
        }
    }

    /**
     * Sends the prompt context to Azure OpenAI Chat Completions and returns standard conversational text (markdown).
     */
    public String generatePlainContent(String prompt) {
        validateConfig();
        String url = buildChatUrl();

        HttpHeaders headers = createHeaders();
        Map<String, Object> requestBody = Map.of(
                "messages", List.of(
                        Map.of("role", "user", "content", prompt)
                ),
                "model", chatDeployment,
                "max_completion_tokens", 16384,
                "reasoning_effort", "low"
        );

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        try {
            Map<?, ?> response = restTemplate.postForObject(url, entity, Map.class);
            return extractChatContent(response);
        } catch (Exception e) {
            throw new RuntimeException("Failed to fetch plain content from Azure OpenAI: " + e.getMessage(), e);
        }
    }

    private String extractChatContent(Map<?, ?> response) {
        if (response != null && response.containsKey("choices")) {
            List<?> choices = (List<?>) response.get("choices");
            if (!choices.isEmpty()) {
                Map<?, ?> choice = (Map<?, ?>) choices.get(0);
                Map<?, ?> message = (Map<?, ?>) choice.get("message");
                if (message != null && message.containsKey("content")) {
                    return (String) message.get("content");
                }
            }
        }
        throw new RuntimeException("Empty response or malformed choices returned from Azure OpenAI Chat Completions");
    }

    private HttpHeaders createHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("api-key", apiKey);
        headers.set("Authorization", "Bearer " + apiKey);
        return headers;
    }

    private String buildEmbeddingUrl() {
        String base = endpoint.endsWith("/") ? endpoint : endpoint + "/";
        return base + "openai/deployments/" + embeddingDeployment + "/embeddings?api-version=" + apiVersion;
    }

    private String buildChatUrl() {
        String base = endpoint.endsWith("/") ? endpoint : endpoint + "/";
        return base + "openai/v1/chat/completions";
    }

    private float[] convertFloatArray(List<?> values) {
        float[] embedding = new float[values.size()];
        for (int i = 0; i < values.size(); i++) {
            Number num = (Number) values.get(i);
            embedding[i] = num.floatValue();
        }
        return embedding;
    }

    private void validateConfig() {
        if (endpoint == null || endpoint.trim().isEmpty() || endpoint.contains("YOUR_RESOURCE_NAME")) {
            throw new IllegalStateException("Azure OpenAI Endpoint is not configured. Please define it in application.properties.");
        }
        if (apiKey == null || apiKey.trim().isEmpty() || apiKey.contains("YOUR_AZURE_API_KEY")) {
            throw new IllegalStateException("Azure OpenAI API Key is not configured. Please define it in application.properties.");
        }
        if (chatDeployment == null || chatDeployment.trim().isEmpty()) {
            throw new IllegalStateException("Azure OpenAI Chat Deployment is not configured. Please define it in application.properties.");
        }
        if (embeddingDeployment == null || embeddingDeployment.trim().isEmpty()) {
            throw new IllegalStateException("Azure OpenAI Embedding Deployment is not configured. Please define it in application.properties.");
        }
    }
}
