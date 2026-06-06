package com.cleverai.dao;

import java.sql.*;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

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

    public boolean logSession(int userId, String mode, int durasiMenit) {
        String sql = "INSERT INTO history_pomodoro (user_id, mode_pomo, durasi_menit) VALUES (?, ?, ?)";
        try (Connection conn = getConnection();
                PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, userId);
            ps.setString(2, mode);
            ps.setInt(3, durasiMenit);
            return ps.executeUpdate() > 0;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    public Map<String, Object> getTodayStats(int userId) {
        Map<String, Object> stats = new LinkedHashMap<>();
        String sql = "SELECT mode_pomo, COUNT(*) AS cnt, COALESCE(SUM(durasi_menit), 0) AS total_min "
                + "FROM history_pomodoro "
                + "WHERE user_id = ? AND DATE(waktu_mulai) = CURDATE() "
                + "GROUP BY mode_pomo";
        int focusSessions = 0, focusMinutes = 0, breaksCount = 0;
        try (Connection conn = getConnection();
                PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, userId);
            ResultSet rs = ps.executeQuery();
            while (rs.next()) {
                String mode = rs.getString("mode_pomo");
                int cnt = rs.getInt("cnt");
                int min = rs.getInt("total_min");
                if ("focus".equals(mode)) {
                    focusSessions = cnt;
                    focusMinutes = min;
                } else {
                    breaksCount += cnt;
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        int streak = computeStreak(userId);
        stats.put("sessionsDone", focusSessions);
        stats.put("focusMinutes", focusMinutes);
        stats.put("breaksCount", breaksCount);
        stats.put("streak", streak);
        return stats;
    }

    public List<Map<String, Object>> getRecentLogs(int userId, int limit) {
        List<Map<String, Object>> logs = new ArrayList<>();
        String sql = "SELECT mode_pomo, durasi_menit, waktu_mulai "
                + "FROM history_pomodoro WHERE user_id = ? "
                + "ORDER BY waktu_mulai DESC LIMIT ?";
        try (Connection conn = getConnection();
                PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, userId);
            ps.setInt(2, limit);
            ResultSet rs = ps.executeQuery();
            while (rs.next()) {
                Map<String, Object> entry = new LinkedHashMap<>();
                String mode = rs.getString("mode_pomo");
                entry.put("mode", mode);
                entry.put("durationMinutes", rs.getInt("durasi_menit"));
                entry.put("createdAt", rs.getTimestamp("waktu_mulai").toString());
                logs.add(entry);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return logs;
    }

    public List<Double> getMonthlyFocusHours(int userId) {
        List<Double> hours = new ArrayList<>();
        String sql = "SELECT CASE "
                + "WHEN DAY(waktu_mulai) <= 7 THEN 0 "
                + "WHEN DAY(waktu_mulai) <= 14 THEN 1 "
                + "WHEN DAY(waktu_mulai) <= 21 THEN 2 "
                + "ELSE 3 END AS grp, "
                + "COALESCE(SUM(durasi_menit), 0) / 60.0 "
                + "FROM history_pomodoro "
                + "WHERE user_id = ? AND mode_pomo = 'focus' "
                + "AND YEAR(waktu_mulai) = YEAR(CURDATE()) AND MONTH(waktu_mulai) = MONTH(CURDATE()) "
                + "GROUP BY grp ORDER BY grp";
        double[] arr = new double[4];
        try (Connection conn = getConnection();
                PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, userId);
            ResultSet rs = ps.executeQuery();
            while (rs.next()) {
                arr[rs.getInt("grp")] = rs.getDouble(1);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        for (double v : arr) hours.add(v);
        return hours;
    }

    public List<Double> getMonthlyBreakHours(int userId) {
        List<Double> hours = new ArrayList<>();
        String sql = "SELECT CASE "
                + "WHEN DAY(waktu_mulai) <= 7 THEN 0 "
                + "WHEN DAY(waktu_mulai) <= 14 THEN 1 "
                + "WHEN DAY(waktu_mulai) <= 21 THEN 2 "
                + "ELSE 3 END AS grp, "
                + "COALESCE(SUM(durasi_menit), 0) / 60.0 "
                + "FROM history_pomodoro "
                + "WHERE user_id = ? AND mode_pomo IN ('short_break','long_break') "
                + "AND YEAR(waktu_mulai) = YEAR(CURDATE()) AND MONTH(waktu_mulai) = MONTH(CURDATE()) "
                + "GROUP BY grp ORDER BY grp";
        double[] arr = new double[4];
        try (Connection conn = getConnection();
                PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, userId);
            ResultSet rs = ps.executeQuery();
            while (rs.next()) {
                arr[rs.getInt("grp")] = rs.getDouble(1);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        for (double v : arr) hours.add(v);
        return hours;
    }

    public List<Integer> getMonthlySessions(int userId) {
        List<Integer> sessions = new ArrayList<>();
        String sql = "SELECT CASE "
                + "WHEN DAY(waktu_mulai) <= 7 THEN 0 "
                + "WHEN DAY(waktu_mulai) <= 14 THEN 1 "
                + "WHEN DAY(waktu_mulai) <= 21 THEN 2 "
                + "ELSE 3 END AS grp, "
                + "COUNT(*) "
                + "FROM history_pomodoro "
                + "WHERE user_id = ? AND mode_pomo = 'focus' "
                + "AND YEAR(waktu_mulai) = YEAR(CURDATE()) AND MONTH(waktu_mulai) = MONTH(CURDATE()) "
                + "GROUP BY grp ORDER BY grp";
        int[] arr = new int[4];
        try (Connection conn = getConnection();
                PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, userId);
            ResultSet rs = ps.executeQuery();
            while (rs.next()) {
                arr[rs.getInt("grp")] = rs.getInt(1);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        for (int v : arr) sessions.add(v);
        return sessions;
    }

    public List<Double> getYearlyFocusHours(int userId) {
        List<Double> hours = new ArrayList<>();
        String sql = "SELECT MONTH(waktu_mulai) - 1 AS m, "
                + "COALESCE(SUM(durasi_menit), 0) / 60.0 "
                + "FROM history_pomodoro "
                + "WHERE user_id = ? AND mode_pomo = 'focus' "
                + "AND YEAR(waktu_mulai) = YEAR(CURDATE()) "
                + "GROUP BY MONTH(waktu_mulai) ORDER BY m";
        double[] arr = new double[12];
        try (Connection conn = getConnection();
                PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, userId);
            ResultSet rs = ps.executeQuery();
            while (rs.next()) {
                arr[rs.getInt("m")] = rs.getDouble(1);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        for (double v : arr) hours.add(v);
        return hours;
    }

    public List<Double> getYearlyBreakHours(int userId) {
        List<Double> hours = new ArrayList<>();
        String sql = "SELECT MONTH(waktu_mulai) - 1 AS m, "
                + "COALESCE(SUM(durasi_menit), 0) / 60.0 "
                + "FROM history_pomodoro "
                + "WHERE user_id = ? AND mode_pomo IN ('short_break','long_break') "
                + "AND YEAR(waktu_mulai) = YEAR(CURDATE()) "
                + "GROUP BY MONTH(waktu_mulai) ORDER BY m";
        double[] arr = new double[12];
        try (Connection conn = getConnection();
                PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, userId);
            ResultSet rs = ps.executeQuery();
            while (rs.next()) {
                arr[rs.getInt("m")] = rs.getDouble(1);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        for (double v : arr) hours.add(v);
        return hours;
    }

    public List<Integer> getYearlySessions(int userId) {
        List<Integer> sessions = new ArrayList<>();
        String sql = "SELECT MONTH(waktu_mulai) - 1 AS m, COUNT(*) "
                + "FROM history_pomodoro "
                + "WHERE user_id = ? AND mode_pomo = 'focus' "
                + "AND YEAR(waktu_mulai) = YEAR(CURDATE()) "
                + "GROUP BY MONTH(waktu_mulai) ORDER BY m";
        int[] arr = new int[12];
        try (Connection conn = getConnection();
                PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, userId);
            ResultSet rs = ps.executeQuery();
            while (rs.next()) {
                arr[rs.getInt("m")] = rs.getInt(1);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        for (int v : arr) sessions.add(v);
        return sessions;
    }

    private int computeStreak(int userId) {
        String sql = "SELECT DISTINCT DATE(waktu_mulai) AS d "
                + "FROM history_pomodoro WHERE user_id = ? AND mode_pomo = 'focus' "
                + "ORDER BY d DESC";
        int streak = 0;
        try (Connection conn = getConnection();
                PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, userId);
            ResultSet rs = ps.executeQuery();
            java.time.LocalDate expected = java.time.LocalDate.now();
            while (rs.next()) {
                java.time.LocalDate d = rs.getDate("d").toLocalDate();
                if (d.equals(expected)) {
                    streak++;
                    expected = expected.minusDays(1);
                } else if (d.isBefore(expected)) {
                    break;
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return streak;
    }
}