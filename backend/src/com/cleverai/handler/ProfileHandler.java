package com.cleverai.handler;

import com.cleverai.util.Database;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.sql.*;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class ProfileHandler implements HttpHandler {

    @Override
    public void handle(HttpExchange exchange) throws IOException {
        exchange.getResponseHeaders().add("Access-Control-Allow-Origin", "*");
        exchange.getResponseHeaders().add("Content-Type", "application/json");

        if ("OPTIONS".equals(exchange.getRequestMethod())) {
            exchange.getResponseHeaders().add("Access-Control-Allow-Methods", "POST, OPTIONS");
            exchange.getResponseHeaders().add("Access-Control-Allow-Headers", "Content-Type");
            exchange.sendResponseHeaders(204, -1);
            return;
        }

        if (!"POST".equals(exchange.getRequestMethod())) {
            sendResponse(exchange, 405, "{\"error\":\"Method not allowed\"}");
            return;
        }

        String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
        Map<String, String> params = parseBody(body);

        String username = params.getOrDefault("username", "").trim();
        String fullName = params.getOrDefault("fullName", "").trim();
        String email    = params.getOrDefault("email", "").trim();

        if (username.isEmpty() || fullName.isEmpty()) {
            sendResponse(exchange, 400, "{\"success\":false,\"message\":\"Username and full name are required.\"}");
            return;
        }

        if (email.isEmpty() || !email.contains("@")) {
            sendResponse(exchange, 400, "{\"success\":false,\"message\":\"A valid email is required.\"}");
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
                sendResponse(exchange, 200,
                    "{\"success\":true,\"message\":\"Profile updated.\",\"fullName\":\"" + fullName + "\"}");
            } else {
                sendResponse(exchange, 404, "{\"success\":false,\"message\":\"User not found.\"}");
            }
        } catch (SQLIntegrityConstraintViolationException e) {
            System.out.println("[PROFILE] FAILED email already used");
            System.out.println("──────────────────────────────");
            sendResponse(exchange, 409, "{\"success\":false,\"message\":\"Email already used by another account.\"}");
        } catch (Exception e) {
            e.printStackTrace();
            sendResponse(exchange, 500, "{\"success\":false,\"message\":\"Server error.\"}");
        }
    }

    private void sendResponse(HttpExchange ex, int code, String body) throws IOException {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        ex.sendResponseHeaders(code, bytes.length);
        ex.getResponseBody().write(bytes);
        ex.getResponseBody().close();
    }

    private Map<String, String> parseBody(String body) {
        Map<String, String> map = new HashMap<>();
        try {
            body = body.trim();
            int i = 0;
            while (i < body.length()) {
                int keyStart = body.indexOf('"', i);
                if (keyStart < 0) break;
                int keyEnd = body.indexOf('"', keyStart + 1);
                if (keyEnd < 0) break;
                String key = body.substring(keyStart + 1, keyEnd);

                int colon = body.indexOf(':', keyEnd + 1);
                if (colon < 0) break;

                int valStart = body.indexOf('"', colon + 1);
                if (valStart < 0) break;

                int valEnd = valStart + 1;
                while (valEnd < body.length()) {
                    if (body.charAt(valEnd) == '"' && body.charAt(valEnd - 1) != '\\') break;
                    valEnd++;
                }
                String value = body.substring(valStart + 1, valEnd);
                map.put(key, value);
                i = valEnd + 1;
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return map;
    }
}