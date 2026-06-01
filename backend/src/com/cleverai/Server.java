package com.cleverai;

import com.cleverai.handler.LoginHandler;
import com.cleverai.handler.RegisterHandler;
import com.cleverai.handler.ProfileHandler;
<<<<<<< HEAD
import com.cleverai.handler.DashboardHandler;
=======
import com.cleverai.handler.PasswordChangeHandler;
>>>>>>> 92f7095f9c3f49b6eb1fa80d224036a5f9109854
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;

public class Server {
    private final int port;

    public Server(int port) {
        this.port = port;
    }

    public void start() throws Exception {
        HttpServer server = HttpServer.create(new InetSocketAddress(port), 0);
<<<<<<< HEAD
        server.createContext("/api/login", new LoginHandler());
        server.createContext("/api/register", new RegisterHandler());
        server.createContext("/api/profile/update", new ProfileHandler());
        server.createContext("/api/dashboard", new DashboardHandler());
=======
        server.createContext("/api/login",             new LoginHandler());
        server.createContext("/api/register",          new RegisterHandler());
        server.createContext("/api/profile/update",    new ProfileHandler());
        server.createContext("/api/password/change",   new PasswordChangeHandler());
>>>>>>> 92f7095f9c3f49b6eb1fa80d224036a5f9109854
        server.setExecutor(null);
        server.start();
        System.out.println("Server running at http://localhost:" + port);
    }
}