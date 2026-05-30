package com.cleverai.model;

import com.cleverai.interfaces.Refreshable;
import com.cleverai.dao.DashboardDAO;
import com.cleverai.dao.HistoryPomodoroDAO;
import java.util.ArrayList;
import java.util.List;

public class Dashboard implements Refreshable {

    private String idDashboard;
    private User user;
    private int totalSesiPomodoro;
    private int totalNotes;
    private int totalDeadline;

    private List<Aktivitas> aktivitasTerbaru;
    private List<Deadline> deadlineTerdekat;

    private DashboardDAO dashboardDAO;
    private HistoryPomodoroDAO historyPomodoroDAO;

    public Dashboard(User user) {
        this.user = user;
        this.idDashboard = "DASH-" + user.getId();
        this.dashboardDAO = new DashboardDAO();
        this.historyPomodoroDAO = new HistoryPomodoroDAO();
        this.aktivitasTerbaru = new ArrayList<>();
        this.deadlineTerdekat = new ArrayList<>();
    }

    @Override
    public void refreshStatistik() {
        int userId = user.getId();
        this.totalSesiPomodoro = historyPomodoroDAO.countByUser(userId);
        this.totalNotes = dashboardDAO.countNotesByUser(userId);
        this.totalDeadline = dashboardDAO.countDeadlinesByUser(userId);
    }

    public List<Aktivitas> ambilAktivitasTerbaru() {
        this.aktivitasTerbaru = dashboardDAO.getAktivitasTerbaru(user.getId(), 6);
        return this.aktivitasTerbaru;
    }

    public List<Deadline> dapatkanDeadlineTerdekat(int hari) {
        this.deadlineTerdekat = dashboardDAO.getDeadlineTerdekat(user.getId(), hari);
        return this.deadlineTerdekat;
    }

    public Ringkasan generateRingkasanHarian() {
        return dashboardDAO.getRingkasanHarian(user.getId());
    }

    public String getIdDashboard() {
        return idDashboard;
    }

    public User getUser() {
        return user;
    }

    public int getTotalSesiPomodoro() {
        return totalSesiPomodoro;
    }

    public int getTotalNotes() {
        return totalNotes;
    }

    public int getTotalDeadline() {
        return totalDeadline;
    }

    public double getTotalFocusHours() {
        return dashboardDAO.getTotalFocusHours(user.getId());
    }

    public double getQuizScoreAvg() {
        return dashboardDAO.getQuizScoreAvg(user.getId());
    }

    public List<Aktivitas> getAktivitasTerakhir() {
        return aktivitasTerbaru;
    }

    public List<Deadline> getDeadlines() {
        return deadlineTerdekat;
    }
}