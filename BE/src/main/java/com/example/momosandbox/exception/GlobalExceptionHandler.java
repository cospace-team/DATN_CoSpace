package com.example.momosandbox.exception;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

import java.util.Map;

@ControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger logger = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> handleBadRequest(IllegalArgumentException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                "error", "BAD_REQUEST",
                "message", ex.getMessage() != null ? ex.getMessage() : "Dữ liệu không hợp lệ"
        ));
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, String>> handleConflict(IllegalStateException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                "error", "CONFLICT",
                "message", ex.getMessage() != null ? ex.getMessage() : "Lỗi trạng thái dữ liệu"
        ));
    }

    @ExceptionHandler(org.springframework.dao.DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, String>> handleDataIntegrityViolation(org.springframework.dao.DataIntegrityViolationException ex) {
        logger.warn("Data integrity violation: {}", ex.getMessage());
        String msg = "Dữ liệu xung đột hoặc không hợp lệ trên hệ thống.";
        String exMsg = ex.getMessage() != null ? ex.getMessage().toLowerCase() : "";
        if (exMsg.contains("exclusion constraint") || exMsg.contains("bookings_workspace_id_start_at_end_at_excl") || exMsg.contains("no_overlapping_maintenance")) {
            msg = "Không gian này đã có người đặt hoặc đang trong thời gian bảo trì. Vui lòng chọn vị trí hoặc khung giờ khác.";
        } else if (exMsg.contains("duplicate key") || exMsg.contains("unique constraint")) {
            msg = "Dữ liệu đã tồn tại trong hệ thống (trùng mã hoặc thông tin duy nhất).";
        }
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                "error", "DATA_CONFLICT",
                "message", msg
        ));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> handleException(Exception ex) {
        logger.error("Unhandled exception: ", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "error", "INTERNAL_SERVER_ERROR",
                "message", "Có lỗi hệ thống xảy ra. Vui lòng thử lại sau."
        ));
    }
}
