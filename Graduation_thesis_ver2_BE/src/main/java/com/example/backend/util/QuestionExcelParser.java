package com.example.backend.util;

import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class QuestionExcelParser {

    private static final Pattern CHOICE_PATTERN = Pattern.compile("^([A-Za-z])\\s*[:.-]\\s*(.*)$");

    public static List<Map<String, Object>> parseQuestions(MultipartFile file) throws Exception {
        List<Map<String, Object>> questions = new ArrayList<>();

        try (InputStream is = file.getInputStream();
             Workbook workbook = new XSSFWorkbook(is)) {

            Sheet sheet = workbook.getSheetAt(0);
            Row headerRow = sheet.getRow(0);
            if (headerRow == null) {
                throw new IllegalArgumentException("File Excel rỗng hoặc không có dòng tiêu đề!");
            }

            // Find column indices
            int typeColIdx = -1;
            int contentColIdx = -1;
            int scoreColIdx = -1;
            int choicesColIdx = -1;
            int answerColIdx = -1;
            int caseColIdx = -1;

            for (int c = 0; c < headerRow.getLastCellNum(); c++) {
                Cell cell = headerRow.getCell(c);
                if (cell == null) continue;
                String headerVal = cell.getStringCellValue().trim().toLowerCase();

                if (headerVal.contains("loại câu hỏi") || headerVal.contains("loại") || headerVal.contains("type")) {
                    typeColIdx = c;
                } else if (headerVal.contains("nội dung câu hỏi") || headerVal.contains("nội dung") || headerVal.contains("content")) {
                    contentColIdx = c;
                } else if (headerVal.contains("điểm") || headerVal.contains("score")) {
                    scoreColIdx = c;
                } else if (headerVal.contains("các lựa chọn") || headerVal.contains("lựa chọn") || headerVal.contains("choices") || headerVal.contains("options")) {
                    choicesColIdx = c;
                } else if (headerVal.contains("đáp án đúng") || headerVal.contains("đáp án") || headerVal.contains("từ khóa") || headerVal.contains("answer") || headerVal.contains("keywords")) {
                    answerColIdx = c;
                } else if (headerVal.contains("phân biệt") || headerVal.contains("case sensitive")) {
                    caseColIdx = c;
                }
            }

            // Fallback default indexing if not matched by headers
            if (typeColIdx == -1) typeColIdx = 1;
            if (contentColIdx == -1) contentColIdx = 2;
            if (scoreColIdx == -1) scoreColIdx = 3;
            if (choicesColIdx == -1) choicesColIdx = 4;
            if (answerColIdx == -1) answerColIdx = 5;
            if (caseColIdx == -1) caseColIdx = 6;

            int lastRowNum = sheet.getLastRowNum();
            for (int r = 1; r <= lastRowNum; r++) {
                Row row = sheet.getRow(r);
                if (row == null) continue;

                // 1. Content
                Cell contentCell = row.getCell(contentColIdx);
                String content = getCellValueAsString(contentCell);
                if (content.isEmpty()) {
                    continue; // Skip rows without content
                }

                // 2. Type
                Cell typeCell = row.getCell(typeColIdx);
                String typeStr = getCellValueAsString(typeCell).toLowerCase();
                String type = "MULTIPLE_CHOICE";
                if (typeStr.contains("trả lời ngắn") || typeStr.contains("short_answer") || typeStr.contains("short")) {
                    type = "SHORT_ANSWER";
                } else if (typeStr.contains("tự luận") || typeStr.contains("essay")) {
                    type = "ESSAY";
                }

                // 3. Score
                Cell scoreCell = row.getCell(scoreColIdx);
                double score = 1.0;
                try {
                    String scoreStr = getCellValueAsString(scoreCell);
                    if (!scoreStr.isEmpty()) {
                        score = Double.parseDouble(scoreStr);
                    }
                } catch (Exception ignored) {}

                // 4. Case sensitive (for SHORT_ANSWER)
                boolean caseSensitive = false;
                if (caseColIdx != -1) {
                    Cell caseCell = row.getCell(caseColIdx);
                    String caseStr = getCellValueAsString(caseCell).toLowerCase();
                    if (caseStr.contains("yes") || caseStr.contains("có") || caseStr.contains("true") || caseStr.contains("y")) {
                        caseSensitive = true;
                    }
                }

                // 5. Choices & Answers
                List<Map<String, String>> choices = new ArrayList<>();
                String correctChoice = "A";
                String keywords = "";

                Cell choicesCell = choicesColIdx != -1 ? row.getCell(choicesColIdx) : null;
                String choicesStr = getCellValueAsString(choicesCell);

                Cell answerCell = answerColIdx != -1 ? row.getCell(answerColIdx) : null;
                String answerStr = getCellValueAsString(answerCell);

                if ("MULTIPLE_CHOICE".equals(type)) {
                    if (choicesStr.isEmpty()) {
                        // Default options if empty
                        choices.add(createChoiceMap("A", ""));
                        choices.add(createChoiceMap("B", ""));
                        choices.add(createChoiceMap("C", ""));
                        choices.add(createChoiceMap("D", ""));
                    } else {
                        // Split options by "|" or newline or ";"
                        String[] rawSegments = choicesStr.split("[|\\n;]");
                        int sequentialKeyIndex = 0;
                        char[] optionKeys = {'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'};

                        for (String segment : rawSegments) {
                            segment = segment.trim();
                            if (segment.isEmpty()) continue;

                            Matcher matcher = CHOICE_PATTERN.matcher(segment);
                            if (matcher.find()) {
                                String key = matcher.group(1).toUpperCase();
                                String text = matcher.group(2).trim();
                                choices.add(createChoiceMap(key, text));
                            } else {
                                String key = String.valueOf(optionKeys[Math.min(sequentialKeyIndex++, optionKeys.length - 1)]);
                                choices.add(createChoiceMap(key, segment));
                            }
                        }
                    }

                    // Default correct choice is A, parse if provided
                    if (!answerStr.isEmpty()) {
                        correctChoice = answerStr.trim().toUpperCase();
                        // If answer is not a single letter (e.g. user wrote full answer text), try to match with option text
                        if (correctChoice.length() > 1) {
                            for (Map<String, String> c : choices) {
                                if (correctChoice.equalsIgnoreCase(c.get("text"))) {
                                    correctChoice = c.get("key");
                                    break;
                                }
                            }
                        }
                        // Fallback to first character if it matches option letters
                        if (correctChoice.length() > 1 && correctChoice.charAt(0) >= 'A' && correctChoice.charAt(0) <= 'H') {
                            correctChoice = String.valueOf(correctChoice.charAt(0));
                        }
                    }
                } else if ("SHORT_ANSWER".equals(type)) {
                    keywords = answerStr.trim();
                }

                // Map results to matching frontend keys
                Map<String, Object> questionMap = new LinkedHashMap<>();
                questionMap.put("id", System.currentTimeMillis() + r); // temporary id
                questionMap.put("type", type);
                questionMap.put("content", content);
                questionMap.put("score", score);
                questionMap.put("choices", choices.isEmpty() ? null : choices);
                questionMap.put("correctChoice", "MULTIPLE_CHOICE".equals(type) ? correctChoice : null);
                questionMap.put("keywords", "SHORT_ANSWER".equals(type) ? keywords : null);
                questionMap.put("caseSensitive", "SHORT_ANSWER".equals(type) ? caseSensitive : null);

                questions.add(questionMap);
            }
        }

        return questions;
    }

    private static Map<String, String> createChoiceMap(String key, String text) {
        Map<String, String> choice = new LinkedHashMap<>();
        choice.put("key", key);
        choice.put("text", text);
        return choice;
    }

    private static String getCellValueAsString(Cell cell) {
        if (cell == null) return "";
        switch (cell.getCellType()) {
            case STRING:
                return cell.getStringCellValue().trim();
            case NUMERIC:
                if (DateUtil.isCellDateFormatted(cell)) {
                    return cell.getDateCellValue().toString();
                }
                double val = cell.getNumericCellValue();
                if (val == (long) val) {
                    return String.format("%d", (long) val);
                } else {
                    return String.format("%s", val);
                }
            case BOOLEAN:
                return String.valueOf(cell.getBooleanCellValue());
            case FORMULA:
                try {
                    return cell.getStringCellValue().trim();
                } catch (Exception e) {
                    try {
                        return String.valueOf(cell.getNumericCellValue());
                    } catch (Exception e2) {
                        return "";
                    }
                }
            default:
                return "";
        }
    }
}
