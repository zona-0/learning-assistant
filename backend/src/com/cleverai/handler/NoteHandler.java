package com.cleverai.handler;

import com.cleverai.dao.NoteDAO;
import com.cleverai.util.Database;
import com.cleverai.util.HandlerUtil;
import com.cleverai.util.JsonUtil;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.util.Map;

public class NoteHandler implements HttpHandler {

    private final NoteDAO noteDAO = new NoteDAO();

    @Override
    public void handle(HttpExchange exchange) throws IOException {
        if (HandlerUtil.handleCors(exchange)) return;

        try {
            String method = exchange.getRequestMethod();
            String path = exchange.getRequestURI().getPath();

            if ("POST".equals(method) && path.endsWith("/notes/save")) {
                handleSave(exchange);
            } else if ("POST".equals(method) && path.endsWith("/notes/delete")) {
                handleDelete(exchange);
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
        String title = params.getOrDefault("title", "").trim();
        String action = params.getOrDefault("action", "create").trim();

        if (username.isEmpty() || title.isEmpty()) {
            JsonUtil.sendResponse(exchange, 400, Map.of("error", "username and title are required"));
            return;
        }

        int userId = getUserId(username);
        if (userId < 0) {
            JsonUtil.sendResponse(exchange, 404, Map.of("error", "User not found"));
            return;
        }

        if ("create".equals(action)) {
            noteDAO.saveNote(userId, title);
        }
        noteDAO.logActivity(userId, action, title);

        JsonUtil.sendResponse(exchange, 200, Map.of("success", true));
    }

    private void handleDelete(HttpExchange exchange) throws Exception {
        String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
        Map<String, String> params = JsonUtil.parseBody(body);

        String username = params.getOrDefault("username", "").trim();
        String title = params.getOrDefault("title", "").trim();

        if (username.isEmpty() || title.isEmpty()) {
            JsonUtil.sendResponse(exchange, 400, Map.of("error", "username and title are required"));
            return;
        }

        int userId = getUserId(username);
        if (userId < 0) {
            JsonUtil.sendResponse(exchange, 404, Map.of("error", "User not found"));
            return;
        }

        int noteId = noteDAO.getNoteIdByTitle(userId, title);
        if (noteId > 0) {
            noteDAO.deleteNote(noteId, userId);
        }
        noteDAO.logActivity(userId, "delete", title);

        JsonUtil.sendResponse(exchange, 200, Map.of("success", true));
    }

    private int getUserId(String username) {
        String sql = "SELECT id FROM users WHERE username = ?";
        try (Connection conn = Database.getConnection();
                PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, username);
            var rs = ps.executeQuery();
            if (rs.next()) return rs.getInt("id");
        } catch (Exception e) {
            e.printStackTrace();
        }
        return -1;
    }
}
