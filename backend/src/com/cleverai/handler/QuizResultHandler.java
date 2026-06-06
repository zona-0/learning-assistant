package com.cleverai.handler;

import com.cleverai.dao.QuizResultDAO;
import com.cleverai.util.HandlerUtil;
import com.cleverai.util.JsonUtil;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class QuizResultHandler implements HttpHandler {

    private final QuizResultDAO dao = new QuizResultDAO();

    @Override
    public void handle(HttpExchange exchange) throws IOException {
        if (HandlerUtil.handleCors(exchange)) return;

        try {
            String method = exchange.getRequestMethod();
            String path = exchange.getRequestURI().getPath();

            if ("POST".equals(method) && path.endsWith("/quiz/save")) {
                handleSave(exchange);
            } else if ("GET".equals(method) && path.endsWith("/quiz/history")) {
                String query = exchange.getRequestURI().getQuery();
                Map<String, String> params = HandlerUtil.queryToMap(query);
                String idStr = params.get("id");
                if (idStr != null && !idStr.isEmpty()) {
                    handleGetAttempt(exchange, Integer.parseInt(idStr));
                } else {
                    handleListHistory(exchange, params);
                }
            } else {
                JsonUtil.sendResponse(exchange, 405, Map.of("error", "Method not allowed"));
            }
        } catch (Exception e) {
            e.printStackTrace();
            JsonUtil.sendResponse(exchange, 500, Map.of("success", false, "message", "Internal server error"));
        }
    }

    private void handleSave(HttpExchange exchange) throws Exception {
        String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
        Map<String, String> params = JsonUtil.parseBody(body);

        String username = params.getOrDefault("username", "").trim();
        String subject = params.getOrDefault("subject", "").trim();
        String topic = params.getOrDefault("topic", "").trim();
        String scoreStr = params.getOrDefault("score", "0").trim();
        String totalStr = params.getOrDefault("totalQuestions", "0").trim();
        String questionsData = params.getOrDefault("questionsData", "[]").trim();

        if (username.isEmpty()) {
            JsonUtil.sendResponse(exchange, 400, Map.of("error", "username is required"));
            return;
        }

        int userId = getUserId(username);
        if (userId < 0) {
            JsonUtil.sendResponse(exchange, 404, Map.of("error", "User not found"));
            return;
        }

        int score = parseInt(scoreStr, 0);
        int total = parseInt(totalStr, 0);

        int id = dao.saveQuizResult(userId, subject, topic, score, total, questionsData);

        String topicLabel = topic.isEmpty() ? "quiz" : topic;
        String aktivitasDesc = "Completed " + subject + " quiz \"" + topicLabel + "\" — " + score + "/" + total;
        try (Connection conn = com.cleverai.util.Database.getConnection();
                PreparedStatement ps = conn.prepareStatement(
                        "INSERT INTO aktivitas_log (user_id, tipe, deskripsi) VALUES (?, 'quiz', ?)")) {
            ps.setInt(1, userId);
            ps.setString(2, aktivitasDesc);
            ps.executeUpdate();
        } catch (Exception e) {
            e.printStackTrace();
        }

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("success", true);
        resp.put("id", id);
        JsonUtil.sendResponse(exchange, 200, resp);
    }

    private void handleListHistory(HttpExchange exchange, Map<String, String> params) throws Exception {
        String username = params.getOrDefault("username", "").trim();
        if (username.isEmpty()) {
            JsonUtil.sendResponse(exchange, 400, Map.of("error", "username is required"));
            return;
        }

        int userId = getUserId(username);
        if (userId < 0) {
            JsonUtil.sendResponse(exchange, 404, Map.of("error", "User not found"));
            return;
        }

        List<Map<String, Object>> history = dao.getQuizHistory(userId);

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("success", true);
        resp.put("history", history);
        JsonUtil.sendResponse(exchange, 200, resp);
    }

    private void handleGetAttempt(HttpExchange exchange, int attemptId) throws Exception {
        Map<String, Object> attempt = dao.getQuizAttempt(attemptId);
        if (attempt == null) {
            JsonUtil.sendResponse(exchange, 404, Map.of("error", "Attempt not found"));
            return;
        }

        attempt.put("success", true);
        JsonUtil.sendResponse(exchange, 200, attempt);
    }

    private int getUserId(String username) {
        String sql = "SELECT id FROM users WHERE username = ?";
        try (java.sql.Connection conn = com.cleverai.util.Database.getConnection();
                java.sql.PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, username);
            java.sql.ResultSet rs = ps.executeQuery();
            if (rs.next()) return rs.getInt("id");
        } catch (Exception e) {
            e.printStackTrace();
        }
        return -1;
    }

    private int parseInt(String s, int def) {
        try {
            return Integer.parseInt(s);
        } catch (NumberFormatException e) {
            return def;
        }
    }
}
