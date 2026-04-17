package com.cleverai.dao;

import com.cleverai.model.User;
import com.cleverai.util.Database;

import java.security.MessageDigest;
import java.sql.*;

public class UserDAO {

    private String hashPassword(String password) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(password.getBytes("UTF-8"));
            StringBuilder hex = new StringBuilder();
            for (byte b : hash) hex.append(String.format("%02x", b));
            return hex.toString();
        } catch (Exception e) {
            throw new RuntimeException("Error hashing password", e);
        }
    }

    public User authenticate(String username, String password) {
        String sql = "SELECT id, username, email, full_name, role, is_verified "
                   + "FROM users WHERE username = ? AND password_hash = ?";
        try (Connection conn = Database.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setString(1, username);
            ps.setString(2, hashPassword(password));
            ResultSet rs = ps.executeQuery();

            if (rs.next()) {
                return new User(
                    rs.getInt("id"),
                    rs.getString("username"),
                    rs.getString("email"),
                    rs.getString("full_name"),
                    rs.getString("role"),
                    rs.getBoolean("is_verified")
                );
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return null;
    }

    public boolean register(String username, String email, String passwordHash, String fullName) throws Exception {
        String sql = "INSERT INTO users (username, email, password_hash, full_name, role, is_verified) "
                   + "VALUES (?, ?, ?, ?, 'pelajar', FALSE)";
        try (Connection conn = Database.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, username);
            ps.setString(2, email);
            ps.setString(3, passwordHash);
            ps.setString(4, fullName);
            ps.executeUpdate();
            return true;
        }
    }
}