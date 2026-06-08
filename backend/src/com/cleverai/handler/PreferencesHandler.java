package com.cleverai.handler;

import com.cleverai.util.HandlerUtil;
import com.cleverai.util.JsonUtil;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.HashMap;
import java.util.Map;

public class PreferencesHandler implements HttpHandler {

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

        if (username.isEmpty()) {
            JsonUtil.sendResponse(exchange, 400, Map.of("error", "username is required"));
            return;
        }

        int userId = getUserId(username);
        if (userId < 0) {
            JsonUtil.sendResponse(exchange, 404, Map.of("error", "User not found"));
            return;
        }

        String sql = "SELECT language, sound_notifications, desktop_notifications, auto_save_notes, show_progress_dashboard "
                + "FROM user_preferences WHERE user_id = ?";
        try (Connection conn = com.cleverai.util.Database.getConnection();
                PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, userId);
            ResultSet rs = ps.executeQuery();
            if (rs.next()) {
                Map<String, Object> prefs = new HashMap<>();
                prefs.put("language", rs.getString("language"));
                prefs.put("soundNotifications", rs.getBoolean("sound_notifications"));
                prefs.put("desktopNotifications", rs.getBoolean("desktop_notifications"));
                prefs.put("autoSaveNotes", rs.getBoolean("auto_save_notes"));
                prefs.put("showProgressDashboard", rs.getBoolean("show_progress_dashboard"));
                JsonUtil.sendResponse(exchange, 200, prefs);
            } else {
                JsonUtil.sendResponse(exchange, 200, Map.of());
            }
        }
    }

    private void handleSave(HttpExchange exchange) throws Exception {
        String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
        Map<String, String> params = JsonUtil.parseBody(body);

        String username = params.getOrDefault("username", "").trim();
        if (username.isEmpty()) {
            JsonUtil.sendResponse(exchange, 400, Map.of("success", false, "error", "username is required"));
            return;
        }

        int userId = getUserId(username);
        if (userId < 0) {
            JsonUtil.sendResponse(exchange, 404, Map.of("success", false, "error", "User not found"));
            return;
        }

        String language = params.getOrDefault("language", "en");
        boolean soundNotifications = "true".equals(params.getOrDefault("soundNotifications", "true"));
        boolean desktopNotifications = "true".equals(params.getOrDefault("desktopNotifications", "false"));
        boolean autoSaveNotes = "true".equals(params.getOrDefault("autoSaveNotes", "true"));
        boolean showProgressDashboard = "true".equals(params.getOrDefault("showProgressDashboard", "true"));

        String sql = "INSERT INTO user_preferences (user_id, language, sound_notifications, desktop_notifications, auto_save_notes, show_progress_dashboard) "
                + "VALUES (?, ?, ?, ?, ?, ?) "
                + "ON DUPLICATE KEY UPDATE language=VALUES(language), sound_notifications=VALUES(sound_notifications), "
                + "desktop_notifications=VALUES(desktop_notifications), auto_save_notes=VALUES(auto_save_notes), "
                + "show_progress_dashboard=VALUES(show_progress_dashboard)";
        try (Connection conn = com.cleverai.util.Database.getConnection();
                PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, userId);
            ps.setString(2, language);
            ps.setBoolean(3, soundNotifications);
            ps.setBoolean(4, desktopNotifications);
            ps.setBoolean(5, autoSaveNotes);
            ps.setBoolean(6, showProgressDashboard);
            ps.executeUpdate();
        }

        JsonUtil.sendResponse(exchange, 200, Map.of("success", true));
    }
}
