package com.cleverai.model;

public class ChatMessage {
    private int id;
    private int userId;
    private String role;
    private String message;
    private String createdAt;

    public ChatMessage() {}

    public ChatMessage(int id, int userId, String role, String message, String createdAt) {
        this.id = id;
        this.userId = userId;
        this.role = role;
        this.message = message;
        this.createdAt = createdAt;
    }

    public int getId() { return id; }
    public int getUserId() { return userId; }
    public String getRole() { return role; }
    public String getMessage() { return message; }
    public String getCreatedAt() { return createdAt; }

    public void setId(int id) { this.id = id; }
    public void setUserId(int userId) { this.userId = userId; }
    public void setRole(String role) { this.role = role; }
    public void setMessage(String message) { this.message = message; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }
}
