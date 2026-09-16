package com.cospace.app.config;

import com.cospace.app.service.PayosService;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

/**
 * Refuses to start a production instance whose PayOS configuration would fall back to demo mode.
 *
 * <p>Demo mode exists so the project runs locally without real credentials, but it also enables the
 * simulation endpoint, which lets a customer mark their own booking as paid. Left to itself the
 * fallback is silent: a forgotten {@code PAYOS_CLIENT_ID} produces a perfectly healthy-looking
 * service that happens to give bookings away. {@code application-prod.yml} already drops the
 * defaults so an unset variable fails placeholder resolution; this guard additionally rejects a
 * variable that is set but still a placeholder value such as {@code demo-client-id}.
 */
@Configuration
@Profile("prod")
@Slf4j
public class PayosProductionGuard {

    private final PayosService payosService;

    public PayosProductionGuard(PayosService payosService) {
        this.payosService = payosService;
    }

    @PostConstruct
    void rejectDemoCredentials() {
        if (payosService.isDemoMode()) {
            throw new IllegalStateException(
                    "PayOS đang ở chế độ demo trong profile production. Trong chế độ này khách hàng có thể "
                            + "tự xác nhận đã thanh toán mà không trả tiền. Hãy đặt PAYOS_CLIENT_ID, PAYOS_API_KEY "
                            + "và PAYOS_CHECKSUM_KEY bằng thông tin thật từ https://my.payos.vn.");
        }
        log.info("PayOS production credentials verified — demo mode is off.");
    }
}
