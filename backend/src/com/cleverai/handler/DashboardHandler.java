package com.cleverai.handler;

import com.cleverai.dao.DashboardDAO;
import com.cleverai.dao.HistoryPomodoroDAO;
import com.cleverai.model.*;

import com.sun.net.httpserver.HttpExchange;

import java.util.List;
import java.util.Map;

public class DashboardHandler extends BaseHandler {

    private final DashboardDAO dashboardDAO = new DashboardDAO();
    private final HistoryPomodoroDAO historyPomodoroDAO = new HistoryPomodoroDAO();

    @Override
    protected void processRequest(HttpExchange exchange) throws Exception {
        if (!"GET".equals(exchange.getRequestMethod())) {
            sendResponse(exchange, 405, "{\"success\":false,\"message\":\"Method not allowed\"}");
            return;
        }

        String path = exchange.getRequestURI().getPath();
        Map<String, String> params = queryToMap(exchange.getRequestURI().getQuery());
        String username = params.getOrDefault("username", "");

        if (username.isEmpty()) {
            sendResponse(exchange, 400, "{\"success\":false,\"message\":\"Username is required\"}");
            return;
        }

        User user = dashboardDAO.findByUsername(username);
        if (user == null) {
            sendResponse(exchange, 404, "{\"success\":false,\"message\":\"User not found\"}");
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
            sendResponse(exchange, 404, "{\"success\":false,\"message\":\"Endpoint not found\"}");
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

        StringBuilder json = new StringBuilder();
        json.append("{");
        json.append("\"success\":true,");
        json.append("\"totalSesiPomodoro\":").append(dashboard.getTotalSesiPomodoro()).append(",");
        json.append("\"totalNotes\":").append(dashboard.getTotalNotes()).append(",");
        json.append("\"totalDeadline\":").append(dashboard.getTotalDeadline()).append(",");
        json.append("\"totalFocusHours\":").append(String.format("%.1f", dashboard.getTotalFocusHours())).append(",");
        json.append("\"quizScoreAvg\":").append(String.format("%.0f", dashboard.getQuizScoreAvg())).append(",");
        json.append("\"weeklyFocus\":").append(doubleListToJson(weeklyFocus)).append(",");
        json.append("\"weeklyBreak\":").append(doubleListToJson(weeklyBreak)).append(",");
        json.append("\"weeklyStreak\":").append(intListToJson(weeklyStreak)).append(",");
        json.append("\"quizScores\":").append(intListToJson(quizScores));
        json.append("}");

        System.out.println("[DASHBOARD] Stats sent for userId=" + dashboard.getUser().getId());
        sendResponse(exchange, 200, json.toString());
    }

    private void handleActivities(HttpExchange exchange, Dashboard dashboard, int limit) throws Exception {
        List<Aktivitas> activities = dashboard.ambilAktivitasTerbaru();

        StringBuilder json = new StringBuilder();
        json.append("{\"success\":true,\"activities\":[");

        for (int i = 0; i < activities.size(); i++) {
            Aktivitas a = activities.get(i);
            if (i > 0)
                json.append(",");
            json.append("{");
            json.append("\"id\":").append(a.getId()).append(",");
            json.append("\"tipe\":\"").append(escapeJson(a.getTipe())).append("\",");
            json.append("\"deskripsi\":\"").append(escapeJson(a.getDeskripsi())).append("\",");
            json.append("\"waktu\":\"").append(escapeJson(a.getWaktu())).append("\"");
            json.append("}");
        }

        json.append("]}");

        System.out.println("[DASHBOARD] Activities: " + activities.size() + " items");
        sendResponse(exchange, 200, json.toString());
    }

    private void handleDeadlines(HttpExchange exchange, Dashboard dashboard, int days) throws Exception {
        List<Deadline> deadlines = dashboard.dapatkanDeadlineTerdekat(days);

        StringBuilder json = new StringBuilder();
        json.append("{\"success\":true,\"deadlines\":[");

        for (int i = 0; i < deadlines.size(); i++) {
            Deadline d = deadlines.get(i);
            if (i > 0)
                json.append(",");
            json.append("{");
            json.append("\"id\":").append(d.getId()).append(",");
            json.append("\"title\":\"").append(escapeJson(d.getTitle())).append("\",");
            json.append("\"description\":\"").append(escapeJson(d.getDescription() != null ? d.getDescription() : ""))
                    .append("\",");
            json.append("\"dueDate\":\"").append(escapeJson(d.getDueDate())).append("\",");
            json.append("\"isCompleted\":").append(d.isCompleted());
            json.append("}");
        }

        json.append("]}");

        System.out.println("[DASHBOARD] Deadlines: " + deadlines.size() + " items (next " + days + " days)");
        sendResponse(exchange, 200, json.toString());
    }

    private void handleSummary(HttpExchange exchange, Dashboard dashboard) throws Exception {
        Ringkasan r = dashboard.generateRingkasanHarian();

        StringBuilder json = new StringBuilder();
        json.append("{\"success\":true,\"summary\":{");
        json.append("\"totalFokusHariIni\":").append(String.format("%.1f", r.getTotalFokusHariIni())).append(",");
        json.append("\"totalSesiHariIni\":").append(r.getTotalSesiHariIni()).append(",");
        json.append("\"totalNotesHariIni\":").append(r.getTotalNotesHariIni()).append(",");
        json.append("\"totalQuizHariIni\":").append(r.getTotalQuizHariIni()).append(",");
        json.append("\"deadlineMendekati\":").append(r.getDeadlineMendekati());
        json.append("}}");

        System.out.println("[DASHBOARD] Summary: " + r.toString());
        sendResponse(exchange, 200, json.toString());
    }

    private int parseIntParam(Map<String, String> params, String key, int defaultVal) {
        try {
            return Integer.parseInt(params.getOrDefault(key, String.valueOf(defaultVal)));
        } catch (NumberFormatException e) {
            return defaultVal;
        }
    }

    private String doubleListToJson(List<Double> list) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < list.size(); i++) {
            if (i > 0)
                sb.append(",");
            sb.append(String.format("%.2f", list.get(i)));
        }
        sb.append("]");
        return sb.toString();
    }

    private String intListToJson(List<Integer> list) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < list.size(); i++) {
            if (i > 0)
                sb.append(",");
            sb.append(list.get(i));
        }
        sb.append("]");
        return sb.toString();
    }

    private String escapeJson(String s) {
        if (s == null)
            return "";
        return s.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");
    }
}