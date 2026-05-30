package com.cleverai.model;

public class Deadline {
    private int id;
    private int userId;
    private String title;
    private String description;
    private String dueDate;
    private boolean isCompleted;

    public Deadline(int id, int userId, String title, String description, String dueDate, boolean isCompleted) {
        this.id = id;
        this.userId = userId;
        this.title = title;
        this.description = description;
        this.dueDate = dueDate;
        this.isCompleted = isCompleted;
    }

    public int getId() {
        return id;
    }

    public int getUserId() {
        return userId;
    }

    public String getTitle() {
        return title;
    }

    public String getDescription() {
        return description;
    }

    public String getDueDate() {
        return dueDate;
    }

    public boolean isCompleted() {
        return isCompleted;
    }
}