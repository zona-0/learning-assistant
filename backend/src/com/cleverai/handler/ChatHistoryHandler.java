package com.cleverai.handler;

import com.cleverai.dao.ChatHistoryDAO;
import com.cleverai.model.ChatMessage;
import com.cleverai.model.ChatSession;
import com.cleverai.util.JsonUtil;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import java.io.*;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.*;

public class ChatHistoryHandler implements HttpHandler {

    private final ChatHistoryDAO chatDAO = new ChatHistoryDAO();

    @Override
    public void handle(HttpExchange exchange) throws IOException {
        exchange.getResponseHeaders().add("Access-Control-Allow-Origin", "*");

        if ("OPTIONS".equals(exchange.getRequestMethod())) {
            exchange.getResponseHeaders().add("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
            exchange.getResponseHeaders().add("Access-Control-Allow-Headers", "Content-Type");
            exchange.sendResponseHeaders(204, -1);
            return;
        }

        String method = exchange.getRequestMethod();
        String path = exchange.getRequestURI().getPath();

        try {
            switch (method) {
                case "GET":
                    handleGet(exchange, path);
                    break;
                case "POST":
                    handlePost(exchange, path);
                    break;
                case "DELETE":
                    handleDelete(exchange, path);
                    break;
                default:
                    JsonUtil.sendResponse(exchange, 405, Map.of("error", "Method not allowed"));
            }
        } catch (Exception e) {
            e.printStackTrace();
            JsonUtil.sendResponse(exchange, 500, Map.of("error", "Server error: " + (e.getMessage() != null ? e.getMessage() : "Unknown error")));
        }
    }

    private void handleGet(HttpExchange exchange, String path) throws IOException {
        String query = exchange.getRequestURI().getRawQuery();

        if (path.equals("/api/chat/sessions")) {
            handleGetSessions(exchange, query);
        } else if (path.equals("/api/chat/history")) {
            handleGetHistory(exchange, query);
        } else {
            JsonUtil.sendResponse(exchange, 404, Map.of("error", "Not found"));
        }
    }

    private void handleGetSessions(HttpExchange exchange, String query) throws IOException {
        String username = extractQueryParam(query, "username");
        if (username == null || username.isEmpty()) {
            JsonUtil.sendResponse(exchange, 400, Map.of("error", "username required"));
            return;
        }
        int userId = chatDAO.getUserIdByUsername(username);
        if (userId == -1) {
            JsonUtil.sendResponse(exchange, 404, Map.of("error", "User not found"));
            return;
        }
        List<ChatSession> sessions = chatDAO.getSessions(userId);
        List<Map<String, Object>> result = new ArrayList<>();
        for (ChatSession s : sessions) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", s.getId());
            item.put("title", s.getTitle());
            item.put("createdAt", s.getCreatedAt());
            item.put("updatedAt", s.getUpdatedAt());
            result.add(item);
        }
        JsonUtil.sendResponse(exchange, 200, result);
    }

    private void handleGetHistory(HttpExchange exchange, String query) throws IOException {
        String username = extractQueryParam(query, "username");
        String sessionIdStr = extractQueryParam(query, "sessionId");
        if (username == null || username.isEmpty() || sessionIdStr == null) {
            JsonUtil.sendResponse(exchange, 400, Map.of("error", "username and sessionId required"));
            return;
        }
        int sessionId;
        try {
            sessionId = Integer.parseInt(sessionIdStr);
        } catch (NumberFormatException e) {
            JsonUtil.sendResponse(exchange, 400, Map.of("error", "invalid sessionId"));
            return;
        }
        int userId = chatDAO.getUserIdByUsername(username);
        if (userId == -1) {
            JsonUtil.sendResponse(exchange, 404, Map.of("error", "User not found"));
            return;
        }
        List<ChatMessage> messages = chatDAO.getHistory(userId, sessionId);
        List<Map<String, Object>> result = new ArrayList<>();
        for (ChatMessage msg : messages) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", msg.getId());
            item.put("role", msg.getRole());
            item.put("message", msg.getMessage());
            item.put("createdAt", msg.getCreatedAt());
            result.add(item);
        }
        JsonUtil.sendResponse(exchange, 200, result);
    }

    private void handlePost(HttpExchange exchange, String path) throws IOException {
        String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
        Map<String, String> params = JsonUtil.parseBody(body);

        if (path.equals("/api/chat/sessions")) {
            handleCreateSession(exchange, params);
        } else if (path.equals("/api/chat/save")) {
            handleSaveMessage(exchange, params);
        } else if (path.equals("/api/chat/title")) {
            handleUpdateTitle(exchange, params);
        } else {
            JsonUtil.sendResponse(exchange, 404, Map.of("error", "Not found"));
        }
    }

    private void handleCreateSession(HttpExchange exchange, Map<String, String> params) throws IOException {
        String username = params.getOrDefault("username", "").trim();
        String title = params.getOrDefault("title", "New Chat").trim();
        String sessionIdStr = params.getOrDefault("sessionId", "").trim();
        if (username.isEmpty()) {
            JsonUtil.sendResponse(exchange, 400, Map.of("success", false, "message", "username required"));
            return;
        }
        int userId = chatDAO.getUserIdByUsername(username);
        if (userId == -1) {
            JsonUtil.sendResponse(exchange, 404, Map.of("success", false, "message", "User not found"));
            return;
        }
        if (!sessionIdStr.isEmpty()) {
            int sessionId = Integer.parseInt(sessionIdStr);
            if (!title.isEmpty()) {
                chatDAO.updateSessionTitle(sessionId, title);
            }
            JsonUtil.sendResponse(exchange, 200, Map.of("success", true, "sessionId", sessionId, "title", title));
            return;
        }
        if (title.isEmpty()) {
            title = "New Chat";
        }
        int sessionId = chatDAO.createSession(userId, title);
        if (sessionId > 0) {
            JsonUtil.sendResponse(exchange, 200, Map.of("success", true, "sessionId", sessionId, "title", title));
        } else {
            JsonUtil.sendResponse(exchange, 500, Map.of("success", false, "message", "Failed to create session"));
        }
    }

    private void handleSaveMessage(HttpExchange exchange, Map<String, String> params) throws IOException {
        String username = params.getOrDefault("username", "").trim();
        String sessionIdStr = params.getOrDefault("sessionId", "").trim();
        String role = params.getOrDefault("role", "").trim();
        String message = params.getOrDefault("message", "").trim();

        if (username.isEmpty() || sessionIdStr.isEmpty() || role.isEmpty() || message.isEmpty()) {
            JsonUtil.sendResponse(exchange, 400, Map.of("success", false, "message", "username, sessionId, role, and message are required"));
            return;
        }
        if (!role.equals("user") && !role.equals("ai")) {
            JsonUtil.sendResponse(exchange, 400, Map.of("success", false, "message", "role must be 'user' or 'ai'"));
            return;
        }
        int sessionId;
        try {
            sessionId = Integer.parseInt(sessionIdStr);
        } catch (NumberFormatException e) {
            JsonUtil.sendResponse(exchange, 400, Map.of("success", false, "message", "invalid sessionId"));
            return;
        }
        int userId = chatDAO.getUserIdByUsername(username);
        if (userId == -1) {
            JsonUtil.sendResponse(exchange, 404, Map.of("success", false, "message", "User not found"));
            return;
        }
        boolean saved = chatDAO.saveMessage(userId, sessionId, role, message);
        if (saved) {
            if (role.equals("user")) {
                chatDAO.updateSessionTitle(sessionId, truncateUtf8(message, 80));
            }
            JsonUtil.sendResponse(exchange, 200, Map.of("success", true));
        } else {
            JsonUtil.sendResponse(exchange, 500, Map.of("success", false, "message", "Failed to save message"));
        }
    }

    private void handleDelete(HttpExchange exchange, String path) throws IOException {
        String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
        Map<String, String> params = JsonUtil.parseBody(body);

        if (path.equals("/api/chat/sessions")) {
            handleDeleteSession(exchange, params);
        } else if (path.equals("/api/chat/clear")) {
            handleClearAll(exchange, params);
        } else {
            JsonUtil.sendResponse(exchange, 404, Map.of("error", "Not found"));
        }
    }

    private void handleDeleteSession(HttpExchange exchange, Map<String, String> params) throws IOException {
        String username = params.getOrDefault("username", "").trim();
        String sessionIdStr = params.getOrDefault("sessionId", "").trim();
        if (username.isEmpty() || sessionIdStr.isEmpty()) {
            JsonUtil.sendResponse(exchange, 400, Map.of("success", false, "message", "username and sessionId required"));
            return;
        }
        int sessionId;
        try {
            sessionId = Integer.parseInt(sessionIdStr);
        } catch (NumberFormatException e) {
            JsonUtil.sendResponse(exchange, 400, Map.of("success", false, "message", "invalid sessionId"));
            return;
        }
        int userId = chatDAO.getUserIdByUsername(username);
        if (userId == -1) {
            JsonUtil.sendResponse(exchange, 404, Map.of("success", false, "message", "User not found"));
            return;
        }
        chatDAO.deleteSession(userId, sessionId);
        JsonUtil.sendResponse(exchange, 200, Map.of("success", true));
    }

    private void handleClearAll(HttpExchange exchange, Map<String, String> params) throws IOException {
        String username = params.getOrDefault("username", "").trim();
        if (username.isEmpty()) {
            JsonUtil.sendResponse(exchange, 400, Map.of("success", false, "message", "username required"));
            return;
        }
        int userId = chatDAO.getUserIdByUsername(username);
        if (userId == -1) {
            JsonUtil.sendResponse(exchange, 404, Map.of("success", false, "message", "User not found"));
            return;
        }
        chatDAO.clearHistory(userId);
        JsonUtil.sendResponse(exchange, 200, Map.of("success", true));
    }

    private void handleUpdateTitle(HttpExchange exchange, Map<String, String> params) throws IOException {
        String username = params.getOrDefault("username", "").trim();
        String sessionIdStr = params.getOrDefault("sessionId", "").trim();
        String title = params.getOrDefault("title", "").trim();
        if (username.isEmpty() || sessionIdStr.isEmpty() || title.isEmpty()) {
            JsonUtil.sendResponse(exchange, 400, Map.of("success", false, "message", "username, sessionId, and title required"));
            return;
        }
        int sessionId;
        try {
            sessionId = Integer.parseInt(sessionIdStr);
        } catch (NumberFormatException e) {
            JsonUtil.sendResponse(exchange, 400, Map.of("success", false, "message", "invalid sessionId"));
            return;
        }
        int userId = chatDAO.getUserIdByUsername(username);
        if (userId == -1) {
            JsonUtil.sendResponse(exchange, 404, Map.of("success", false, "message", "User not found"));
            return;
        }
        chatDAO.updateSessionTitle(sessionId, title);
        JsonUtil.sendResponse(exchange, 200, Map.of("success", true));
    }

    private String extractQueryParam(String query, String param) {
        if (query == null) return null;
        for (String part : query.split("&")) {
            String[] kv = part.split("=", 2);
            if (kv.length == 2 && kv[0].equals(param)) {
                try {
                    return URLDecoder.decode(kv[1], "UTF-8");
                } catch (Exception e) {
                    return kv[1];
                }
            }
        }
        return null;
    }

    private String truncateUtf8(String s, int maxLen) {
        if (s == null || s.length() <= maxLen) return s;
        try {
            int end = s.offsetByCodePoints(0, maxLen);
            return s.substring(0, end) + "...";
        } catch (IndexOutOfBoundsException e) {
            int end = maxLen;
            while (end > 0 && !Character.isValidCodePoint(s.codePointAt(end - 1))) end--;
            return s.substring(0, end) + "...";
        }
    }
}
