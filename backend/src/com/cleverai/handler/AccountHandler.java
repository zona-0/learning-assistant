package com.cleverai.handler;

import com.cleverai.util.HandlerUtil;
import com.cleverai.util.JsonUtil;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.util.Map;

public class AccountHandler implements HttpHandler {

    @Override
    public void handle(HttpExchange exchange) throws IOException {
        if (HandlerUtil.handleCors(exchange)) return;

        try {
            String method = exchange.getRequestMethod();
            String path = exchange.getRequestURI().getPath();

            if ("POST".equals(method) && path.endsWith("/account/deactivate")) {
                handleDeactivate(exchange);
            } else if ("POST".equals(method) && path.endsWith("/account/delete")) {
                handleDelete(exchange);
            } else {
                JsonUtil.sendResponse(exchange, 405, Map.of("error", "Method not allowed"));
            }
        } catch (Exception e) {
            e.printStackTrace();
            JsonUtil.sendResponse(exchange, 500, Map.of("success", false, "message", "Internal server error"));
        }
    }

    private void handleDeactivate(HttpExchange exchange) throws Exception {
        String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
        Map<String, String> params = JsonUtil.parseBody(body);
        String username = params.getOrDefault("username", "").trim();

        if (username.isEmpty()) {
            JsonUtil.sendResponse(exchange, 400, Map.of("success", false, "message", "username is required"));
            return;
        }

        String sql = "UPDATE users SET is_active = FALSE WHERE username = ?";
        try (Connection conn = com.cleverai.util.Database.getConnection();
                PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, username);
            int rows = ps.executeUpdate();
            if (rows > 0) {
                JsonUtil.sendResponse(exchange, 200, Map.of("success", true, "message", "Account deactivated."));
            } else {
                JsonUtil.sendResponse(exchange, 404, Map.of("success", false, "message", "User not found."));
            }
        }
    }

    private void handleDelete(HttpExchange exchange) throws Exception {
        String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
        Map<String, String> params = JsonUtil.parseBody(body);
        String username = params.getOrDefault("username", "").trim();
        String confirm = params.getOrDefault("confirm", "").trim();

        if (username.isEmpty()) {
            JsonUtil.sendResponse(exchange, 400, Map.of("success", false, "message", "username is required"));
            return;
        }

        if (!"DELETE".equals(confirm)) {
            JsonUtil.sendResponse(exchange, 400, Map.of("success", false, "message", "Must confirm with confirm=DELETE"));
            return;
        }

        String sql = "DELETE FROM users WHERE username = ?";
        try (Connection conn = com.cleverai.util.Database.getConnection();
                PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, username);
            int rows = ps.executeUpdate();
            if (rows > 0) {
                JsonUtil.sendResponse(exchange, 200, Map.of("success", true, "message", "Account permanently deleted."));
            } else {
                JsonUtil.sendResponse(exchange, 404, Map.of("success", false, "message", "User not found."));
            }
        }
    }
}
