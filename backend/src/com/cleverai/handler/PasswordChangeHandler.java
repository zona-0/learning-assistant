package com.cleverai.handler;

import com.cleverai.dao.UserDAO;
import com.cleverai.model.User;
import com.cleverai.util.HandlerUtil;
import com.cleverai.util.JsonUtil;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.Map;

public class PasswordChangeHandler implements HttpHandler {

    private final UserDAO userDAO = new UserDAO();

    @Override
    public void handle(HttpExchange exchange) throws IOException {
        if (HandlerUtil.handleCors(exchange)) return;

        if (!"POST".equals(exchange.getRequestMethod())) {
            JsonUtil.sendResponse(exchange, 405, Map.of("error", "Method not allowed"));
            return;
        }

        String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
        Map<String, String> params = JsonUtil.parseBody(body);

        String username    = params.getOrDefault("username", "").trim();
        String oldPassword = params.getOrDefault("oldPassword", "");
        String newPassword = params.getOrDefault("newPassword", "");

        System.out.println("──────────────────────────────");
        System.out.println("[PASSWORD] Change attempt username: " + username);

        if (username.isEmpty() || oldPassword.isEmpty() || newPassword.isEmpty()) {
            System.out.println("[PASSWORD] FAILED missing fields");
            System.out.println("──────────────────────────────");
            JsonUtil.sendResponse(exchange, 400, Map.of("success", false, "message", "All fields are required."));
            return;
        }

        if (newPassword.length() < 6) {
            System.out.println("[PASSWORD] FAILED new password too short");
            System.out.println("──────────────────────────────");
            JsonUtil.sendResponse(exchange, 400, Map.of("success", false, "message", "New password must be at least 6 characters."));
            return;
        }

        User user = userDAO.authenticate(username, oldPassword);
        if (user == null) {
            System.out.println("[PASSWORD] FAILED wrong old password");
            System.out.println("──────────────────────────────");
            JsonUtil.sendResponse(exchange, 401, Map.of("success", false, "message", "Current password is incorrect."));
            return;
        }

        try {
            String newHash = UserDAO.hashPassword(newPassword);
            boolean updated = userDAO.updatePassword(username, newHash);

            if (updated) {
                System.out.println("[PASSWORD] SUCCESS " + username);
                System.out.println("──────────────────────────────");
                JsonUtil.sendResponse(exchange, 200, Map.of("success", true, "message", "Password changed successfully."));
            } else {
                JsonUtil.sendResponse(exchange, 500, Map.of("success", false, "message", "Failed to update password."));
            }
        } catch (Exception e) {
            System.out.println("[PASSWORD] ERROR " + e.getMessage());
            System.out.println("──────────────────────────────");
            e.printStackTrace();
            JsonUtil.sendResponse(exchange, 500, Map.of("success", false, "message", "Server error."));
        }
    }

}
