package com.example.backend.service;

import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Service to chunk texts, store their computed embeddings in memory, and query
 * them.
 */
@Service
public class VectorStoreService {

    private final AzureOpenAiService azureOpenAiService;

    // Concurrent in-memory database mapping: documentId -> list of vector chunks
    private final Map<String, List<VectorEntry>> vectorDb = new ConcurrentHashMap<>();

    public VectorStoreService(AzureOpenAiService azureOpenAiService) {
        this.azureOpenAiService = azureOpenAiService;
    }

    @Getter
    @AllArgsConstructor
    public static class VectorEntry {
        private final String chunkText;
        private final float[] embedding;
    }

    /**
     * Chunk the plain text, calculate embeddings in a single batch, save them under
     * a documentId UUID.
     */
    public String storeDocument(String text) {
        String documentId = UUID.randomUUID().toString();
        List<String> chunks = splitIntoChunks(text, 700, 120);
        List<VectorEntry> entries = new ArrayList<>();

        if (!chunks.isEmpty()) {
            List<float[]> embeddings = azureOpenAiService.getEmbeddings(chunks);
            for (int i = 0; i < chunks.size(); i++) {
                entries.add(new VectorEntry(chunks.get(i), embeddings.get(i)));
            }
        }

        vectorDb.put(documentId, entries);
        return documentId;
    }

    /**
     * Return context chunks relevant to the user query based on cosine similarity
     * scores.
     */
    public List<String> retrieveRelevantContext(String documentId, String query, int topK) {
        List<VectorEntry> entries = vectorDb.get(documentId);
        if (entries == null || entries.isEmpty()) {
            return Collections.emptyList();
        }

        float[] queryEmbedding = azureOpenAiService.getEmbedding(query);

        List<SimilarityResult> results = new ArrayList<>();
        for (VectorEntry entry : entries) {
            double score = computeCosineSimilarity(queryEmbedding, entry.getEmbedding());
            results.add(new SimilarityResult(entry.getChunkText(), score));
        }

        // Sort descending by similarity score
        results.sort((a, b) -> Double.compare(b.getScore(), a.getScore()));

        List<String> relevantChunks = new ArrayList<>();
        int limit = Math.min(topK, results.size());
        for (int i = 0; i < limit; i++) {
            relevantChunks.add(results.get(i).getText());
        }

        return relevantChunks;
    }

    private List<String> splitIntoChunks(String text, int size, int overlap) {
        List<String> chunks = new ArrayList<>();
        if (text == null || text.trim().isEmpty()) {
            return chunks;
        }

        int index = 0;
        while (index < text.length()) {
            int end = Math.min(index + size, text.length());
            String chunk = text.substring(index, end);
            chunks.add(chunk);

            if (end == text.length()) {
                break;
            }
            index += (size - overlap);
        }
        return chunks;
    }

    private double computeCosineSimilarity(float[] vectorA, float[] vectorB) {
        if (vectorA.length != vectorB.length) {
            return 0.0;
        }
        double dotProduct = 0.0;
        double magnitudeA = 0.0;
        double magnitudeB = 0.0;

        for (int i = 0; i < vectorA.length; i++) {
            dotProduct += vectorA[i] * vectorB[i];
            magnitudeA += Math.pow(vectorA[i], 2);
            magnitudeB += Math.pow(vectorB[i], 2);
        }

        if (magnitudeA == 0.0 || magnitudeB == 0.0) {
            return 0.0;
        }

        return dotProduct / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB));
    }

    @Getter
    @AllArgsConstructor
    private static class SimilarityResult {
        private final String text;
        private final double score;
    }
}
