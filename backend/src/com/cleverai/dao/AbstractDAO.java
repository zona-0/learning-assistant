package com.cleverai.dao;

import com.cleverai.util.Database;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;

public abstract class AbstractDAO {

    protected abstract String getTableName();

    protected Connection getConnection() throws Exception {
        return Database.getConnection();
    }

    public int countByUser(int userId) {
        String sql = "SELECT COUNT(*) FROM " + getTableName() + " WHERE user_id = ?";
        try (Connection conn = getConnection();
                PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setInt(1, userId);
            ResultSet rs = ps.executeQuery();
            if (rs.next()) {
                return rs.getInt(1);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return 0;
    }
}