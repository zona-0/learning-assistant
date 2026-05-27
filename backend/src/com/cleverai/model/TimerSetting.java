package com.cleverai.model;

public class TimerSetting {
    private int userId;
    private int focusDuration;
    private int shortBreak;
    private int longBreak;
    private boolean autoStartBreaks;
    private boolean soundNotif;

    public TimerSetting() {}
    
    public TimerSetting(int userId, int focusDuration, int shortBreak, int longBreak, boolean autoStartBreaks, boolean soundNotif) {
        this.userId = userId;
        this.focusDuration = focusDuration;
        this.shortBreak = shortBreak;
        this.longBreak = longBreak;
        this.autoStartBreaks = autoStartBreaks;
        this.soundNotif = soundNotif;
    }
    
    public int getUserId() { return userId; }
    public void setUserId(int userId) { this.userId = userId; }
    
    public int getFocusDuration() { return focusDuration; }
    public void setFocusDuration(int focusDuration) { this.focusDuration = focusDuration; }
    
    public int getShortBreak() { return shortBreak; }
    public void setShortBreak(int shortBreak) { this.shortBreak = shortBreak; }
    
    public int getLongBreak() { return longBreak; }
    public void setLongBreak(int longBreak) { this.longBreak = longBreak; }
    
    public boolean isAutoStartBreaks() { return autoStartBreaks; }
    public void setAutoStartBreaks(boolean autoStartBreaks) { this.autoStartBreaks = autoStartBreaks; }
    
    public boolean isSoundNotif() { return soundNotif; }
    public void setSoundNotif(boolean soundNotif) { this.soundNotif = soundNotif; }
}
