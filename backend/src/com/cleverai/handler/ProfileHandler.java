package com.cleverai.handler;

import com.cleverai.util.Database;
import com.cleverai.util.HandlerUtil;
import com.cleverai.util.JsonUtil;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.sql.*;
import java.util.Map;

public class ProfileHandler implements HttpHandler {

    @Override
    public void handle(HttpExchange exchange) throws IOException {
        if (HandlerUtil.handleCors(exchange)) return;

        if (!"POST".equals(exchange.getRequestMethod())) {
            JsonUtil.sendResponse(exchange, 405, Map.of("error", "Method not allowed"));
            return;
        }

        String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
        Map<String, String> params = JsonUtil.parseBody(body);

        String username = params.getOrDefault("username", "").trim();
        String fullName = params.getOrDefault("fullName", "").trim();
        String email    = params.getOrDefault("email", "").trim();

        if (username.isEmpty() || fullName.isEmpty()) {
            JsonUtil.sendResponse(exchange, 400, Map.of("success", false, "message", "Username and full name are required."));
            return;
        }

        if (email.isEmpty() || !email.contains("@")) {
            JsonUtil.sendResponse(exchange, 400, Map.of("success", false, "message", "A valid email is required."));
            return;
        }

        System.out.println("──────────────────────────────");
        System.out.println("[PROFILE] Update " + username + " | name: " + fullName + " | email: " + email);

        String sql = "UPDATE users SET full_name = ?, email = ? WHERE username = ?";
        try (Connection conn = Database.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setString(1, fullName);
            ps.setString(2, email);
            ps.setString(3, username);
            int rows = ps.executeUpdate();

            if (rows > 0) {
                System.out.println("[PROFILE] SUCCESS");
                System.out.println("──────────────────────────────");
                JsonUtil.sendResponse(exchange, 200, Map.of("success", true, "message", "Profile updated.", "fullName", fullName));
            } else {
                JsonUtil.sendResponse(exchange, 404, Map.of("success", false, "message", "User not found."));
            }
        } catch (SQLIntegrityConstraintViolationException e) {
            System.out.println("[PROFILE] FAILED email already used");
            System.out.println("──────────────────────────────");
            JsonUtil.sendResponse(exchange, 409, Map.of("success", false, "message", "Email already used by another account."));
        } catch (Exception e) {
            e.printStackTrace();
            JsonUtil.sendResponse(exchange, 500, Map.of("success", false, "message", "Server error."));
        }
    }
}