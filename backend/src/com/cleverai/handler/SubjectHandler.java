package com.cleverai.handler;

import com.cleverai.dao.SubjectDAO;
import com.cleverai.dao.UserDAO;
import com.cleverai.model.Subject;
import com.cleverai.util.HandlerUtil;
import com.cleverai.util.JsonUtil;

import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

public class SubjectHandler implements HttpHandler {

    private final SubjectDAO subjectDAO = new SubjectDAO();
    private final UserDAO userDAO = new UserDAO();

    @Override
    public void handle(HttpExchange exchange) throws IOException {
        if (HandlerUtil.handleCors(exchange)) return;

        try {
            String method = exchange.getRequestMethod();
            String path = exchange.getRequestURI().getPath();

            if ("GET".equals(method)) {
                handleList(exchange);
            } else if ("POST".equals(method)) {
                handleAdd(exchange);
            } else if ("PUT".equals(method)) {
                handleUpdate(exchange);
            } else if ("DELETE".equals(method)) {
                handleDelete(exchange);
            } else {
                JsonUtil.sendResponse(exchange, 405, Map.of("error", "Method not allowed"));
            }
        } catch (Exception e) {
            e.printStackTrace();
            JsonUtil.sendResponse(exchange, 500, Map.of("success", false, "message", "Internal server error"));
        }
    }

    private int resolveUserId(String username) {
        return userDAO.findIdByUsername(username);
    }

    private void handleList(HttpExchange exchange) throws Exception {
        Map<String, String> params = HandlerUtil.queryToMap(exchange.getRequestURI().getQuery());
        String username = params.getOrDefault("username", "").trim();
        if (username.isEmpty()) {
            JsonUtil.sendResponse(exchange, 400, Map.of("error", "username is required"));
            return;
        }

        int userId = resolveUserId(username);
        if (userId < 0) {
            JsonUtil.sendResponse(exchange, 404, Map.of("error", "User not found"));
            return;
        }

        List<Subject> subjects = subjectDAO.listSubjects(userId);
        ObjectNode json = JsonUtil.createObject();
        json.put("success", true);
        ArrayNode arr = json.putArray("subjects");
        for (Subject s : subjects) {
            ObjectNode item = arr.addObject();
            item.put("id", s.getId());
            item.put("name", s.getName());
            item.put("color", s.getColor());
        }
        JsonUtil.sendResponse(exchange, 200, json);
    }

    private void handleAdd(HttpExchange exchange) throws Exception {
        String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
        Map<String, String> params = JsonUtil.parseBody(body);

        String username = params.getOrDefault("username", "").trim();
        String name = params.getOrDefault("name", "").trim();
        String color = params.getOrDefault("color", "#06b6d4").trim();

        if (username.isEmpty() || name.isEmpty()) {
            JsonUtil.sendResponse(exchange, 400, Map.of("error", "username and name are required"));
            return;
        }

        int userId = resolveUserId(username);
        if (userId < 0) {
            JsonUtil.sendResponse(exchange, 404, Map.of("error", "User not found"));
            return;
        }

        int id = subjectDAO.addSubject(userId, name, color);
        if (id < 0) {
            JsonUtil.sendResponse(exchange, 409, Map.of("success", false, "message", "Subject already exists or failed to create"));
            return;
        }

        JsonUtil.sendResponse(exchange, 201, Map.of("success", true, "id", id));
    }

    private void handleUpdate(HttpExchange exchange) throws Exception {
        String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
        Map<String, String> params = JsonUtil.parseBody(body);

        String username = params.getOrDefault("username", "").trim();
        int id = Integer.parseInt(params.getOrDefault("id", "0"));
        String name = params.getOrDefault("name", "").trim();
        String color = params.getOrDefault("color", "#06b6d4").trim();

        if (username.isEmpty() || id == 0 || name.isEmpty()) {
            JsonUtil.sendResponse(exchange, 400, Map.of("error", "username, id, and name are required"));
            return;
        }

        int userId = resolveUserId(username);
        if (userId < 0) {
            JsonUtil.sendResponse(exchange, 404, Map.of("error", "User not found"));
            return;
        }

        boolean ok = subjectDAO.updateSubject(id, userId, name, color);
        JsonUtil.sendResponse(exchange, ok ? 200 : 404, Map.of("success", ok));
    }

    private void handleDelete(HttpExchange exchange) throws Exception {
        String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
        Map<String, String> params = JsonUtil.parseBody(body);

        String username = params.getOrDefault("username", "").trim();
        int id = Integer.parseInt(params.getOrDefault("id", "0"));

        if (username.isEmpty() || id == 0) {
            JsonUtil.sendResponse(exchange, 400, Map.of("error", "username and id are required"));
            return;
        }

        int userId = resolveUserId(username);
        if (userId < 0) {
            JsonUtil.sendResponse(exchange, 404, Map.of("error", "User not found"));
            return;
        }

        boolean ok = subjectDAO.deleteSubject(id, userId);
        JsonUtil.sendResponse(exchange, ok ? 200 : 404, Map.of("success", ok));
    }
}
