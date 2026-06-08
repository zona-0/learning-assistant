package com.cleverai.handler;

import com.cleverai.dao.SubjectDAO;
import com.cleverai.dao.UserDAO;
import com.cleverai.util.HandlerUtil;
import com.cleverai.util.JsonUtil;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.sql.SQLIntegrityConstraintViolationException;
import java.util.Map;

public class RegisterHandler implements HttpHandler {

    @Override
    public void handle(HttpExchange exchange) throws IOException {
        if (HandlerUtil.handleCors(exchange)) return;

        if (!"POST".equals(exchange.getRequestMethod())) {
            JsonUtil.sendResponse(exchange, 405, Map.of("error", "Method not allowed"));
            return;
        }

        String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
        Map<String, String> params = JsonUtil.parseBody(body);

        String fullName = params.getOrDefault("fullName", "").trim();
        String username = params.getOrDefault("username", "").trim();
        String email    = params.getOrDefault("email", "").trim();
        String password = params.getOrDefault("password", "");

        System.out.println("──────────────────────────────");
        System.out.println("[REGISTER] Attempt username: " + username + " | email: " + email);

        if (fullName.isEmpty() || username.isEmpty() || email.isEmpty() || password.isEmpty()) {
            System.out.println("[REGISTER] FAILED missing fields");
            System.out.println("──────────────────────────────");
            JsonUtil.sendResponse(exchange, 400, Map.of("success", false, "message", "All fields are required."));
            return;
        }

        if (password.length() < 6) {
            System.out.println("[REGISTER] FAILED password too short");
            System.out.println("──────────────────────────────");
            JsonUtil.sendResponse(exchange, 400, Map.of("success", false, "message", "Password must be at least 6 characters."));
            return;
        }

        try {
            String hash = UserDAO.hashPassword(password);
            UserDAO dao = new UserDAO();
            dao.register(username, email, hash, fullName);

            int userId = dao.findIdByUsername(username);
            if (userId > 0) {
                new SubjectDAO().seedDefaults(userId);
            }

            System.out.println("[REGISTER] SUCCESS " + fullName + " (" + username + ") | role: pelajar");
            System.out.println("──────────────────────────────");
            JsonUtil.sendResponse(exchange, 201, Map.of("success", true, "message", "Account created successfully."));

        } catch (SQLIntegrityConstraintViolationException e) {
            System.out.println("[REGISTER] FAILED duplicate: " + username);
            System.out.println("──────────────────────────────");
            JsonUtil.sendResponse(exchange, 409, Map.of("success", false, "message", "Username or email already exists."));
        } catch (Exception e) {
            System.out.println("[REGISTER] ERROR " + e.getMessage());
            System.out.println("──────────────────────────────");
            e.printStackTrace();
            JsonUtil.sendResponse(exchange, 500, Map.of("success", false, "message", "Server error. Please try again."));
        }
    }

}