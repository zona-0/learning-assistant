package com.cleverai.handler;

import com.cleverai.util.HandlerUtil;
import com.cleverai.util.JsonUtil;
import com.cleverai.util.RateLimitUtil;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

import java.io.*;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;

public class AITutorHandler implements HttpHandler {

    private static final String API_KEY = System.getenv("AI_API_KEY");
    private static final String API_URL = "https://api.groq.com/openai/v1/chat/completions";
    private static final String MODEL = "llama-3.3-70b-versatile";

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

        String message = params.getOrDefault("message", "").trim();
        String username = params.getOrDefault("username", "").trim();
        boolean generateTitle = "true".equals(params.getOrDefault("generateTitle", "false"));
        if (message.isEmpty()) {
            JsonUtil.sendResponse(exchange, 400, Map.of("error", "message is required"));
            return;
        }

        if (!username.isEmpty()) {
            int userId = RateLimitUtil.getUserIdByUsername(username);
            if (userId > 0) {
                Map<String, Object> rateCheck = RateLimitUtil.checkTutorLimit(userId);
                if (!(boolean) rateCheck.get("allowed")) {
                    JsonUtil.sendResponse(exchange, 429, rateCheck);
                    return;
                }
            }
        }
        
        try {
            String reply = callOpenAI(message);
            String title = null;
            if (generateTitle) {
                try {
                    title = callOpenAI("Suggest a very short title (max 5 words, no quotes) for a chat that starts with: " + message);
                    title = title.replaceAll("[\"']", "").trim();
                    if (title.length() > 70) title = title.substring(0, 70);
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
            Map<String, Object> resp = new LinkedHashMap<>();
            resp.put("reply", reply);
            if (title != null) {
                resp.put("title", title);
            }
            JsonUtil.sendResponse(exchange, 200, resp);
        } catch (Exception e) {
            e.printStackTrace();
            JsonUtil.sendResponse(exchange, 500, Map.of("error", "AI request failed: " + (e.getMessage() != null ? e.getMessage() : "Unknown error")));
        }
    }

    private String callOpenAI(String message) throws Exception {
        ObjectNode body = JsonUtil.createObject();
        body.put("model", MODEL);
        ArrayNode messages = body.putArray("messages");
        messages.addObject().put("role", "system").put("content", "You are a helpful AI tutor for students. Provide clear, educational responses.");
        messages.addObject().put("role", "user").put("content", message);
        body.put("max_tokens", 1024);

        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(API_URL))
            .header("Authorization", "Bearer " + API_KEY)
            .header("Content-Type", "application/json")
            .timeout(java.time.Duration.ofSeconds(60))
            .POST(HttpRequest.BodyPublishers.ofString(JsonUtil.toJson(body)))
            .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 200) {
            throw new RuntimeException("API returned " + response.statusCode() + ": " + response.body());
        }

        return JsonUtil.extractContent(response.body());
    }
}
