package com.cleverai.dao;

import com.cleverai.model.Aktivitas;
import com.cleverai.model.Deadline;
import com.cleverai.model.Ringkasan;
import com.cleverai.model.User;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;

public class DashboardDAO extends AbstractDAO {

    @Override
    protected String getTableName() {
        return "aktivitas_log";
    }

    public User findByUsername(String username) {
        String sql = "SELECT id, username, email, full_name, role, is_verified "
                + "FROM users WHERE username = ?";
        try (Connection conn = getConnection();
                PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, username);
            ResultSet rs = ps.executeQuery();
            if (rs.next()) {
                return new User(
                        rs.getInt("id"),
                        rs.getString("username"),
                        rs.getString("email"),
                        rs.getString("full_name"),
                        rs.getString("role"),
                        rs.getBoolean("is_verified"));
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return null;
    }


    public int countNotesByUser(int userId) {
        String sql = "SELECT COUNT(*) FROM notes WHERE user_id = ?";
        try (Connection conn = getConnection();
                PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, userId);
            ResultSet rs = ps.executeQuery();
            if (rs.next())
                return rs.getInt(1);
        } catch (Exception e) {
            e.printStackTrace();
        }
        return 0;
    }

    public int countDeadlinesByUser(int userId) {
        String sql = "SELECT COUNT(*) FROM deadlines WHERE user_id = ? AND is_completed = FALSE";
        try (Connection conn = getConnection();
                PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, userId);
            ResultSet rs = ps.executeQuery();
            if (rs.next())
                return rs.getInt(1);
        } catch (Exception e) {
            e.printStackTrace();
        }
        return 0;
    }


    public double getTotalFocusHours(int userId) {
        String sql = "SELECT COALESCE(SUM(durasi_menit), 0) / 60.0 "
                + "FROM history_pomodoro WHERE user_id = ? AND mode_pomo = 'focus'";
        try (Connection conn = getConnection();
                PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, userId);
            ResultSet rs = ps.executeQuery();
            if (rs.next())
                return rs.getDouble(1);
        } catch (Exception e) {
            e.printStackTrace();
        }
        return 0.0;
    }

    public double getQuizScoreAvg(int userId) {
        String sql = "SELECT COALESCE(AVG(score), 0) FROM quiz_results WHERE user_id = ?";
        try (Connection conn = getConnection();
                PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, userId);
            ResultSet rs = ps.executeQuery();
            if (rs.next())
                return rs.getDouble(1);
        } catch (Exception e) {
            e.printStackTrace();
        }
        return 0.0;
    }


    public List<Aktivitas> getAktivitasTerbaru(int userId, int limit) {
        List<Aktivitas> list = new ArrayList<>();
        String sql = "SELECT id, user_id, tipe, deskripsi, created_at "
                + "FROM aktivitas_log WHERE user_id = ? "
                + "ORDER BY created_at DESC LIMIT ?";
        try (Connection conn = getConnection();
                PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, userId);
            ps.setInt(2, limit);
            ResultSet rs = ps.executeQuery();
            while (rs.next()) {
                list.add(new Aktivitas(
                        rs.getInt("id"),
                        rs.getInt("user_id"),
                        rs.getString("tipe"),
                        rs.getString("deskripsi"),
                        formatWaktu(rs.getTimestamp("created_at"))));
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return list;
    }


    public List<Deadline> getDeadlineTerdekat(int userId, int hari) {
        List<Deadline> list = new ArrayList<>();
        String sql = "SELECT id, user_id, title, description, due_date, is_completed "
                + "FROM deadlines "
                + "WHERE user_id = ? AND is_completed = FALSE "
                + "AND due_date BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL ? DAY) "
                + "ORDER BY due_date ASC";
        try (Connection conn = getConnection();
                PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, userId);
            ps.setInt(2, hari);
            ResultSet rs = ps.executeQuery();
            while (rs.next()) {
                list.add(new Deadline(
                        rs.getInt("id"),
                        rs.getInt("user_id"),
                        rs.getString("title"),
                        rs.getString("description"),
                        rs.getString("due_date"),
                        rs.getBoolean("is_completed")));
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return list;
    }


    public Ringkasan getRingkasanHarian(int userId) {
        double fokus = 0;
        int sesi = 0, notes = 0, quiz = 0, deadline = 0;

        try (Connection conn = getConnection();
                PreparedStatement ps = conn.prepareStatement(
                        "SELECT COALESCE(SUM(durasi_menit), 0) / 60.0 "
                                + "FROM history_pomodoro "
                                + "WHERE user_id = ? AND mode_pomo = 'focus' AND DATE(waktu_mulai) = CURDATE()")) {
            ps.setInt(1, userId);
            ResultSet rs = ps.executeQuery();
            if (rs.next())
                fokus = rs.getDouble(1);
        } catch (Exception e) {
            e.printStackTrace();
        }

        try (Connection conn = getConnection();
                PreparedStatement ps = conn.prepareStatement(
                        "SELECT COUNT(*) FROM history_pomodoro "
                                + "WHERE user_id = ? AND mode_pomo = 'focus' AND DATE(waktu_mulai) = CURDATE()")) {
            ps.setInt(1, userId);
            ResultSet rs = ps.executeQuery();
            if (rs.next())
                sesi = rs.getInt(1);
        } catch (Exception e) {
            e.printStackTrace();
        }

        try (Connection conn = getConnection();
                PreparedStatement ps = conn.prepareStatement(
                        "SELECT COUNT(*) FROM notes WHERE user_id = ? AND DATE(created_at) = CURDATE()")) {
            ps.setInt(1, userId);
            ResultSet rs = ps.executeQuery();
            if (rs.next())
                notes = rs.getInt(1);
        } catch (Exception e) {
            e.printStackTrace();
        }

        try (Connection conn = getConnection();
                PreparedStatement ps = conn.prepareStatement(
                        "SELECT COUNT(*) FROM quiz_results WHERE user_id = ? AND DATE(created_at) = CURDATE()")) {
            ps.setInt(1, userId);
            ResultSet rs = ps.executeQuery();
            if (rs.next())
                quiz = rs.getInt(1);
        } catch (Exception e) {
            e.printStackTrace();
        }

        try (Connection conn = getConnection();
                PreparedStatement ps = conn.prepareStatement(
                        "SELECT COUNT(*) FROM deadlines WHERE user_id = ? AND is_completed = FALSE "
                                + "AND due_date BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 3 DAY)")) {
            ps.setInt(1, userId);
            ResultSet rs = ps.executeQuery();
            if (rs.next())
                deadline = rs.getInt(1);
        } catch (Exception e) {
            e.printStackTrace();
        }

        return new Ringkasan(fokus, sesi, notes, quiz, deadline);
    }


    public List<Integer> getRecentQuizScores(int userId, int limit) {
        List<Integer> scores = new ArrayList<>();
        String sql = "SELECT score FROM quiz_results WHERE user_id = ? "
                + "ORDER BY created_at DESC LIMIT ?";
        try (Connection conn = getConnection();
                PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, userId);
            ps.setInt(2, limit);
            ResultSet rs = ps.executeQuery();
            while (rs.next()) {
                scores.add(rs.getInt("score"));
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return scores;
    }


    private String formatWaktu(Timestamp ts) {
        if (ts == null)
            return "";
        long diff = System.currentTimeMillis() - ts.getTime();
        long minutes = diff / (60 * 1000);
        long hours = diff / (3600 * 1000);
        long days = diff / (86400 * 1000);

        if (minutes < 1)
            return "Just now";
        if (minutes < 60)
            return minutes + " min ago";
        if (hours < 24)
            return hours + "h ago";
        if (days < 7)
            return days + " days ago";
        return ts.toString().substring(0, 10);
    }
}