package com.cospace.app.util;

/**
 * The one definition of what a password and a phone number must look like. Registration, password
 * reset, changing a password, staff accounts and profile edits all go through it, so an account can
 * no longer end up with "123" as a password or "abc123" as a phone number just because it was set
 * from a screen that forgot to check.
 */
public final class CredentialRules {

    /** At least 8 characters with a lower-case letter, an upper-case letter and a digit. */
    public static final String PASSWORD_REGEX = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,}$";
    public static final String PASSWORD_MESSAGE = "Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường và số";

    /** Vietnamese mobile numbers: 10 digits starting 03, 05, 07, 08 or 09. */
    private static final String PHONE_REGEX = "^0[35789]\\d{8}$";
    public static final String PHONE_MESSAGE = "Số điện thoại không hợp lệ (10 số, bắt đầu bằng 03, 05, 07, 08 hoặc 09).";

    private CredentialRules() {
    }

    public static void requireStrongPassword(String password) {
        if (password == null || !password.matches(PASSWORD_REGEX)) {
            throw new IllegalArgumentException(PASSWORD_MESSAGE);
        }
    }

    /**
     * Normalises a phone typed by a person (spaces, dots, dashes, a +84 prefix) and checks it.
     *
     * @return the number as 10 digits, or null when nothing was entered
     */
    public static String normalizePhone(String phone) {
        if (phone == null || phone.isBlank()) {
            return null;
        }
        String digits = phone.trim().replaceAll("[\\s.\\-()]", "");
        if (digits.startsWith("+84")) {
            digits = "0" + digits.substring(3);
        } else if (digits.startsWith("84") && digits.length() == 11) {
            digits = "0" + digits.substring(2);
        }
        if (!digits.matches(PHONE_REGEX)) {
            throw new IllegalArgumentException(PHONE_MESSAGE);
        }
        return digits;
    }
}
