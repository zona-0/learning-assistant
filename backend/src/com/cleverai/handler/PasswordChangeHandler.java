package com.cleverai.handler;

import com.cleverai.dao.UserDAO;
import com.cleverai.model.User;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HashMap;
import java.util.Map;

public class PasswordChangeHandler implements HttpHandler {

    private final UserDAO userDAO = new UserDAO();

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

        String username    = params.getOrDefault("username", "").trim();
        String oldPassword = params.getOrDefault("oldPassword", "");
        String newPassword = params.getOrDefault("newPassword", "");

        System.out.println("──────────────────────────────");
        System.out.println("[PASSWORD] Change attempt username: " + username);

        if (username.isEmpty() || oldPassword.isEmpty() || newPassword.isEmpty()) {
            System.out.println("[PASSWORD] FAILED missing fields");
            System.out.println("──────────────────────────────");
            sendResponse(exchange, 400, "{\"success\":false,\"message\":\"All fields are required.\"}");
            return;
        }

        if (newPassword.length() < 6) {
            System.out.println("[PASSWORD] FAILED new password too short");
            System.out.println("──────────────────────────────");
            sendResponse(exchange, 400, "{\"success\":false,\"message\":\"New password must be at least 6 characters.\"}");
            return;
        }

        User user = userDAO.authenticate(username, oldPassword);
        if (user == null) {
            System.out.println("[PASSWORD] FAILED wrong old password");
            System.out.println("──────────────────────────────");
            sendResponse(exchange, 401, "{\"success\":false,\"message\":\"Current password is incorrect.\"}");
            return;
        }

        try {
            String newHash = hashPassword(newPassword);
            boolean updated = userDAO.updatePassword(username, newHash);

            if (updated) {
                System.out.println("[PASSWORD] SUCCESS " + username);
                System.out.println("──────────────────────────────");
                sendResponse(exchange, 200, "{\"success\":true,\"message\":\"Password changed successfully.\"}");
            } else {
                sendResponse(exchange, 500, "{\"success\":false,\"message\":\"Failed to update password.\"}");
            }
        } catch (Exception e) {
            System.out.println("[PASSWORD] ERROR " + e.getMessage());
            System.out.println("──────────────────────────────");
            e.printStackTrace();
            sendResponse(exchange, 500, "{\"success\":false,\"message\":\"Server error.\"}");
        }
    }

    private String hashPassword(String password) throws Exception {
        MessageDigest md = MessageDigest.getInstance("SHA-256");
        byte[] hash = md.digest(password.getBytes("UTF-8"));
        StringBuilder hex = new StringBuilder();
        for (byte b : hash) hex.append(String.format("%02x", b));
        return hex.toString();
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
