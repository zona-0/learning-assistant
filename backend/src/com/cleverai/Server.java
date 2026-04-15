package com.cleverai;

import com.cleverai.handler.LoginHandler;
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
        server.setExecutor(null);
        server.start();
        System.out.println("http://localhost:" + port);
        // hai
    }
}