package com.cleverai.handler;

import com.cleverai.dao.DashboardDAO;
import com.cleverai.dao.HistoryPomodoroDAO;
import com.cleverai.model.*;
import com.cleverai.util.JsonUtil;

import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.sun.net.httpserver.HttpExchange;

import java.util.List;
import java.util.Map;

public class DashboardHandler extends BaseHandler {

    private final DashboardDAO dashboardDAO = new DashboardDAO();
    private final HistoryPomodoroDAO historyPomodoroDAO = new HistoryPomodoroDAO();

    @Override
    protected void processRequest(HttpExchange exchange) throws Exception {
        if (!"GET".equals(exchange.getRequestMethod())) {
            JsonUtil.sendResponse(exchange, 405, Map.of("success", false, "message", "Method not allowed"));
            return;
        }

        String path = exchange.getRequestURI().getPath();
        Map<String, String> params = queryToMap(exchange.getRequestURI().getQuery());
        String username = params.getOrDefault("username", "");

        if (username.isEmpty()) {
            JsonUtil.sendResponse(exchange, 400, Map.of("success", false, "message", "Username is required"));
            return;
        }

        User user = dashboardDAO.findByUsername(username);
        if (user == null) {
            JsonUtil.sendResponse(exchange, 404, Map.of("success", false, "message", "User not found"));
            return;
        }

        Dashboard dashboard = new Dashboard(user);

        System.out.println("──────────────────────────────");
        System.out.println("[DASHBOARD] Request: " + path + " | user: " + username);

        if (path.endsWith("/stats")) {
            handleStats(exchange, dashboard);
        } else if (path.endsWith("/activities")) {
            int limit = parseIntParam(params, "limit", 6);
            handleActivities(exchange, dashboard, limit);
        } else if (path.endsWith("/deadlines")) {
            int days = parseIntParam(params, "days", 7);
            handleDeadlines(exchange, dashboard, days);
        } else if (path.endsWith("/summary")) {
            handleSummary(exchange, dashboard);
        } else {
            JsonUtil.sendResponse(exchange, 404, Map.of("success", false, "message", "Endpoint not found"));
        }

        System.out.println("──────────────────────────────");
    }

    private void handleStats(HttpExchange exchange, Dashboard dashboard) throws Exception {
        dashboard.refreshStatistik();

        int userId = dashboard.getUser().getId();

        List<Double> weeklyFocus = historyPomodoroDAO.getWeeklyFocusHours(userId);
        List<Double> weeklyBreak = historyPomodoroDAO.getWeeklyBreakHours(userId);
        List<Integer> weeklyStreak = historyPomodoroDAO.getWeeklyStreak(userId);
        List<Integer> quizScores = dashboardDAO.getRecentQuizScores(userId, 6);

        ObjectNode json = JsonUtil.createObject();
        json.put("success", true);
        json.put("totalSesiPomodoro", dashboard.getTotalSesiPomodoro());
        json.put("totalNotes", dashboard.getTotalNotes());
        json.put("totalDeadline", dashboard.getTotalDeadline());
        json.put("totalFocusHours", Double.parseDouble(String.format("%.1f", dashboard.getTotalFocusHours())));
        json.put("quizScoreAvg", Double.parseDouble(String.format("%.0f", dashboard.getQuizScoreAvg())));

        json.set("weeklyFocus", makeDoubleArray(weeklyFocus));
        json.set("weeklyBreak", makeDoubleArray(weeklyBreak));
        json.set("weeklyStreak", makeIntArray(weeklyStreak));
        json.set("quizScores", makeIntArray(quizScores));

        System.out.println("[DASHBOARD] Stats sent for userId=" + dashboard.getUser().getId());
        JsonUtil.sendResponse(exchange, 200, json);
    }

    private void handleActivities(HttpExchange exchange, Dashboard dashboard, int limit) throws Exception {
        List<Aktivitas> activities = dashboard.ambilAktivitasTerbaru();

        ObjectNode json = JsonUtil.createObject();
        json.put("success", true);
        ArrayNode arr = json.putArray("activities");

        for (Aktivitas a : activities) {
            ObjectNode item = arr.addObject();
            item.put("id", a.getId());
            item.put("tipe", a.getTipe());
            item.put("deskripsi", a.getDeskripsi());
            item.put("waktu", a.getWaktu());
        }

        System.out.println("[DASHBOARD] Activities: " + activities.size() + " items");
        JsonUtil.sendResponse(exchange, 200, json);
    }

    private void handleDeadlines(HttpExchange exchange, Dashboard dashboard, int days) throws Exception {
        List<Deadline> deadlines = dashboard.dapatkanDeadlineTerdekat(days);

        ObjectNode json = JsonUtil.createObject();
        json.put("success", true);
        ArrayNode arr = json.putArray("deadlines");

        for (Deadline d : deadlines) {
            ObjectNode item = arr.addObject();
            item.put("id", d.getId());
            item.put("title", d.getTitle());
            item.put("description", d.getDescription() != null ? d.getDescription() : "");
            item.put("dueDate", d.getDueDate());
            item.put("isCompleted", d.isCompleted());
        }

        System.out.println("[DASHBOARD] Deadlines: " + deadlines.size() + " items (next " + days + " days)");
        JsonUtil.sendResponse(exchange, 200, json);
    }

    private void handleSummary(HttpExchange exchange, Dashboard dashboard) throws Exception {
        Ringkasan r = dashboard.generateRingkasanHarian();

        ObjectNode summary = JsonUtil.createObject();
        summary.put("totalFokusHariIni", Double.parseDouble(String.format("%.1f", r.getTotalFokusHariIni())));
        summary.put("totalSesiHariIni", r.getTotalSesiHariIni());
        summary.put("totalNotesHariIni", r.getTotalNotesHariIni());
        summary.put("totalQuizHariIni", r.getTotalQuizHariIni());
        summary.put("deadlineMendekati", r.getDeadlineMendekati());

        ObjectNode json = JsonUtil.createObject();
        json.put("success", true);
        json.set("summary", summary);

        System.out.println("[DASHBOARD] Summary: " + r.toString());
        JsonUtil.sendResponse(exchange, 200, json);
    }

    private int parseIntParam(Map<String, String> params, String key, int defaultVal) {
        try {
            return Integer.parseInt(params.getOrDefault(key, String.valueOf(defaultVal)));
        } catch (NumberFormatException e) {
            return defaultVal;
        }
    }

    private ArrayNode makeDoubleArray(List<Double> list) {
        ArrayNode arr = JsonUtil.createArray();
        for (Double v : list) {
            arr.add(v != null ? Double.parseDouble(String.format("%.2f", v)) : 0.0);
        }
        return arr;
    }

    private ArrayNode makeIntArray(List<Integer> list) {
        ArrayNode arr = JsonUtil.createArray();
        for (Integer v : list) {
            arr.add(v != null ? v : 0);
        }
        return arr;
    }
}