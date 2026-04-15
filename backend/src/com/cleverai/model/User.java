package com.cleverai.model;

public class User {
    private int id;
    private String username;
    private String email;
    private String fullName;

    public User(int id, String username, String email, String fullName) {
        this.id       = id;
        this.username = username;
        this.email    = email;
        this.fullName = fullName;
    }

    public int    getId()       { return id; }
    public String getUsername() { return username; }
    public String getEmail()    { return email; }
    public String getFullName() { return fullName; }
}