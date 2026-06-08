package com.cleverai;

import com.cleverai.handler.LoginHandler;
import com.cleverai.handler.RegisterHandler;
import com.cleverai.handler.ProfileHandler;
import com.cleverai.handler.DashboardHandler;
import com.cleverai.handler.PasswordChangeHandler;
import com.cleverai.handler.ChatHistoryHandler;
import com.cleverai.handler.AITutorHandler;
import com.cleverai.handler.QuizHandler;
import com.cleverai.handler.QuizResultHandler;
import com.cleverai.handler.PomodoroHandler;
import com.cleverai.handler.SubjectHandler;
import com.cleverai.handler.NoteHandler;
import com.cleverai.handler.AccountHandler;
import com.cleverai.handler.PreferencesHandler;
import com.cleverai.handler.GoalsHandler;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.io.IOException;

public class Server {
    private HttpServer server;
    public Server(int port) throws IOException {
        server = HttpServer.create(new InetSocketAddress(port), 0);
        server.createContext("/api/login", new LoginHandler());
        server.createContext("/api/register", new RegisterHandler());
        server.createContext("/api/profile/update", new ProfileHandler());
        server.createContext("/api/dashboard", new DashboardHandler());
        server.createContext("/api/password/change", new PasswordChangeHandler());
        server.createContext("/api/chat/history", new ChatHistoryHandler());
        server.createContext("/api/chat/save", new ChatHistoryHandler());
        server.createContext("/api/chat/sessions", new ChatHistoryHandler());
        server.createContext("/api/chat/clear", new ChatHistoryHandler());
        server.createContext("/api/chat/title", new ChatHistoryHandler());
        server.createContext("/api/chat/ask", new AITutorHandler());
        server.createContext("/api/quiz/generate", new QuizHandler());
        QuizResultHandler quizResultHandler = new QuizResultHandler();
        server.createContext("/api/quiz/save", quizResultHandler);
        server.createContext("/api/quiz/history", quizResultHandler);
        server.createContext("/api/pomodoro", new PomodoroHandler());
        server.createContext("/api/subjects", new SubjectHandler());
        server.createContext("/api/notes", new NoteHandler());
        server.createContext("/api/account", new AccountHandler());
        server.createContext("/api/preferences", new PreferencesHandler());
        server.createContext("/api/goals", new GoalsHandler());
        server.setExecutor(null);
    }
    public void start() {
        server.start();
        System.out.println("Server is running on port " + server.getAddress().getPort());
    }
}
