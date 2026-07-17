import api from './api';

/**
 * Service to connect frontend UI pages to Spring Boot RAG API endpoints.
 */
export const analyzerService = {
  /**
   * Uploads the resume file and target role to the backend for structured AI analysis.
   */
  async analyzeResume(file, jobRole) {
    const formData = new FormData();
    formData.append('file', file); // Raw File binary object
    formData.append('role', jobRole); // Target role string

    const response = await api.post('/resume/analyze', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * Sends a RAG semantic query regarding the resume content to the backend.
   */
  async askQuestion(query, documentId) {
    const response = await api.post('/resume/chat', {
      query,
      documentId,
    });
    return response.data; // Returns { answer: "..." }
  }
};

export default analyzerService;
