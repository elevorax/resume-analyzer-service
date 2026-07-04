package com.example.backend.parser;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xwpf.extractor.XWPFWordExtractor;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

/**
 * Utility service to extract text from uploaded files (PDF, DOCX, and TXT).
 */
@Component
public class DocumentParser {

    /**
     * Extracts plain text from the uploaded MultipartFile.
     */
    public String parse(MultipartFile file) throws IOException {
        String filename = file.getOriginalFilename();
        if (filename == null) {
            throw new IllegalArgumentException("Filename cannot be null");
        }

        int lastDot = filename.lastIndexOf(".");
        if (lastDot == -1) {
            throw new IllegalArgumentException("File lacks extension: " + filename);
        }

        String extension = filename.substring(lastDot + 1).toLowerCase();

        try (InputStream is = file.getInputStream()) {
            switch (extension) {
                case "pdf":
                    return parsePdf(is.readAllBytes());
                case "docx":
                    return parseDocx(is);
                case "txt":
                    return parseTxt(is.readAllBytes());
                default:
                    throw new IllegalArgumentException("Unsupported file type: ." + extension);
            }
        }
    }

    private String parsePdf(byte[] bytes) throws IOException {
        try (PDDocument document = Loader.loadPDF(bytes)) {
            PDFTextStripper stripper = new PDFTextStripper();
            return stripper.getText(document);
        }
    }

    private String parseDocx(InputStream inputStream) throws IOException {
        try (XWPFDocument doc = new XWPFDocument(inputStream);
             XWPFWordExtractor extractor = new XWPFWordExtractor(doc)) {
            return extractor.getText();
        }
    }

    private String parseTxt(byte[] bytes) {
        return new String(bytes, StandardCharsets.UTF_8);
    }
}
