package com.cleverai.dao;

import com.cleverai.model.Subject;
import com.cleverai.util.Database;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;

public class SubjectDAO {

    private static final String[][] DEFAULTS = {
        {"Mathematics", "#06b6d4"},
        {"Science", "#f59e0b"},
        {"Language", "#f43f5e"},
        {"History", "#a78bfa"}
    };

    public List<Subject> listSubjects(int userId) {
        List<Subject> list = new ArrayList<>();
        String sql = "SELECT id, user_id, name, color FROM subjects WHERE user_id = ? ORDER BY id ASC";
        try (Connection conn = Database.getConnection();
                PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, userId);
            ResultSet rs = ps.executeQuery();
            while (rs.next()) {
                list.add(new Subject(
                        rs.getInt("id"),
                        rs.getInt("user_id"),
                        rs.getString("name"),
                        rs.getString("color")));
            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        if (list.isEmpty()) {
            seedDefaults(userId);
            return listSubjects(userId);
        }

        return list;
    }

    public void seedDefaults(int userId) {
        String sql = "INSERT IGNORE INTO subjects (user_id, name, color) VALUES (?, ?, ?)";
        try (Connection conn = Database.getConnection();
                PreparedStatement ps = conn.prepareStatement(sql)) {
            for (String[] def : DEFAULTS) {
                ps.setInt(1, userId);
                ps.setString(2, def[0]);
                ps.setString(3, def[1]);
                ps.addBatch();
            }
            ps.executeBatch();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public int addSubject(int userId, String name, String color) {
        String sql = "INSERT INTO subjects (user_id, name, color) VALUES (?, ?, ?)";
        try (Connection conn = Database.getConnection();
                PreparedStatement ps = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            ps.setInt(1, userId);
            ps.setString(2, name);
            ps.setString(3, color);
            ps.executeUpdate();
            ResultSet rs = ps.getGeneratedKeys();
            if (rs.next()) return rs.getInt(1);
        } catch (Exception e) {
            e.printStackTrace();
        }
        return -1;
    }

    public boolean updateSubject(int id, int userId, String name, String color) {
        String sql = "UPDATE subjects SET name = ?, color = ? WHERE id = ? AND user_id = ?";
        try (Connection conn = Database.getConnection();
                PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, name);
            ps.setString(2, color);
            ps.setInt(3, id);
            ps.setInt(4, userId);
            return ps.executeUpdate() > 0;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    public boolean deleteSubject(int id, int userId) {
        String sql = "DELETE FROM subjects WHERE id = ? AND user_id = ?";
        try (Connection conn = Database.getConnection();
                PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, id);
            ps.setInt(2, userId);
            return ps.executeUpdate() > 0;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }
}
