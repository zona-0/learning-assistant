package com.cleverai.handler;

import com.cleverai.util.HandlerUtil;
import com.cleverai.util.JsonUtil;
import com.cleverai.util.RateLimitUtil;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

import java.io.*;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.Map;

public class QuizHandler implements HttpHandler {

    private static final String API_KEY = System.getenv("AI_API_KEY");
    private static final String API_URL = "https://api.groq.com/openai/v1/chat/completions";
    private static final String MODEL = "llama-3.3-70b-versatile";
    private static final int MAX_FILE_CHARS = 30000;

    private final HttpClient client = HttpClient.newBuilder()
        .connectTimeout(java.time.Duration.ofSeconds(30))
        .build();

    @Override
    public void handle(HttpExchange exchange) throws IOException {
        if (HandlerUtil.handleCors(exchange)) return;

        if (!"POST".equals(exchange.getRequestMethod())) {
            JsonUtil.sendResponse(exchange, 405, Map.of("error", "Method not allowed"));
            return;
        }

        if (API_KEY == null || API_KEY.isEmpty()) {
            JsonUtil.sendResponse(exchange, 500, Map.of("error", "AI_API_KEY not set in environment"));
            return;
        }

        String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
        Map<String, String> params = JsonUtil.parseBody(body);

        String topic = params.getOrDefault("topic", "").trim();
        String subject = params.getOrDefault("subject", "").trim();
        String countStr = params.getOrDefault("count", "5").trim();
        String fileContent = params.getOrDefault("fileContent", "").trim();
        String username = params.getOrDefault("username", "").trim();

        if (topic.isEmpty()) {
            JsonUtil.sendResponse(exchange, 400, Map.of("error", "topic is required"));
            return;
        }

        if (!username.isEmpty()) {
            int userId = RateLimitUtil.getUserIdByUsername(username);
            if (userId > 0) {
                Map<String, Object> rateCheck = RateLimitUtil.checkQuizLimit(userId);
                if (!(boolean) rateCheck.get("allowed")) {
                    JsonUtil.sendResponse(exchange, 429, rateCheck);
                    return;
                }
            }
        }

        int count;
        try {
            count = Integer.parseInt(countStr);
            if (count < 1) count = 1;
            if (count > 20) count = 20;
        } catch (NumberFormatException e) {
            count = 5;
        }

        try {
            String questionsJson = callOpenAI(topic, subject, count, fileContent);
            JsonUtil.sendResponse(exchange, 200, questionsJson);
        } catch (Exception e) {
            e.printStackTrace();
            JsonUtil.sendResponse(exchange, 500, Map.of("error", "AI request failed: " + (e.getMessage() != null ? e.getMessage() : "Unknown error")));
        }
    }

    private String callOpenAI(String topic, String subject, int count, String fileContent) throws Exception {
        StringBuilder prompt = new StringBuilder();
        boolean subjectAuto = subject == null || subject.isEmpty();

        if (subjectAuto) {
            prompt.append("Classify the topic \"").append(topic)
                  .append("\" into exactly one of these subjects: Mathematics, Science, Language, History. ")
                  .append("Then generate ").append(count)
                  .append(" multiple-choice quiz questions about \"").append(topic).append("\".");
        } else {
            prompt.append("Generate ").append(count)
                  .append(" multiple-choice quiz questions about \"").append(topic)
                  .append("\" in the subject of ").append(subject).append(".");
        }

        if (!fileContent.isEmpty()) {
            String material = fileContent.length() > MAX_FILE_CHARS
                ? fileContent.substring(0, MAX_FILE_CHARS) + "\n[...content truncated]"
                : fileContent;
            prompt.append(" Based on the following material:\n\n").append(material).append("\n\n");
        }

        prompt.append("Return ONLY a valid JSON object (no markdown, no code fences) with the following structure: ")
              .append("{\"subject\": \"<one of Mathematics, Science, Language, History>\", ")
              .append("\"questions\": [")
              .append("{\"question\": \"...\", \"options\": [\"A\", \"B\", \"C\", \"D\"], \"answer\": <0-based index of correct option>}")
              .append("]}");

        ObjectNode body = JsonUtil.createObject();
        body.put("model", MODEL);
        ArrayNode messages = body.putArray("messages");
        messages.addObject().put("role", "system").put("content", "You are a quiz generator. Always respond with valid JSON only.");
        messages.addObject().put("role", "user").put("content", prompt.toString());
        body.put("max_tokens", 2048);

        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(API_URL))
            .header("Authorization", "Bearer " + API_KEY)
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(JsonUtil.toJson(body)))
            .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 200) {
            throw new RuntimeException("API returned " + response.statusCode() + ": " + response.body());
        }

        String content = JsonUtil.extractContent(response.body());
        content = content.trim();
        if (content.startsWith("```")) {
            content = content.replaceAll("```(?:json)?", "").trim();
        }
        JsonNode root = JsonUtil.parse(content);
        if (root == null) {
            return JsonUtil.toJson(Map.of("error", "Failed to parse quiz response"));
        }

        ObjectNode result = JsonUtil.createObject();
        result.put("topic", topic);

        JsonNode questionsNode = root.get("questions");
        if (questionsNode != null && questionsNode.isArray()) {
            result.set("questions", questionsNode);
        } else {
            return JsonUtil.toJson(Map.of("error", "No questions in quiz response"));
        }

        if (root.has("subject") && !root.get("subject").asText().isEmpty()) {
            result.put("subject", root.get("subject").asText());
        } else if (!subject.isEmpty()) {
            result.put("subject", subject);
        } else {
            result.put("subject", "");
        }

        return JsonUtil.toJson(result);
    }
}
