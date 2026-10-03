package com.cospace.app.exception;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * The single place API errors are turned into {@code { "error": "<code>", "message": "<detail>" }}.
 * There used to be a second advice (controller/ApiExceptionHandler) with overlapping handlers; with
 * two candidates Spring picks one by bean order, and its catch-all {@code Exception} handler won even
 * for errors this class maps more precisely (a booking overlap came back as a 500 carrying the raw SQL).
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger logger = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    private static ResponseEntity<Map<String, Object>> error(HttpStatus status, String code, String message) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("error", code);
        body.put("message", message);
        return ResponseEntity.status(status).body(body);
    }

    @ExceptionHandler(org.springframework.web.bind.MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidationExceptions(org.springframework.web.bind.MethodArgumentNotValidException ex) {
        Map<String, String> fieldErrors = new LinkedHashMap<>();
        String firstErrorMessage = null;
        for (org.springframework.validation.FieldError error : ex.getBindingResult().getFieldErrors()) {
            fieldErrors.put(error.getField(), error.getDefaultMessage());
            if (firstErrorMessage == null && error.getDefaultMessage() != null) {
                firstErrorMessage = error.getDefaultMessage();
            }
        }
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("error", "validation_failed");
        body.put("message", firstErrorMessage != null ? firstErrorMessage : "Dữ liệu không hợp lệ");
        body.put("fields", fieldErrors);
        return ResponseEntity.badRequest().body(body);
    }

    @ExceptionHandler(org.springframework.http.converter.HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, Object>> handleHttpMessageNotReadable(org.springframework.http.converter.HttpMessageNotReadableException ex) {
        return error(HttpStatus.BAD_REQUEST, "bad_request", "Dữ liệu gửi lên không hợp lệ hoặc sai định dạng.");
    }

    /** A path or query value of the wrong type, e.g. "/api/bookings/abc" where a UUID is expected. */
    @ExceptionHandler(org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class)
    public ResponseEntity<Map<String, Object>> handleTypeMismatch(org.springframework.web.method.annotation.MethodArgumentTypeMismatchException ex) {
        return error(HttpStatus.BAD_REQUEST, "bad_request", "Giá trị của tham số '" + ex.getName() + "' không hợp lệ.");
    }

    @ExceptionHandler(org.springframework.web.bind.MissingServletRequestParameterException.class)
    public ResponseEntity<Map<String, Object>> handleMissingParameter(org.springframework.web.bind.MissingServletRequestParameterException ex) {
        return error(HttpStatus.BAD_REQUEST, "bad_request", "Thiếu tham số bắt buộc '" + ex.getParameterName() + "'.");
    }

    @ExceptionHandler(org.springframework.web.multipart.support.MissingServletRequestPartException.class)
    public ResponseEntity<Map<String, Object>> handleMissingPart(org.springframework.web.multipart.support.MissingServletRequestPartException ex) {
        return error(HttpStatus.BAD_REQUEST, "bad_request", "Thiếu tệp hoặc dữ liệu '" + ex.getRequestPartName() + "'.");
    }

    /** Dates typed into query strings ("?date=2026-13-45") are parsed by hand in a few controllers. */
    @ExceptionHandler(java.time.format.DateTimeParseException.class)
    public ResponseEntity<Map<String, Object>> handleDateParse(java.time.format.DateTimeParseException ex) {
        return error(HttpStatus.BAD_REQUEST, "bad_request", "Ngày giờ không đúng định dạng: " + ex.getParsedString());
    }

    @ExceptionHandler(org.springframework.web.HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<Map<String, Object>> handleMethodNotSupported(org.springframework.web.HttpRequestMethodNotSupportedException ex) {
        return error(HttpStatus.METHOD_NOT_ALLOWED, "method_not_allowed",
                "Phương thức " + ex.getMethod() + " không được hỗ trợ cho yêu cầu này.");
    }

    @ExceptionHandler(org.springframework.web.HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<Map<String, Object>> handleMediaType(org.springframework.web.HttpMediaTypeNotSupportedException ex) {
        return error(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "unsupported_media_type", "Định dạng dữ liệu gửi lên không được hỗ trợ.");
    }

    @ExceptionHandler(org.springframework.web.multipart.MaxUploadSizeExceededException.class)
    public ResponseEntity<Map<String, Object>> handleUploadTooLarge(org.springframework.web.multipart.MaxUploadSizeExceededException ex) {
        return error(HttpStatus.PAYLOAD_TOO_LARGE, "payload_too_large", "Tệp tải lên vượt quá dung lượng cho phép (tối đa 5MB).");
    }

    @ExceptionHandler(org.springframework.security.core.AuthenticationException.class)
    public ResponseEntity<Map<String, Object>> handleAuthenticationException(org.springframework.security.core.AuthenticationException ex) {
        return error(HttpStatus.UNAUTHORIZED, "unauthorized",
                "Thông tin xác thực không chính xác hoặc phiên đăng nhập đã hết hạn.");
    }

    /**
     * Thrown directly by controllers/services (e.g. BranchAccessGuard) for a resource-level permission
     * check; their message says which resource, so it is passed through.
     */
    @ExceptionHandler(org.springframework.security.access.AccessDeniedException.class)
    public ResponseEntity<Map<String, Object>> handleAccessDeniedException(org.springframework.security.access.AccessDeniedException ex) {
        String message = ex.getMessage();
        if (message == null || message.isBlank() || "Access Denied".equals(message)) {
            message = "Bạn không có quyền thực hiện hành động này.";
        }
        return error(HttpStatus.FORBIDDEN, "forbidden", message);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleBadRequest(IllegalArgumentException ex) {
        return error(HttpStatus.BAD_REQUEST, "bad_request",
                ex.getMessage() != null ? ex.getMessage() : "Dữ liệu không hợp lệ");
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, Object>> handleConflict(IllegalStateException ex) {
        return error(HttpStatus.CONFLICT, "conflict",
                ex.getMessage() != null ? ex.getMessage() : "Lỗi trạng thái dữ liệu");
    }

    /** Another request holds the row (a payment webhook, the expiry job): ask the user to retry. */
    @ExceptionHandler({
            org.springframework.dao.PessimisticLockingFailureException.class,
            org.springframework.orm.ObjectOptimisticLockingFailureException.class
    })
    public ResponseEntity<Map<String, Object>> handleLockConflict(Exception ex) {
        logger.warn("Lock conflict: {}", ex.getMessage());
        return error(HttpStatus.CONFLICT, "conflict",
                "Dữ liệu đang được cập nhật bởi một thao tác khác. Vui lòng thử lại sau giây lát.");
    }

    @ExceptionHandler(org.springframework.dao.DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, Object>> handleDataIntegrityViolation(org.springframework.dao.DataIntegrityViolationException ex) {
        logger.warn("Data integrity violation: {}", ex.getMessage());
        String msg = "Dữ liệu xung đột hoặc không hợp lệ trên hệ thống.";
        String exMsg = ex.getMessage() != null ? ex.getMessage().toLowerCase() : "";
        if (exMsg.contains("exclusion constraint") || exMsg.contains("bookings_workspace_id_start_at_end_at_excl") || exMsg.contains("no_overlapping_maintenance")) {
            msg = "Không gian này đã có người đặt hoặc đang trong thời gian bảo trì. Vui lòng chọn vị trí hoặc khung giờ khác.";
        } else if (exMsg.contains("duplicate key") || exMsg.contains("unique constraint")) {
            msg = "Dữ liệu đã tồn tại trong hệ thống (trùng mã hoặc thông tin duy nhất).";
        } else if (exMsg.contains("foreign key constraint")) {
            msg = "Dữ liệu đang được sử dụng ở nơi khác nên không thể thực hiện thao tác này.";
        } else if (exMsg.contains("check constraint")) {
            // A value the schema rules out (negative price, refund above 100%, …): the input is
            // wrong, not in conflict with anything.
            return error(HttpStatus.BAD_REQUEST, "bad_request",
                    "Giá trị nhập vào không hợp lệ (ví dụ: số tiền âm hoặc tỷ lệ ngoài khoảng cho phép).");
        } else if (exMsg.contains("not-null constraint")) {
            return error(HttpStatus.BAD_REQUEST, "bad_request", "Thiếu thông tin bắt buộc, vui lòng điền đầy đủ biểu mẫu.");
        }
        return error(HttpStatus.CONFLICT, "data_conflict", msg);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleException(Exception ex) {
        // Details stay in the server log: the message of an arbitrary exception can carry SQL,
        // table names or stack internals that have no place in an API response.
        logger.error("Unhandled exception: ", ex);
        return error(HttpStatus.INTERNAL_SERVER_ERROR, "internal_server_error",
                "Có lỗi hệ thống xảy ra. Vui lòng thử lại sau.");
    }
}
