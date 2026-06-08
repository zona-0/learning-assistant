package com.cleverai.handler;

import com.cleverai.dao.DashboardDAO;
import com.cleverai.dao.HistoryPomodoroDAO;
import com.cleverai.dao.SubjectDAO;
import com.cleverai.model.*;
import com.cleverai.util.HandlerUtil;
import com.cleverai.util.JsonUtil;

import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import java.io.IOException;
import java.util.List;
import java.util.Map;

public class DashboardHandler implements HttpHandler {

    private final DashboardDAO dashboardDAO = new DashboardDAO();
    private final HistoryPomodoroDAO historyPomodoroDAO = new HistoryPomodoroDAO();

    @Override
    public void handle(HttpExchange exchange) throws IOException {
        if (HandlerUtil.handleCors(exchange)) return;

        try {
            doProcess(exchange);
        } catch (Exception e) {
            e.printStackTrace();
            JsonUtil.sendResponse(exchange, 500, Map.of("success", false, "message", "Internal server error"));
        }
    }

    private void doProcess(HttpExchange exchange) throws Exception {
        if (!"GET".equals(exchange.getRequestMethod())) {
            JsonUtil.sendResponse(exchange, 405, Map.of("success", false, "message", "Method not allowed"));
            return;
        }

        String path = exchange.getRequestURI().getPath();
        Map<String, String> params = HandlerUtil.queryToMap(exchange.getRequestURI().getQuery());
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
        } else if (path.endsWith("/summary")) {
            handleSummary(exchange, dashboard);
        } else {
            JsonUtil.sendResponse(exchange, 404, Map.of("success", false, "message", "Endpoint not found"));
        }

        System.out.println("──────────────────────────────");
    }

    private void handleStats(HttpExchange exchange, Dashboard dashboard) throws Exception {
        dashboard.refreshStatistik();

        String query = exchange.getRequestURI().getQuery();
        Map<String, String> allParams = HandlerUtil.queryToMap(query);
        String period = allParams.getOrDefault("period", "week");

        int userId = dashboard.getUser().getId();

        List<Double> focusData;
        List<Double> breakData;
        List<Integer> streakData;

        switch (period) {
            case "month":
                focusData = historyPomodoroDAO.getMonthlyFocusHours(userId);
                breakData = historyPomodoroDAO.getMonthlyBreakHours(userId);
                streakData = historyPomodoroDAO.getMonthlySessions(userId);
                break;
            case "year":
                focusData = historyPomodoroDAO.getYearlyFocusHours(userId);
                breakData = historyPomodoroDAO.getYearlyBreakHours(userId);
                streakData = historyPomodoroDAO.getYearlySessions(userId);
                break;
            default:
                focusData = historyPomodoroDAO.getWeeklyFocusHours(userId);
                breakData = historyPomodoroDAO.getWeeklyBreakHours(userId);
                streakData = historyPomodoroDAO.getWeeklyStreak(userId);
                break;
        }

        List<Integer> quizScores = dashboardDAO.getRecentQuizScores(userId, 6);
        Map<String, Object> todayStats = historyPomodoroDAO.getTodayStats(userId);
        int currentStreak = (int) todayStats.getOrDefault("streak", 0);

        double focusActual = dashboardDAO.getCurrentPeriodFocusHours(userId, period);
        int quizActual = dashboardDAO.getCurrentPeriodQuizCount(userId, period);
        int noteActual = dashboardDAO.getCurrentPeriodNoteCount(userId, period);

        Map<String, Object> goal = getUserGoal(userId, period);

        ObjectNode json = JsonUtil.createObject();
        json.put("success", true);
        json.put("totalSesiPomodoro", dashboard.getTotalSesiPomodoro());
        json.put("totalNotes", dashboard.getTotalNotes());
        json.put("totalFocusHours", Math.round(dashboard.getTotalFocusHours() * 10) / 10.0);
        json.put("quizScoreAvg", (double) Math.round(dashboard.getQuizScoreAvg()));
        json.put("currentStreak", currentStreak);

        json.set("weeklyFocus", makeDoubleArray(focusData));
        json.set("weeklyBreak", makeDoubleArray(breakData));
        json.set("weeklyStreak", makeIntArray(streakData));
        json.set("quizScores", makeIntArray(quizScores));

        ObjectNode progress = json.putObject("progress");
        progress.put("period", period);
        progress.put("focusHours", Math.round(focusActual * 10) / 10.0);
        progress.put("quizzes", quizActual);
        progress.put("notes", noteActual);
        double focusGoal = ((Number) goal.getOrDefault("focusGoal", 10)).doubleValue();
        int quizGoal = ((Number) goal.getOrDefault("quizGoal", 5)).intValue();
        int notesGoal = ((Number) goal.getOrDefault("notesGoal", 7)).intValue();
        progress.put("focusGoal", focusGoal);
        progress.put("quizGoal", quizGoal);
        progress.put("notesGoal", notesGoal);

        List<Subject> userSubjects = new SubjectDAO().listSubjects(userId);
        Map<String, Integer> subjectDist = dashboardDAO.getSubjectDistribution(userId);
        ArrayNode subjectsArr = JsonUtil.createArray();
        for (Subject s : userSubjects) {
            ObjectNode item = subjectsArr.addObject();
            item.put("name", s.getName());
            item.put("color", s.getColor());
            item.put("count", subjectDist.getOrDefault(s.getName(), 0));
        }
        json.set("subjects", subjectsArr);

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

    private void handleSummary(HttpExchange exchange, Dashboard dashboard) throws Exception {
        Ringkasan r = dashboard.generateRingkasanHarian();

        ObjectNode summary = JsonUtil.createObject();
        summary.put("totalFokusHariIni", Math.round(r.getTotalFokusHariIni() * 10) / 10.0);
        summary.put("totalSesiHariIni", r.getTotalSesiHariIni());
        summary.put("totalNotesHariIni", r.getTotalNotesHariIni());
        summary.put("totalQuizHariIni", r.getTotalQuizHariIni());
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

    private Map<String, Object> getUserGoal(int userId, String period) {
        Map<String, Object> goal = new java.util.HashMap<>();
        String sql = "SELECT focus_goal, quiz_goal, notes_goal FROM user_goals WHERE user_id = ? AND period = ?";
        try (java.sql.Connection conn = com.cleverai.util.Database.getConnection();
                java.sql.PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, userId);
            ps.setString(2, period);
            java.sql.ResultSet rs = ps.executeQuery();
            if (rs.next()) {
                goal.put("focusGoal", rs.getDouble("focus_goal"));
                goal.put("quizGoal", rs.getInt("quiz_goal"));
                goal.put("notesGoal", rs.getInt("notes_goal"));
                return goal;
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        goal.put("focusGoal", period.equals("month") ? 40 : period.equals("year") ? 480 : 10);
        goal.put("quizGoal", period.equals("month") ? 20 : period.equals("year") ? 240 : 5);
        goal.put("notesGoal", period.equals("month") ? 28 : period.equals("year") ? 336 : 7);
        return goal;
    }

    private ArrayNode makeDoubleArray(List<Double> list) {
        ArrayNode arr = JsonUtil.createArray();
        for (Double v : list) {
            arr.add(v != null ? Math.round(v * 100) / 100.0 : 0.0);
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