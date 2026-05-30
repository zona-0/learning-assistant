package com.cleverai.model;

public class Aktivitas {
    private int id;
    private int userId;
    private String tipe;
    private String deskripsi;
    private String waktu;

    public Aktivitas(int id, int userId, String tipe, String deskripsi, String waktu) {
        this.id = id;
        this.userId = userId;
        this.tipe = tipe;
        this.deskripsi = deskripsi;
        this.waktu = waktu;
    }

    public int getId() {
        return id;
    }

    public int getUserId() {
        return userId;
    }

    public String getTipe() {
        return tipe;
    }

    public String getDeskripsi() {
        return deskripsi;
    }

    public String getWaktu() {
        return waktu;
    }
}