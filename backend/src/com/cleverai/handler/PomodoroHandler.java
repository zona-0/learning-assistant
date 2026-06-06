package com.cleverai.handler;

import com.cleverai.dao.HistoryPomodoroDAO;
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

public class PomodoroHandler implements HttpHandler {

    private final HistoryPomodoroDAO historyDAO = new HistoryPomodoroDAO();

    @Override
    public void handle(HttpExchange exchange) throws IOException {
        if (HandlerUtil.handleCors(exchange)) return;

        try {
            String method = exchange.getRequestMethod();
            String path = exchange.getRequestURI().getPath();

            if ("POST".equals(method) && path.endsWith("/pomodoro/save-settings")) {
                handleSaveSettings(exchange);
            } else if ("GET".equals(method) && path.endsWith("/pomodoro/settings")) {
                handleGetSettings(exchange);
            } else if ("POST".equals(method) && path.endsWith("/pomodoro/log")) {
                handleLogSession(exchange);
            } else if ("GET".equals(method) && path.endsWith("/pomodoro/logs")) {
                handleGetLogs(exchange);
            } else if ("GET".equals(method) && path.endsWith("/pomodoro/stats")) {
                handleGetStats(exchange);
            } else {
                JsonUtil.sendResponse(exchange, 405, Map.of("error", "Method not allowed"));
            }
        } catch (Exception e) {
            e.printStackTrace();
            JsonUtil.sendResponse(exchange, 500, Map.of("success", false, "message", "Internal server error"));
        }
    }

    private void handleSaveSettings(HttpExchange exchange) throws Exception {
        String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
        Map<String, String> params = JsonUtil.parseBody(body);

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

        int focus = parseInt(params.getOrDefault("focusDuration", "25"), 25);
        int shortBreak = parseInt(params.getOrDefault("shortBreak", "5"), 5);
        int longBreak = parseInt(params.getOrDefault("longBreak", "15"), 15);
        int sessions = parseInt(params.getOrDefault("sessionsBeforeLong", "4"), 4);
        boolean autoBreak = "true".equals(params.getOrDefault("autoStartBreaks", "false"));
        boolean sound = "true".equals(params.getOrDefault("soundNotif", "true"));

        String sql = "INSERT INTO timer_settings (user_id, focus_duration, short_break, long_break, sessions_before_long, auto_start_breaks, sound_notif) "
                + "VALUES (?, ?, ?, ?, ?, ?, ?) "
                + "ON DUPLICATE KEY UPDATE focus_duration=VALUES(focus_duration), short_break=VALUES(short_break), "
                + "long_break=VALUES(long_break), sessions_before_long=VALUES(sessions_before_long), "
                + "auto_start_breaks=VALUES(auto_start_breaks), sound_notif=VALUES(sound_notif)";
        try (Connection conn = com.cleverai.util.Database.getConnection();
                PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, userId);
            ps.setInt(2, focus);
            ps.setInt(3, shortBreak);
            ps.setInt(4, longBreak);
            ps.setInt(5, sessions);
            ps.setBoolean(6, autoBreak);
            ps.setBoolean(7, sound);
            ps.executeUpdate();
        }

        JsonUtil.sendResponse(exchange, 200, Map.of("success", true));
    }

    private void handleGetSettings(HttpExchange exchange) throws Exception {
        String query = exchange.getRequestURI().getQuery();
        Map<String, String> params = HandlerUtil.queryToMap(query);
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

        String sql = "SELECT focus_duration, short_break, long_break, sessions_before_long, auto_start_breaks, sound_notif "
                + "FROM timer_settings WHERE user_id = ?";
        try (Connection conn = com.cleverai.util.Database.getConnection();
                PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, userId);
            var rs = ps.executeQuery();
            if (rs.next()) {
                Map<String, Object> settings = new LinkedHashMap<>();
                settings.put("focusDuration", rs.getInt("focus_duration"));
                settings.put("shortBreak", rs.getInt("short_break"));
                settings.put("longBreak", rs.getInt("long_break"));
                settings.put("sessionsBeforeLong", rs.getInt("sessions_before_long"));
                settings.put("autoStartBreaks", rs.getBoolean("auto_start_breaks"));
                settings.put("soundNotif", rs.getBoolean("sound_notif"));
                JsonUtil.sendResponse(exchange, 200, settings);
            } else {
                JsonUtil.sendResponse(exchange, 200, Map.of());
            }
        }
    }

    private void handleLogSession(HttpExchange exchange) throws Exception {
        String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
        Map<String, String> params = JsonUtil.parseBody(body);

        String username = params.getOrDefault("username", "").trim();
        String mode = params.getOrDefault("mode", "").trim();
        String durationStr = params.getOrDefault("durationMinutes", "0").trim();

        if (username.isEmpty() || mode.isEmpty()) {
            JsonUtil.sendResponse(exchange, 400, Map.of("error", "username and mode are required"));
            return;
        }

        String dbMode;
        switch (mode) {
            case "focus": dbMode = "focus"; break;
            case "short": dbMode = "short_break"; break;
            case "long": dbMode = "long_break"; break;
            default:
                JsonUtil.sendResponse(exchange, 400, Map.of("error", "invalid mode"));
                return;
        }

        int userId = getUserId(username);
        if (userId < 0) {
            JsonUtil.sendResponse(exchange, 404, Map.of("error", "User not found"));
            return;
        }

        int durasi = parseInt(durationStr, 0);
        historyDAO.logSession(userId, dbMode, durasi);

        String aktivitasDesc;
        if ("focus".equals(dbMode)) {
            aktivitasDesc = "Completed " + durasi + "min focus session";
        } else {
            aktivitasDesc = "Took a " + durasi + "min " + mode + " break";
        }
        try (Connection conn = com.cleverai.util.Database.getConnection();
                PreparedStatement ps = conn.prepareStatement(
                        "INSERT INTO aktivitas_log (user_id, tipe, deskripsi) VALUES (?, 'pomodoro', ?)")) {
            ps.setInt(1, userId);
            ps.setString(2, aktivitasDesc);
            ps.executeUpdate();
        } catch (Exception e) {
            e.printStackTrace();
        }

        JsonUtil.sendResponse(exchange, 200, Map.of("success", true));
    }

    private void handleGetLogs(HttpExchange exchange) throws Exception {
        String query = exchange.getRequestURI().getQuery();
        Map<String, String> params = HandlerUtil.queryToMap(query);
        String username = params.getOrDefault("username", "").trim();
        int limit = parseInt(params.getOrDefault("limit", "10"), 10);

        if (username.isEmpty()) {
            JsonUtil.sendResponse(exchange, 400, Map.of("error", "username is required"));
            return;
        }

        int userId = getUserId(username);
        if (userId < 0) {
            JsonUtil.sendResponse(exchange, 404, Map.of("error", "User not found"));
            return;
        }

        List<Map<String, Object>> logs = historyDAO.getRecentLogs(userId, limit);
        JsonUtil.sendResponse(exchange, 200, logs);
    }

    private void handleGetStats(HttpExchange exchange) throws Exception {
        String query = exchange.getRequestURI().getQuery();
        Map<String, String> params = HandlerUtil.queryToMap(query);
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

        Map<String, Object> stats = historyDAO.getTodayStats(userId);
        JsonUtil.sendResponse(exchange, 200, stats);
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

    private int parseInt(String s, int def) {
        try {
            return Integer.parseInt(s);
        } catch (NumberFormatException e) {
            return def;
        }
    }
}
