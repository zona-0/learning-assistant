package com.cleverai.util;

import java.sql.*;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.Map;


public class RateLimitUtil {

    private static final int TUTOR_MAX = 20;
    private static final int TUTOR_WINDOW_HOURS = 6;

    private static final int QUIZ_MAX = 5;

    public static Map<String, Object> checkTutorLimit(int userId) {
        Map<String, Object> result = new LinkedHashMap<>();

        String role = getUserRole(userId);
        if ("admin".equals(role)) {
            result.put("allowed", true);
            result.put("remaining", -1);
            result.put("message", "");
            return result;
        }

        String sql = "SELECT COUNT(*) AS cnt FROM chat_history "
                   + "WHERE user_id = ? AND role = 'user' "
                   + "AND created_at >= DATE_SUB(NOW(), INTERVAL ? HOUR)";

        try (Connection conn = Database.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, userId);
            ps.setInt(2, TUTOR_WINDOW_HOURS);
            ResultSet rs = ps.executeQuery();

            int count = 0;
            if (rs.next()) {
                count = rs.getInt("cnt");
            }

            int remaining = Math.max(0, TUTOR_MAX - count);

            if (count >= TUTOR_MAX) {
                result.put("allowed", false);
                result.put("remaining", 0);
                result.put("limit", TUTOR_MAX);
                result.put("windowHours", TUTOR_WINDOW_HOURS);
                result.put("used", count);
                result.put("message", "You have reached the limit of " + TUTOR_MAX
                        + " chats in " + TUTOR_WINDOW_HOURS + " hours. Please try again later.");

                String resetTime = getOldestMessageTime(userId, TUTOR_WINDOW_HOURS);
                if (resetTime != null) {
                    result.put("resetAt", resetTime);
                }
            } else {
                result.put("allowed", true);
                result.put("remaining", remaining);
                result.put("limit", TUTOR_MAX);
                result.put("windowHours", TUTOR_WINDOW_HOURS);
                result.put("used", count);
                result.put("message", "");
            }

        } catch (Exception e) {
            e.printStackTrace();

            result.put("allowed", true);
            result.put("remaining", -1);
            result.put("message", "");
        }

        return result;
    }

    public static Map<String, Object> checkQuizLimit(int userId) {
        Map<String, Object> result = new LinkedHashMap<>();

        String role = getUserRole(userId);
        if ("admin".equals(role)) {
            result.put("allowed", true);
            result.put("remaining", -1);
            result.put("message", "");
            return result;
        }

        String sql = "SELECT COUNT(*) AS cnt FROM quiz_results "
                   + "WHERE user_id = ? AND DATE(created_at) = CURDATE()";

        try (Connection conn = Database.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, userId);
            ResultSet rs = ps.executeQuery();

            int count = 0;
            if (rs.next()) {
                count = rs.getInt("cnt");
            }

            int remaining = Math.max(0, QUIZ_MAX - count);

            if (count >= QUIZ_MAX) {
                result.put("allowed", false);
                result.put("remaining", 0);
                result.put("limit", QUIZ_MAX);
                result.put("used", count);
                result.put("message", "You have used all " + QUIZ_MAX
                        + " quizzes for today. Please try again tomorrow.");
            } else {
                result.put("allowed", true);
                result.put("remaining", remaining);
                result.put("limit", QUIZ_MAX);
                result.put("used", count);
                result.put("message", "");
            }

        } catch (Exception e) {
            e.printStackTrace();
            result.put("allowed", true);
            result.put("remaining", -1);
            result.put("message", "");
        }

        return result;
    }

    public static String getUserRole(int userId) {
        String sql = "SELECT role FROM users WHERE id = ?";
        try (Connection conn = Database.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, userId);
            ResultSet rs = ps.executeQuery();
            if (rs.next()) {
                return rs.getString("role");
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return "pelajar"; 
    }

    public static int getUserIdByUsername(String username) {
        String sql = "SELECT id FROM users WHERE username = ?";
        try (Connection conn = Database.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, username);
            ResultSet rs = ps.executeQuery();
            if (rs.next()) return rs.getInt("id");
        } catch (Exception e) {
            e.printStackTrace();
        }
        return -1;
    }

    private static String getOldestMessageTime(int userId, int windowHours) {
        String sql = "SELECT created_at FROM chat_history "
                   + "WHERE user_id = ? AND role = 'user' "
                   + "AND created_at >= DATE_SUB(NOW(), INTERVAL ? HOUR) "
                   + "ORDER BY created_at ASC LIMIT 1";
        try (Connection conn = Database.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, userId);
            ps.setInt(2, windowHours);
            ResultSet rs = ps.executeQuery();
            if (rs.next()) {
                Timestamp ts = rs.getTimestamp("created_at");
                if (ts != null) {
                    LocalDateTime resetTime = ts.toLocalDateTime().plusHours(windowHours);
                    return resetTime.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return null;
    }
}
