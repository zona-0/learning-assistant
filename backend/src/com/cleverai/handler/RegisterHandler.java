package com.cleverai.handler;

import com.cleverai.dao.UserDAO;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.sql.SQLIntegrityConstraintViolationException;
import java.util.HashMap;
import java.util.Map;

public class RegisterHandler implements HttpHandler {

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

        String fullName = params.getOrDefault("fullName", "").trim();
        String username = params.getOrDefault("username", "").trim();
        String email    = params.getOrDefault("email", "").trim();
        String password = params.getOrDefault("password", "");

        System.out.println("──────────────────────────────");
        System.out.println("[REGISTER] Attempt username: " + username + " | email: " + email);

        if (fullName.isEmpty() || username.isEmpty() || email.isEmpty() || password.isEmpty()) {
            System.out.println("[REGISTER] FAILED missing fields");
            System.out.println("──────────────────────────────");
            sendResponse(exchange, 400, "{\"success\":false,\"message\":\"All fields are required.\"}");
            return;
        }

        if (password.length() < 6) {
            System.out.println("[REGISTER] FAILED password too short");
            System.out.println("──────────────────────────────");
            sendResponse(exchange, 400, "{\"success\":false,\"message\":\"Password must be at least 6 characters.\"}");
            return;
        }

        try {
            String hash = hashPassword(password);
            UserDAO dao = new UserDAO();
            dao.register(username, email, hash, fullName);

            System.out.println("[REGISTER] SUCCESS " + fullName + " (" + username + ") | role: pelajar");
            System.out.println("──────────────────────────────");
            sendResponse(exchange, 201, "{\"success\":true,\"message\":\"Account created successfully.\"}");

        } catch (SQLIntegrityConstraintViolationException e) {
            System.out.println("[REGISTER] FAILED duplicate: " + username);
            System.out.println("──────────────────────────────");
            sendResponse(exchange, 409, "{\"success\":false,\"message\":\"Username or email already exists.\"}");
        } catch (Exception e) {
            System.out.println("[REGISTER] ERROR " + e.getMessage());
            System.out.println("──────────────────────────────");
            e.printStackTrace();
            sendResponse(exchange, 500, "{\"success\":false,\"message\":\"Server error. Please try again.\"}");
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
            body = body.trim().replaceAll("^\\{|\\}$", "");
            for (String pair : body.split(",(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)")) {
                String[] kv = pair.split("\":\"");
                if (kv.length == 2) {
                    String key   = kv[0].replaceAll("\"", "").trim();
                    String value = kv[1].replaceAll("\"", "").trim();
                    map.put(key, value);
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return map;
    }
}