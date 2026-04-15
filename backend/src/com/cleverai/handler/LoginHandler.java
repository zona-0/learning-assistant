package com.cleverai.handler;

import com.cleverai.dao.UserDAO;
import com.cleverai.model.User;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import java.io.*;
import java.net.URLDecoder;
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

        User user = userDAO.authenticate(username, password);

        if (user != null) {
            String json = "{\"success\":true,\"message\":\"Login success!\","
                        + "\"fullName\":\"" + user.getFullName() + "\"}";
            sendResponse(exchange, 200, json);
        } else {
            String json = "{\"success\":false,\"message\":\"Username or password is incorrect.\"}";
            sendResponse(exchange, 401, json);
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
        body = body.replaceAll("[{}\"]", "");
        for (String pair : body.split(",")) {
            String[] kv = pair.split(":");
            if (kv.length == 2) map.put(kv[0].trim(), kv[1].trim());
        }
        return map;
    }
}