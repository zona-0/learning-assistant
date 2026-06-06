package com.cleverai.model;

public class Subject {
    private int id;
    private int userId;
    private String name;
    private String color;

    public Subject(int id, int userId, String name, String color) {
        this.id = id;
        this.userId = userId;
        this.name = name;
        this.color = color;
    }

    public int getId() { return id; }
    public int getUserId() { return userId; }
    public String getName() { return name; }
    public String getColor() { return color; }
}
