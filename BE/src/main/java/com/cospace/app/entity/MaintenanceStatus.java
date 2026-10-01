package com.cospace.app.entity;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum MaintenanceStatus {
    scheduled,
    active,
    in_progress,
    done,
    completed,
    canceled;

    @JsonCreator
    public static MaintenanceStatus fromString(String value) {
        if (value == null) return null;
        for (MaintenanceStatus status : MaintenanceStatus.values()) {
            if (status.name().equalsIgnoreCase(value.trim())) {
                return status;
            }
        }
        return scheduled;
    }

    @JsonValue
    public String toValue() {
        return this.name();
    }
}
