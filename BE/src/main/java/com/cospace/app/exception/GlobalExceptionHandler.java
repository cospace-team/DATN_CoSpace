package com.cospace.app.exception;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger logger = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(org.springframework.web.bind.MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidationExceptions(org.springframework.web.bind.MethodArgumentNotValidException ex) {
        Map<String, String> fieldErrors = new HashMap<>();
        String firstErrorMessage = "Dữ liệu không hợp lệ";
        for (org.springframework.validation.FieldError error : ex.getBindingResult().getFieldErrors()) {
            fieldErrors.put(error.getField(), error.getDefaultMessage());
            if ("Dữ liệu không hợp lệ".equals(firstErrorMessage) && error.getDefaultMessage() != null) {
                firstErrorMessage = error.getDefaultMessage();
            }
        }
        Map<String, Object> body = new HashMap<>();
        body.put("error", "VALIDATION_FAILED");
        body.put("message", firstErrorMessage);
        body.put("fields", fieldErrors);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }

    @ExceptionHandler(org.springframework.http.converter.HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, String>> handleHttpMessageNotReadable(org.springframework.http.converter.HttpMessageNotReadableException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                "error", "MALFORMED_JSON",
                "message", "Dữ liệu gửi lên không đúng định dạng JSON hoặc bị thiếu."
        ));
    }

    @ExceptionHandler(org.springframework.web.HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<Map<String, String>> handleMethodNotSupported(org.springframework.web.HttpRequestMethodNotSupportedException ex) {
        return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED).body(Map.of(
                "error", "METHOD_NOT_ALLOWED",
                "message", "Phương thức " + ex.getMethod() + " không được hỗ trợ cho yêu cầu này."
        ));
    }

    @ExceptionHandler(org.springframework.security.core.AuthenticationException.class)
    public ResponseEntity<Map<String, String>> handleAuthenticationException(org.springframework.security.core.AuthenticationException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                "error", "UNAUTHORIZED",
                "message", "Thông tin xác thực không chính xác hoặc phiên đăng nhập đã hết hạn."
        ));
    }

    @ExceptionHandler(org.springframework.security.access.AccessDeniedException.class)
    public ResponseEntity<Map<String, String>> handleAccessDeniedException(org.springframework.security.access.AccessDeniedException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                "error", "FORBIDDEN",
                "message", "Bạn không có quyền thực hiện hành động này."
        ));
    }

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
