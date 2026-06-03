package com.cleverai.dao;

import com.cleverai.model.ChatMessage;
import com.cleverai.model.ChatSession;
import com.cleverai.util.Database;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;

public class ChatHistoryDAO {

    public int getUserIdByUsername(String username) {
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

    public int createSession(int userId, String title) {
        String sql = "INSERT INTO chat_sessions (user_id, title) VALUES (?, ?)";
        try (Connection conn = Database.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            ps.setInt(1, userId);
            ps.setString(2, title);
            ps.executeUpdate();
            ResultSet rs = ps.getGeneratedKeys();
            if (rs.next()) return rs.getInt(1);
        } catch (Exception e) {
            e.printStackTrace();
        }
        return -1;
    }

    public List<ChatSession> getSessions(int userId) {
        List<ChatSession> sessions = new ArrayList<>();
        String sql = "SELECT id, user_id, title, created_at, updated_at FROM chat_sessions "
                   + "WHERE user_id = ? ORDER BY updated_at DESC LIMIT 50";
        try (Connection conn = Database.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, userId);
            ResultSet rs = ps.executeQuery();
            while (rs.next()) {
                sessions.add(new ChatSession(
                    rs.getInt("id"),
                    rs.getInt("user_id"),
                    rs.getString("title"),
                    rs.getString("created_at"),
                    rs.getString("updated_at")
                ));
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return sessions;
    }

    public boolean updateSessionTitle(int sessionId, String title) {
        String sql = "UPDATE chat_sessions SET title = ? WHERE id = ?";
        try (Connection conn = Database.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, title);
            ps.setInt(2, sessionId);
            ps.executeUpdate();
            return true;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    public boolean deleteSession(int userId, int sessionId) {
        String sql = "DELETE FROM chat_sessions WHERE id = ? AND user_id = ?";
        try (Connection conn = Database.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, sessionId);
            ps.setInt(2, userId);
            ps.executeUpdate();
            return true;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    public List<ChatMessage> getHistory(int userId, int sessionId) {
        List<ChatMessage> messages = new ArrayList<>();
        String sql = "SELECT id, user_id, role, message, created_at FROM chat_history "
                   + "WHERE user_id = ? AND session_id = ? ORDER BY created_at ASC LIMIT 100";
        try (Connection conn = Database.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, userId);
            ps.setInt(2, sessionId);
            ResultSet rs = ps.executeQuery();
            while (rs.next()) {
                messages.add(new ChatMessage(
                    rs.getInt("id"),
                    rs.getInt("user_id"),
                    rs.getString("role"),
                    rs.getString("message"),
                    rs.getString("created_at")
                ));
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return messages;
    }

    public boolean saveMessage(int userId, int sessionId, String role, String message) {
        String sql = "INSERT INTO chat_history (user_id, session_id, role, message) VALUES (?, ?, ?, ?)";
        try (Connection conn = Database.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, userId);
            ps.setInt(2, sessionId);
            ps.setString(3, role);
            ps.setString(4, message);
            ps.executeUpdate();
            return true;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    public boolean clearHistory(int userId) {
        String sql = "DELETE FROM chat_history WHERE user_id = ?";
        try (Connection conn = Database.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, userId);
            ps.executeUpdate();
            return true;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }
}
