package com.cleverai.dao;

import com.cleverai.util.Database;

import java.sql.*;

public class NoteDAO {

    public int saveNote(int userId, String title) {
        String sql = "INSERT INTO notes (user_id, title) VALUES (?, ?)";
        try (Connection conn = Database.getConnection();
                PreparedStatement ps = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            ps.setInt(1, userId);
            ps.setString(2, title.length() > 200 ? title.substring(0, 200) : title);
            ps.executeUpdate();
            ResultSet rs = ps.getGeneratedKeys();
            if (rs.next()) return rs.getInt(1);
        } catch (Exception e) {
            e.printStackTrace();
        }
        return -1;
    }

    public void logActivity(int userId, String action, String title) {
        String desc = action.equals("delete") ? "Deleted note \"" + title + "\"" : "Created note \"" + title + "\"";
        String sql = "INSERT INTO aktivitas_log (user_id, tipe, deskripsi) VALUES (?, 'notes', ?)";
        try (Connection conn = Database.getConnection();
                PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, userId);
            ps.setString(2, desc.length() > 255 ? desc.substring(0, 255) : desc);
            ps.executeUpdate();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public boolean deleteNote(int noteId, int userId) {
        String sql = "DELETE FROM notes WHERE id = ? AND user_id = ?";
        try (Connection conn = Database.getConnection();
                PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, noteId);
            ps.setInt(2, userId);
            return ps.executeUpdate() > 0;
        } catch (Exception e) {
            e.printStackTrace();
        }
        return false;
    }

    public int getNoteIdByTitle(int userId, String title) {
        String sql = "SELECT id FROM notes WHERE user_id = ? AND title = ? ORDER BY created_at DESC LIMIT 1";
        try (Connection conn = Database.getConnection();
                PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, userId);
            ps.setString(2, title.length() > 200 ? title.substring(0, 200) : title);
            ResultSet rs = ps.executeQuery();
            if (rs.next()) return rs.getInt(1);
        } catch (Exception e) {
            e.printStackTrace();
        }
        return -1;
    }
}
