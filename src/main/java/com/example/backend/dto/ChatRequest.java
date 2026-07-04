package com.example.backend.dto;

import lombok.Data;

/**
 * Request payload for asking questions about an analyzed document.
 */
@Data
public class ChatRequest {
    private String query;
    private String documentId;
}
