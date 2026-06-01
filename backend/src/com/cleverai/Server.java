package com.cleverai;

import com.cleverai.handler.LoginHandler;
import com.cleverai.handler.RegisterHandler;
import com.cleverai.handler.ProfileHandler;
import com.cleverai.handler.DashboardHandler;
import com.cleverai.handler.PasswordChangeHandler;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;

public class Server {
    private final int port;

    public Server(int port) {
        this.port = port;
    }

    public void start() throws Exception {
        HttpServer server = HttpServer.create(new InetSocketAddress(port), 0);
        server.createContext("/api/login", new LoginHandler());
        server.createContext("/api/register", new RegisterHandler());
        server.createContext("/api/profile/update", new ProfileHandler());
        server.createContext("/api/dashboard", new DashboardHandler());
        server.createContext("/api/login", new LoginHandler());
        server.createContext("/api/register", new RegisterHandler());
        server.createContext("/api/profile/update", new ProfileHandler());
        server.createContext("/api/password/change", new PasswordChangeHandler());
        server.setExecutor(null);
        server.start();
        System.out.println("Server running at http://localhost:" + port);
    }
}
