package com.cleverai.util;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

public class Database {
    private static final String URL  = "jdbc:mysql://localhost:3306/cleverai_db";
    private static final String USER = "root";
    private static final String PASS = "";

    private Database() {}

    public static Connection getConnection() throws SQLException {
        return DriverManager.getConnection(URL, USER, PASS);
    }
}