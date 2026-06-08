package com.cleverai.handler;

import com.cleverai.dao.UserDAO;
import com.cleverai.model.User;
import com.cleverai.util.HandlerUtil;
import com.cleverai.util.JsonUtil;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;

public class LoginHandler implements HttpHandler {

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

        String username = params.getOrDefault("username", "");
        String password = params.getOrDefault("password", "");

        System.out.println("──────────────────────────────");
        System.out.println("[LOGIN] Attempt username: " + username);

        User user = userDAO.authenticate(username, password);

        if (user != null) {
            System.out.println("[LOGIN] SUCCESS " + user.getFullName() + " | role: " + user.getRole());
            System.out.println("──────────────────────────────");
            Map<String, Object> resp = new LinkedHashMap<>();
            resp.put("success", true);
            resp.put("fullName", user.getFullName());
            resp.put("email", user.getEmail());
            resp.put("role", user.getRole());
            resp.put("isVerified", user.isVerified());
            JsonUtil.sendResponse(exchange, 200, resp);
        } else {
            System.out.println("[LOGIN] FAILED wrong credentials");
            System.out.println("──────────────────────────────");
            JsonUtil.sendResponse(exchange, 401, Map.of("success", false, "message", "Invalid username or password."));
        }
    }
}