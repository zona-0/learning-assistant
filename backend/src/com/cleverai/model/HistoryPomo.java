package com.cleverai.model;

import java.sql.Timestamp;

public class HistoryPomo {
    private int historyId;
    private int userId;
    private String modePomo;
    private Timestamp waktuMulai;
    private int durasiMenit;

    public HistoryPomo() {}

    public HistoryPomo(int historyId, int userId, String modePomo, Timestamp waktuMulai, int durasiMenit) {
        this.historyId = historyId;
        this.userId = userId;
        this.modePomo = modePomo;
        this.waktuMulai = waktuMulai;
        this.durasiMenit = durasiMenit;
    }

    public int getHistoryId() { return historyId; }
    public int getUserId() { return userId; }
    public String getModePomo() { return modePomo; }
    public Timestamp getWaktuMulai() { return waktuMulai; }
    public int getDurasiMenit() { return durasiMenit; }

    public void setHistoryId(int historyId) { this.historyId = historyId; }
    public void setUserId(int userId) { this.userId = userId; }
    public void setModePomo(String modePomo) { this.modePomo = modePomo; }
    public void setWaktuMulai(Timestamp waktuMulai) { this.waktuMulai = waktuMulai; }
    public void setDurasiMenit(int durasiMenit) { this.durasiMenit = durasiMenit; }
}