package com.cleverai;

import com.cleverai.handler.LoginHandler;
import com.cleverai.handler.RegisterHandler;
import com.cleverai.handler.ProfileHandler;
import com.cleverai.handler.DashboardHandler;
import com.cleverai.handler.PasswordChangeHandler;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;

public class Server {
    private static final int PORT = 8080;
    
    public static void main(String[] args) {
        try {
            HttpServer server = HttpServer.create(new InetSocketAddress(PORT), 0);
            server.createContext("/api/login", new LoginHandler());
            server.createContext("/api/register", new RegisterHandler());
            server.createContext("/api/profile/update", new ProfileHandler());
            server.createContext("/api/dashboard", new DashboardHandler());
            server.createContext("/api/password/change", new PasswordChangeHandler());
            server.setExecutor(null);
            server.start();
            System.out.println("Server is running on port " + PORT);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
