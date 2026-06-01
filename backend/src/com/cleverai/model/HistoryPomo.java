package com.cleverai.model;

import java.sql.Timestamp;

public class HistoryPomo {
    private int historyId;
    private int userId;
    private String modePomo;
    private Timestamp waktuMulai;
    private int durasiMenit;

    public int getHistoryId() {
        return historyId;
    }
    public void setHistoryId(int historyId) {
        this.historyId = historyId;
    }
    public int getUserId() {
        return userId;
    }
    public void setUserId(int userId) {
        this.userId = userId;
    }
    public String getModePomo() {
        return modePomo;
    }
    public void setModePomo(String modePomo) {
        this.modePomo = modePomo;
    }
    public Timestamp getWaktuMulai() {
        return waktuMulai;
    }
    public void setWaktuMulai(Timestamp waktuMulai) {
        this.waktuMulai = waktuMulai;
    }
    public int getDurasiMenit() {
        return durasiMenit;
    }
    public void setDurasiMenit(int durasiMenit) {
        this.durasiMenit = durasiMenit;
    }
}
