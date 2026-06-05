package com.cleverai.dao;

import com.cleverai.util.Database;
import com.fasterxml.jackson.databind.JsonNode;

import java.sql.*;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class QuizResultDAO {

    public int saveQuizResult(int userId, String subject, String topic, int score, int totalQuestions, String questionsData) {
        String sql = "INSERT INTO quiz_results (user_id, subject, topic, score, total_questions, questions_data) VALUES (?, ?, ?, ?, ?, ?)";
        try (Connection conn = Database.getConnection();
                PreparedStatement ps = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            ps.setInt(1, userId);
            ps.setString(2, subject);
            ps.setString(3, topic);
            ps.setInt(4, score);
            ps.setInt(5, totalQuestions);
            ps.setString(6, questionsData);
            ps.executeUpdate();
            ResultSet rs = ps.getGeneratedKeys();
            if (rs.next()) return rs.getInt(1);
        } catch (Exception e) {
            e.printStackTrace();
        }
        return -1;
    }

    public List<Map<String, Object>> getQuizHistory(int userId) {
        List<Map<String, Object>> list = new ArrayList<>();
        String sql = "SELECT id, subject, topic, score, total_questions, created_at FROM quiz_results WHERE user_id = ? ORDER BY created_at DESC";
        try (Connection conn = Database.getConnection();
                PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, userId);
            ResultSet rs = ps.executeQuery();
            while (rs.next()) {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", rs.getInt("id"));
                m.put("subject", rs.getString("subject"));
                m.put("topic", rs.getString("topic"));
                m.put("score", rs.getInt("score"));
                m.put("totalQuestions", rs.getInt("total_questions"));
                m.put("date", rs.getString("created_at"));
                list.add(m);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return list;
    }

    public Map<String, Object> getQuizAttempt(int attemptId) {
        String sql = "SELECT id, user_id, subject, topic, score, total_questions, questions_data, created_at FROM quiz_results WHERE id = ?";
        try (Connection conn = Database.getConnection();
                PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, attemptId);
            ResultSet rs = ps.executeQuery();
            if (rs.next()) {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", rs.getInt("id"));
                m.put("userId", rs.getInt("user_id"));
                m.put("subject", rs.getString("subject"));
                m.put("topic", rs.getString("topic"));
                m.put("score", rs.getInt("score"));
                m.put("totalQuestions", rs.getInt("total_questions"));
                m.put("date", rs.getString("created_at"));
                String qd = rs.getString("questions_data");
                m.put("questionsData", qd);
                return m;
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return null;
    }
}
