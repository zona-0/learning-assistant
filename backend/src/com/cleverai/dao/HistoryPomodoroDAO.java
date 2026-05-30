package com.cleverai.dao;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;

public class HistoryPomodoroDAO extends AbstractDAO {

    @Override
    protected String getTableName() {
        return "history_pomodoro";
    }

    public double getFocusHours(int userId) {
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

    public List<Double> getWeeklyFocusHours(int userId) {
        List<Double> hours = new ArrayList<>();
        String sql = "SELECT COALESCE(SUM(durasi_menit), 0) / 60.0 "
                + "FROM history_pomodoro "
                + "WHERE user_id = ? AND mode_pomo = 'focus' "
                + "AND DAYOFWEEK(waktu_mulai) = ?";
        try (Connection conn = getConnection()) {
            int[] dayMap = { 2, 3, 4, 5, 6, 7, 1 };
            for (int dow : dayMap) {
                try (PreparedStatement ps = conn.prepareStatement(sql)) {
                    ps.setInt(1, userId);
                    ps.setInt(2, dow);
                    ResultSet rs = ps.executeQuery();
                    hours.add(rs.next() ? rs.getDouble(1) : 0.0);
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
            while (hours.size() < 7)
                hours.add(0.0);
        }
        return hours;
    }

    public List<Double> getWeeklyBreakHours(int userId) {
        List<Double> hours = new ArrayList<>();
        String sql = "SELECT COALESCE(SUM(durasi_menit), 0) / 60.0 "
                + "FROM history_pomodoro "
                + "WHERE user_id = ? AND mode_pomo IN ('short_break','long_break') "
                + "AND DAYOFWEEK(waktu_mulai) = ?";
        try (Connection conn = getConnection()) {
            int[] dayMap = { 2, 3, 4, 5, 6, 7, 1 };
            for (int dow : dayMap) {
                try (PreparedStatement ps = conn.prepareStatement(sql)) {
                    ps.setInt(1, userId);
                    ps.setInt(2, dow);
                    ResultSet rs = ps.executeQuery();
                    hours.add(rs.next() ? rs.getDouble(1) : 0.0);
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
            while (hours.size() < 7)
                hours.add(0.0);
        }
        return hours;
    }

    public List<Integer> getWeeklyStreak(int userId) {
        List<Integer> streak = new ArrayList<>();
        String sql = "SELECT COUNT(*) FROM history_pomodoro "
                + "WHERE user_id = ? AND mode_pomo = 'focus' "
                + "AND DAYOFWEEK(waktu_mulai) = ?";
        try (Connection conn = getConnection()) {
            int[] dayMap = { 2, 3, 4, 5, 6, 7, 1 };
            for (int dow : dayMap) {
                try (PreparedStatement ps = conn.prepareStatement(sql)) {
                    ps.setInt(1, userId);
                    ps.setInt(2, dow);
                    ResultSet rs = ps.executeQuery();
                    streak.add(rs.next() ? rs.getInt(1) : 0);
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
            while (streak.size() < 7)
                streak.add(0);
        }
        return streak;
    }
}