package com.cleverai.handler;

import com.cleverai.util.HandlerUtil;
import com.cleverai.util.JsonUtil;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.HashMap;
import java.util.Map;

public class GoalsHandler implements HttpHandler {

    @Override
    public void handle(HttpExchange exchange) throws IOException {
        if (HandlerUtil.handleCors(exchange)) return;

        try {
            String method = exchange.getRequestMethod();
            if ("GET".equals(method)) {
                handleGet(exchange);
            } else if ("POST".equals(method)) {
                handleSave(exchange);
            } else {
                JsonUtil.sendResponse(exchange, 405, Map.of("error", "Method not allowed"));
            }
        } catch (Exception e) {
            e.printStackTrace();
            JsonUtil.sendResponse(exchange, 500, Map.of("success", false, "message", "Internal server error"));
        }
    }

    private int getUserId(String username) {
        String sql = "SELECT id FROM users WHERE username = ?";
        try (Connection conn = com.cleverai.util.Database.getConnection();
                PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, username);
            var rs = ps.executeQuery();
            if (rs.next()) return rs.getInt("id");
        } catch (Exception e) {
            e.printStackTrace();
        }
        return -1;
    }

    private void handleGet(HttpExchange exchange) throws Exception {
        String query = exchange.getRequestURI().getQuery();
        Map<String, String> params = HandlerUtil.queryToMap(query);
        String username = params.getOrDefault("username", "").trim();
        String period = params.getOrDefault("period", "").trim();

        if (username.isEmpty()) {
            JsonUtil.sendResponse(exchange, 400, Map.of("error", "username is required"));
            return;
        }

        int userId = getUserId(username);
        if (userId < 0) {
            JsonUtil.sendResponse(exchange, 404, Map.of("error", "User not found"));
            return;
        }

        Map<String, Object> result = new HashMap<>();
        result.put("success", true);

        if (!period.isEmpty()) {
            Map<String, Object> goal = getSingleGoal(userId, period);
            result.put("goal", goal);
        } else {
            result.put("week", getSingleGoal(userId, "week"));
            result.put("month", getSingleGoal(userId, "month"));
            result.put("year", getSingleGoal(userId, "year"));
        }

        JsonUtil.sendResponse(exchange, 200, result);
    }

    private Map<String, Object> getSingleGoal(int userId, String period) {
        Map<String, Object> goal = new HashMap<>();
        goal.put("period", period);

        String sql = "SELECT focus_goal, quiz_goal, notes_goal FROM user_goals WHERE user_id = ? AND period = ?";
        try (Connection conn = com.cleverai.util.Database.getConnection();
                PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, userId);
            ps.setString(2, period);
            ResultSet rs = ps.executeQuery();
            if (rs.next()) {
                goal.put("focusGoal", rs.getDouble("focus_goal"));
                goal.put("quizGoal", rs.getInt("quiz_goal"));
                goal.put("notesGoal", rs.getInt("notes_goal"));
            } else {
                goal.put("focusGoal", period.equals("month") ? 40 : period.equals("year") ? 480 : 10);
                goal.put("quizGoal", period.equals("month") ? 20 : period.equals("year") ? 240 : 5);
                goal.put("notesGoal", period.equals("month") ? 28 : period.equals("year") ? 336 : 7);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return goal;
    }

    private void handleSave(HttpExchange exchange) throws Exception {
        String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
        ObjectMapper mapper = JsonUtil.mapper();
        Map<String, Object> params = mapper.readValue(body, new TypeReference<Map<String, Object>>() {});

        String username = (String) params.getOrDefault("username", "");
        if (username == null || username.trim().isEmpty()) {
            JsonUtil.sendResponse(exchange, 400, Map.of("success", false, "error", "username is required"));
            return;
        }
        username = username.trim();

        int userId = getUserId(username);
        if (userId < 0) {
            JsonUtil.sendResponse(exchange, 404, Map.of("success", false, "error", "User not found"));
            return;
        }

        String period = params.getOrDefault("period", "week").toString();
        double focusGoal = parseDoubleParam(params.get("focusGoal"), period.equals("month") ? 40 : period.equals("year") ? 480 : 10);
        int quizGoal = parseIntParam(params.get("quizGoal"), period.equals("month") ? 20 : period.equals("year") ? 240 : 5);
        int notesGoal = parseIntParam(params.get("notesGoal"), period.equals("month") ? 28 : period.equals("year") ? 336 : 7);

        if (focusGoal <= 0) focusGoal = 1;
        if (quizGoal <= 0) quizGoal = 1;
        if (notesGoal <= 0) notesGoal = 1;

        String sql = "INSERT INTO user_goals (user_id, period, focus_goal, quiz_goal, notes_goal) "
                + "VALUES (?, ?, ?, ?, ?) "
                + "ON DUPLICATE KEY UPDATE focus_goal=VALUES(focus_goal), quiz_goal=VALUES(quiz_goal), notes_goal=VALUES(notes_goal)";
        try (Connection conn = com.cleverai.util.Database.getConnection();
                PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, userId);
            ps.setString(2, period);
            ps.setDouble(3, focusGoal);
            ps.setInt(4, quizGoal);
            ps.setInt(5, notesGoal);
            ps.executeUpdate();
        }

        JsonUtil.sendResponse(exchange, 200, Map.of("success", true));
    }

    private double parseDoubleParam(Object val, double defaultVal) {
        if (val instanceof Number) return ((Number) val).doubleValue();
        if (val instanceof String) {
            try { return Double.parseDouble((String) val); } catch (NumberFormatException e) {}
        }
        return defaultVal;
    }

    private int parseIntParam(Object val, int defaultVal) {
        if (val instanceof Number) return ((Number) val).intValue();
        if (val instanceof String) {
            try { return Integer.parseInt((String) val); } catch (NumberFormatException e) {}
        }
        return defaultVal;
    }
}
