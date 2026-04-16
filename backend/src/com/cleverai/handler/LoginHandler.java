package com.cleverai.handler;

import com.cleverai.dao.UserDAO;
import com.cleverai.model.User;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

public class LoginHandler implements HttpHandler {

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

        String username = params.getOrDefault("username", "");
        String password = params.getOrDefault("password", "");

        System.out.println("──────────────────────────────");
        System.out.println("[LOGIN] Attempt username: " + username);

        User user = userDAO.authenticate(username, password);

        if (user != null) {
            System.out.println("[LOGIN] SUCCESS " + user.getFullName() + " | role: " + user.getRole());
            System.out.println("──────────────────────────────");
            String json = "{\"success\":true,"
                        + "\"fullName\":\"" + user.getFullName() + "\","
                        + "\"role\":\"" + user.getRole() + "\","
                        + "\"isVerified\":" + user.isVerified() + "}";
            sendResponse(exchange, 200, json);
        } else {
            System.out.println("[LOGIN] FAILED wrong credentials");
            System.out.println("──────────────────────────────");
            sendResponse(exchange, 401, "{\"success\":false,\"message\":\"Invalid username or password.\"}");
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