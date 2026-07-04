package com.example.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Response payload carrying the RAG-assisted answer.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChatResponse {
    private String answer;
}
