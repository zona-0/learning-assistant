package com.cleverai.model;

public class Ringkasan {
    private double totalFokusHariIni;
    private int totalSesiHariIni;
    private int totalNotesHariIni;
    private int totalQuizHariIni;
    private int deadlineMendekati;

    public Ringkasan(double totalFokusHariIni, int totalSesiHariIni,
            int totalNotesHariIni, int totalQuizHariIni, int deadlineMendekati) {
        this.totalFokusHariIni = totalFokusHariIni;
        this.totalSesiHariIni = totalSesiHariIni;
        this.totalNotesHariIni = totalNotesHariIni;
        this.totalQuizHariIni = totalQuizHariIni;
        this.deadlineMendekati = deadlineMendekati;
    }

    // Getters (Enkapsulasi)
    public double getTotalFokusHariIni() {
        return totalFokusHariIni;
    }

    public int getTotalSesiHariIni() {
        return totalSesiHariIni;
    }

    public int getTotalNotesHariIni() {
        return totalNotesHariIni;
    }

    public int getTotalQuizHariIni() {
        return totalQuizHariIni;
    }

    public int getDeadlineMendekati() {
        return deadlineMendekati;
    }

    @Override
    public String toString() {
        return "Today: " + totalFokusHariIni + "h focus, "
                + totalSesiHariIni + " sessions, "
                + totalNotesHariIni + " notes, "
                + totalQuizHariIni + " quizzes, "
                + deadlineMendekati + " upcoming deadlines";
    }
}