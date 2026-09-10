package com.cospace.app.service;

import com.cospace.app.dto.api.BookingCreateRequest;
import com.cospace.app.dto.api.BookingDto;
import com.cospace.app.dto.api.ChatDto.ChatActionConfirmRequest;
import com.cospace.app.dto.api.ChatDto.ChatActionResult;
import com.cospace.app.dto.api.ChatDto.ChatMessageRequest;
import com.cospace.app.dto.api.ChatDto.ChatMessageResponse;
import com.cospace.app.dto.api.ChatDto.ChatTurn;
import com.cospace.app.dto.api.ChatDto.PendingAction;
import com.cospace.app.entity.BranchEntity;
import com.cospace.app.entity.CancellationPolicy;
import com.cospace.app.entity.DurationUnit;
import com.cospace.app.entity.ExtraServiceEntity;
import com.cospace.app.entity.WorkspaceEntity;
import com.cospace.app.entity.WorkspaceType;
import com.cospace.app.repository.BranchEntityRepository;
import com.cospace.app.repository.CancellationPolicyRepository;
import com.cospace.app.repository.ExtraServiceRepository;
import com.cospace.app.repository.FloorRepository;
import com.cospace.app.repository.WorkspaceEntityRepository;
import com.cospace.app.repository.WorkspaceTypeRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.function.Consumer;

/**
 * Orchestrates the customer AI chatbot: builds the tool-calling conversation with Gemini,
 * executes read-only tools directly, and turns mutating tool calls (create/cancel a booking,
 * add an extra service) into a {@link PendingAction} that the frontend must show the user and
 * get an explicit confirmation for before {@link #confirmAction} actually performs it.
 */
@Service
@Slf4j
public class ChatbotService {

    private static final int MAX_TOOL_ITERATIONS = 6;
    private static final List<String> MUTATING_TOOLS = List.of(
            "propose_create_booking", "propose_cancel_booking", "propose_add_extra_service");

    private final GeminiClient geminiClient;
    private final BranchEntityRepository branchRepository;
    private final WorkspaceEntityRepository workspaceRepository;
    private final WorkspaceTypeRepository workspaceTypeRepository;
    private final FloorRepository floorRepository;
    private final ExtraServiceRepository extraServiceRepository;
    private final CancellationPolicyRepository cancellationPolicyRepository;
    private final BookingService bookingService;
    private final BookingAddonService bookingAddonService;
    private final CancellationService cancellationService;
    private final PricingService pricingService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public ChatbotService(GeminiClient geminiClient, BranchEntityRepository branchRepository,
            WorkspaceEntityRepository workspaceRepository, WorkspaceTypeRepository workspaceTypeRepository,
            FloorRepository floorRepository, ExtraServiceRepository extraServiceRepository,
            CancellationPolicyRepository cancellationPolicyRepository, BookingService bookingService,
            BookingAddonService bookingAddonService, CancellationService cancellationService,
            PricingService pricingService) {
        this.geminiClient = geminiClient;
        this.branchRepository = branchRepository;
        this.workspaceRepository = workspaceRepository;
        this.workspaceTypeRepository = workspaceTypeRepository;
        this.floorRepository = floorRepository;
        this.extraServiceRepository = extraServiceRepository;
        this.cancellationPolicyRepository = cancellationPolicyRepository;
        this.bookingService = bookingService;
        this.bookingAddonService = bookingAddonService;
        this.cancellationService = cancellationService;
        this.pricingService = pricingService;
    }

    /**
     * @param onProgress receives a user-facing label each time a real step starts, so the client
     *                   can show what the assistant is actually doing instead of a generic spinner.
     */
    public ChatMessageResponse chat(UUID userId, ChatMessageRequest req, Consumer<String> onProgress) {
        onProgress.accept("Đang đọc yêu cầu của bạn...");
        List<Map<String, Object>> contents = new ArrayList<>();
        if (req.getHistory() != null) {
            for (ChatTurn turn : req.getHistory()) {
                contents.add(textContent(turn.getRole(), turn.getText()));
            }
        }
        contents.add(textContent("user", req.getMessage()));

        String systemPrompt = buildSystemPrompt();
        List<Map<String, Object>> tools = buildToolDeclarations();

        for (int i = 0; i < MAX_TOOL_ITERATIONS; i++) {
            JsonNode response = geminiClient.generateContent(systemPrompt, contents, tools);
            JsonNode modelContent = response.path("candidates").path(0).path("content");
            JsonNode parts = modelContent.path("parts");

            List<JsonNode> functionCalls = new ArrayList<>();
            StringBuilder text = new StringBuilder();
            for (JsonNode part : parts) {
                if (part.has("functionCall")) {
                    functionCalls.add(part.get("functionCall"));
                } else if (part.has("text")) {
                    text.append(part.get("text").asText());
                }
            }

            if (functionCalls.isEmpty()) {
                String reply = text.toString().trim();
                if (reply.isEmpty()) {
                    reply = "Xin lỗi, mình chưa rõ ý bạn. Bạn có thể mô tả cụ thể hơn không?";
                }
                return ChatMessageResponse.builder()
                        .reply(reply)
                        .history(appendedHistory(req, reply))
                        .build();
            }

            // A proposal needs the user's confirmation, so the turn ends here.
            for (JsonNode call : functionCalls) {
                String toolName = call.get("name").asText();
                if (!MUTATING_TOOLS.contains(toolName)) {
                    continue;
                }
                onProgress.accept(progressLabel(toolName));
                PendingAction pending = buildPendingAction(userId, toolName, argsOf(call));
                String reply = text.toString().trim();
                if (reply.isEmpty()) {
                    reply = pending.getSummary();
                }
                return ChatMessageResponse.builder()
                        .reply(reply)
                        .pendingAction(pending)
                        .history(appendedHistory(req, reply))
                        .build();
            }

            // Echo the model turn back verbatim: Gemini 3 requires the thought signature that came
            // with the functionCall to be preserved when the function response is sent back.
            contents.add(objectMapper.convertValue(modelContent, Map.class));
            List<Map<String, Object>> responseParts = new ArrayList<>();
            for (JsonNode call : functionCalls) {
                String toolName = call.get("name").asText();
                Map<String, Object> args = argsOf(call);
                log.info("Chatbot tool call: {} args={}", toolName, args);
                onProgress.accept(progressLabel(toolName));
                Object toolResult = executeReadOnlyTool(userId, toolName, args);
                responseParts.add(Map.of("functionResponse",
                        functionResponse(toolName, call.path("id").asText(null), toolResult)));
            }
            contents.add(Map.of("role", "user", "parts", responseParts));
            onProgress.accept("Đang tổng hợp thông tin...");
        }

        String reply = "Yêu cầu này hơi phức tạp, bạn có thể hỏi cụ thể hơn hoặc chia nhỏ câu hỏi giúp mình nhé.";
        return ChatMessageResponse.builder().reply(reply).history(appendedHistory(req, reply)).build();
    }

    public ChatActionResult confirmAction(UUID userId, ChatActionConfirmRequest req) {
        Map<String, Object> args = req.getArgs() != null ? req.getArgs() : Map.of();
        return switch (req.getType()) {
            case "create_booking" -> doCreateBooking(userId, args);
            case "cancel_booking" -> doCancelBooking(userId, args);
            case "add_extra_service" -> doAddExtraService(userId, args);
            default -> throw new IllegalArgumentException("Loại hành động không hợp lệ: " + req.getType());
        };
    }

    /** What the user sees while a given tool runs. */
    private String progressLabel(String toolName) {
        return switch (toolName) {
            case "list_branches" -> "Đang xem danh sách chi nhánh...";
            case "find_workspaces" -> "Đang kiểm tra chỗ trống...";
            case "list_my_bookings" -> "Đang tra cứu đơn đặt chỗ của bạn...";
            case "get_booking" -> "Đang mở chi tiết đơn đặt chỗ...";
            case "get_cancellation_policy" -> "Đang đọc chính sách hủy...";
            case "list_extra_services" -> "Đang xem dịch vụ thêm...";
            case "propose_create_booking" -> "Đang chuẩn bị thông tin đặt chỗ...";
            case "propose_cancel_booking" -> "Đang chuẩn bị yêu cầu hủy...";
            case "propose_add_extra_service" -> "Đang chuẩn bị thêm dịch vụ...";
            default -> "Đang xử lý...";
        };
    }

    /* ═══════════════════════ Read-only tools ═══════════════════════ */

    private Object executeReadOnlyTool(UUID userId, String toolName, Map<String, Object> args) {
        try {
            return switch (toolName) {
                case "list_branches" -> listBranches();
                case "find_workspaces" -> findWorkspaces(args);
                case "list_my_bookings" -> bookingService.listMyBookings(userId);
                case "get_booking" -> bookingService.getMyBooking(userId, requireUuid(args, "bookingId"));
                case "get_cancellation_policy" -> getCancellationPolicy(args);
                case "list_extra_services" -> listExtraServices(args);
                default -> Map.of("error", "unknown_tool", "message", "Công cụ không tồn tại: " + toolName);
            };
        } catch (Exception e) {
            log.warn("Chatbot tool {} failed: {}", toolName, e.getMessage());
            return Map.of("error", true, "message", e.getMessage() != null ? e.getMessage() : "Đã có lỗi xảy ra.");
        }
    }

    private List<Map<String, Object>> listBranches() {
        List<Map<String, Object>> out = new ArrayList<>();
        for (BranchEntity b : branchRepository.findByStatusOrderByNameAsc(BranchEntity.BranchStatus.active)) {
            out.add(Map.of(
                    "branchId", b.getId().toString(),
                    "name", b.getName(),
                    "address", b.getAddress() != null ? b.getAddress() : "",
                    "city", b.getCity() != null ? b.getCity() : ""));
        }
        return out;
    }

    private List<Map<String, Object>> findWorkspaces(Map<String, Object> args) {
        String branchIdStr = stringArg(args, "branchId");
        String workspaceTypeFilter = stringArg(args, "workspaceType");
        Integer minCapacity = intArg(args, "minCapacity");

        List<BranchEntity> branches;
        if (branchIdStr != null) {
            branches = branchRepository.findById(UUID.fromString(branchIdStr)).map(List::of).orElse(List.of());
        } else {
            branches = branchRepository.findByStatusOrderByNameAsc(BranchEntity.BranchStatus.active);
        }

        List<Map<String, Object>> results = new ArrayList<>();
        for (BranchEntity branch : branches) {
            List<WorkspaceEntity> workspaces = workspaceRepository.findWorkspacesByBranchId(branch.getId());
            for (WorkspaceEntity ws : workspaces) {
                if (ws.getStatus() != WorkspaceEntity.Status.active) {
                    continue;
                }
                if (minCapacity != null && ws.getCapacity() < minCapacity) {
                    continue;
                }
                WorkspaceType type = workspaceTypeRepository.findById(ws.getWorkspaceTypeId()).orElse(null);
                String typeName = type != null ? type.getName() : "";
                if (workspaceTypeFilter != null && !workspaceTypeFilter.isBlank()
                        && !containsIgnoreCase(typeName, workspaceTypeFilter)
                        && !containsIgnoreCase(ws.getName(), workspaceTypeFilter)) {
                    continue;
                }

                Map<String, Object> item = new LinkedHashMap<>();
                item.put("workspaceId", ws.getId().toString());
                item.put("workspaceCode", ws.getCode());
                item.put("workspaceName", ws.getName());
                item.put("workspaceType", typeName);
                item.put("capacity", ws.getCapacity());
                item.put("branchId", branch.getId().toString());
                item.put("branchName", branch.getName());
                Long hourlyPrice = safeUnitPrice(branch.getId(), ws.getWorkspaceTypeId().toString(), "hour");
                if (hourlyPrice != null) {
                    item.put("pricePerHourVnd", hourlyPrice);
                }
                results.add(item);
                if (results.size() >= 15) {
                    return results;
                }
            }
        }
        return results;
    }

    private List<Map<String, Object>> getCancellationPolicy(Map<String, Object> args) {
        String branchIdStr = stringArg(args, "branchId");
        List<CancellationPolicy> policies = new ArrayList<>();
        if (branchIdStr != null) {
            policies.addAll(cancellationPolicyRepository
                    .findByBranchIdAndIsActiveTrueOrderByPriorityAsc(UUID.fromString(branchIdStr)));
        }
        policies.addAll(cancellationPolicyRepository.findByBranchIdIsNullAndIsActiveTrueOrderByPriorityAsc());

        List<Map<String, Object>> out = new ArrayList<>();
        for (CancellationPolicy p : policies) {
            out.add(Map.of(
                    "name", p.getName(),
                    "ruleType", String.valueOf(p.getRuleType()),
                    "minValue", p.getMinValue(),
                    "maxValue", p.getMaxValue(),
                    "refundPercent", p.getRefundPercent()));
        }
        return out;
    }

    private List<Map<String, Object>> listExtraServices(Map<String, Object> args) {
        String branchIdStr = stringArg(args, "branchId");
        UUID branchId = branchIdStr != null ? UUID.fromString(branchIdStr) : null;
        List<Map<String, Object>> out = new ArrayList<>();
        for (ExtraServiceEntity s : extraServiceRepository.findAll()) {
            if (!s.isActive()) {
                continue;
            }
            if (s.getBranchId() != null && branchId != null && !s.getBranchId().equals(branchId)) {
                continue;
            }
            out.add(Map.of(
                    "extraServiceId", s.getId().toString(),
                    "name", s.getName(),
                    "description", s.getDescription() != null ? s.getDescription() : "",
                    "priceVnd", s.getPrice(),
                    "unit", s.getUnit()));
        }
        return out;
    }

    /* ═══════════════════════ Mutating tools → pending actions ═══════════════════════ */

    private PendingAction buildPendingAction(UUID userId, String toolName, Map<String, Object> args) {
        return switch (toolName) {
            case "propose_create_booking" -> buildCreateBookingPending(args);
            case "propose_cancel_booking" -> buildCancelBookingPending(userId, args);
            case "propose_add_extra_service" -> buildAddExtraServicePending(userId, args);
            default -> throw new IllegalArgumentException("Công cụ không hợp lệ: " + toolName);
        };
    }

    private PendingAction buildCreateBookingPending(Map<String, Object> args) {
        UUID workspaceId = requireUuid(args, "workspaceId");
        WorkspaceEntity ws = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy không gian làm việc."));
        UUID branchId = floorRepository.findById(ws.getFloorId())
                .map(f -> f.getBranchId())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy chi nhánh của không gian này."));
        BranchEntity branch = branchRepository.findById(branchId).orElse(null);

        String unit = stringArg(args, "unit");
        int unitCount = intArg(args, "unitCount") != null ? intArg(args, "unitCount") : 1;
        String startAt = stringArg(args, "startAt");
        String endAt = stringArg(args, "endAt");

        Long price = safeUnitPrice(branchId, ws.getWorkspaceTypeId().toString(), unit);
        String priceText = price != null
                ? String.format(Locale.forLanguageTag("vi-VN"), " — tạm tính %,d đ", price * unitCount)
                : "";

        String summary = String.format(
                "Đặt \"%s\" tại %s, từ %s đến %s (%d %s)%s.",
                ws.getName(), branch != null ? branch.getName() : "chi nhánh",
                formatDateTime(startAt), formatDateTime(endAt), unitCount, unitLabel(unit), priceText);

        Map<String, Object> pendingArgs = new LinkedHashMap<>();
        pendingArgs.put("workspaceId", workspaceId.toString());
        pendingArgs.put("startAt", startAt);
        pendingArgs.put("endAt", endAt);
        pendingArgs.put("unit", unit);
        pendingArgs.put("unitCount", unitCount);

        return PendingAction.builder().type("create_booking").summary(summary).args(pendingArgs).build();
    }

    private PendingAction buildCancelBookingPending(UUID userId, Map<String, Object> args) {
        UUID bookingId = requireUuid(args, "bookingId");
        BookingDto booking = bookingService.getMyBooking(userId, bookingId);
        String reason = stringArg(args, "reason");

        String summary = String.format("Hủy đơn đặt chỗ \"%s\" (%s)%s.",
                booking.getWorkspaceName(), booking.getBookingCode(),
                reason != null && !reason.isBlank() ? " — lý do: " + reason : "");

        Map<String, Object> pendingArgs = new LinkedHashMap<>();
        pendingArgs.put("bookingId", bookingId.toString());
        pendingArgs.put("reason", reason != null ? reason : "Khách hàng yêu cầu hủy qua trợ lý AI");

        return PendingAction.builder().type("cancel_booking").summary(summary).args(pendingArgs).build();
    }

    private PendingAction buildAddExtraServicePending(UUID userId, Map<String, Object> args) {
        UUID bookingId = requireUuid(args, "bookingId");
        bookingService.getMyBooking(userId, bookingId); // ownership check
        UUID extraServiceId = requireUuid(args, "extraServiceId");
        ExtraServiceEntity service = extraServiceRepository.findById(extraServiceId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy dịch vụ."));
        int quantity = intArg(args, "quantity") != null ? intArg(args, "quantity") : 1;

        String summary = String.format(Locale.forLanguageTag("vi-VN"),
                "Thêm dịch vụ \"%s\" x%d (%,d đ) vào đơn đặt chỗ.",
                service.getName(), quantity, service.getPrice() * quantity);

        Map<String, Object> pendingArgs = new LinkedHashMap<>();
        pendingArgs.put("bookingId", bookingId.toString());
        pendingArgs.put("extraServiceId", extraServiceId.toString());
        pendingArgs.put("quantity", quantity);

        return PendingAction.builder().type("add_extra_service").summary(summary).args(pendingArgs).build();
    }

    /* ═══════════════════════ Confirm & execute ═══════════════════════ */

    private ChatActionResult doCreateBooking(UUID userId, Map<String, Object> args) {
        UUID workspaceId = requireUuid(args, "workspaceId");
        WorkspaceEntity ws = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy không gian làm việc."));
        UUID branchId = floorRepository.findById(ws.getFloorId())
                .map(f -> f.getBranchId())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy chi nhánh của không gian này."));

        BookingCreateRequest dto = new BookingCreateRequest();
        dto.setWorkspaceId(workspaceId);
        dto.setWorkspaceTypeId(ws.getWorkspaceTypeId().toString());
        dto.setBranchId(branchId);
        dto.setStartAt(OffsetDateTime.parse(stringArg(args, "startAt")));
        dto.setEndAt(OffsetDateTime.parse(stringArg(args, "endAt")));
        dto.setUnit(DurationUnit.valueOf(stringArg(args, "unit").toLowerCase()));
        dto.setUnitCount(intArg(args, "unitCount") != null ? intArg(args, "unitCount") : 1);

        BookingDto booking = bookingService.createBooking(userId, dto);
        String reply = String.format(Locale.forLanguageTag("vi-VN"),
                "Đã đặt chỗ thành công! Mã đơn: %s — tổng tiền tạm tính %,d đ. Bạn nhớ thanh toán trước hạn để giữ chỗ nhé.",
                booking.getBookingCode(), booking.getTotalAmount());
        return ChatActionResult.builder().reply(reply).booking(booking).build();
    }

    private ChatActionResult doCancelBooking(UUID userId, Map<String, Object> args) {
        UUID bookingId = requireUuid(args, "bookingId");
        String reason = stringArg(args, "reason");
        var cancellation = cancellationService.cancelBooking(
                userId, bookingId, reason != null ? reason : "Khách hàng yêu cầu hủy qua trợ lý AI");
        BookingDto booking = bookingService.getMyBooking(userId, bookingId);
        String reply = String.format(Locale.forLanguageTag("vi-VN"),
                "Đã hủy đơn đặt chỗ %s. Hoàn tiền %d%% (%,d đ).",
                booking.getBookingCode(), cancellation.getRefundPercent(), cancellation.getRefundAmount());
        return ChatActionResult.builder().reply(reply).booking(booking).build();
    }

    private ChatActionResult doAddExtraService(UUID userId, Map<String, Object> args) {
        UUID bookingId = requireUuid(args, "bookingId");
        bookingService.getMyBooking(userId, bookingId); // ownership check, must happen before mutating
        UUID extraServiceId = requireUuid(args, "extraServiceId");
        int quantity = intArg(args, "quantity") != null ? intArg(args, "quantity") : 1;

        bookingAddonService.addServiceToBooking(userId, bookingId, extraServiceId, quantity);
        BookingDto booking = bookingService.getMyBooking(userId, bookingId);
        String reply = "Đã thêm dịch vụ vào đơn " + booking.getBookingCode() + ".";
        return ChatActionResult.builder().reply(reply).booking(booking).build();
    }

    /* ═══════════════════════ Gemini plumbing ═══════════════════════ */

    private String buildSystemPrompt() {
        String now = OffsetDateTime.now(ZoneOffset.ofHours(7))
                .format(DateTimeFormatter.ofPattern("EEEE, dd/MM/yyyy HH:mm 'GMT+7'", new Locale("vi", "VN")));
        return """
                Bạn là trợ lý ảo của CoSpace — nền tảng đặt chỗ không gian làm việc chung (coworking space) tại Việt Nam.
                Nhiệm vụ: giúp khách hàng tìm/gợi ý không gian làm việc phù hợp, tra cứu đơn đặt chỗ của họ, giải đáp
                chính sách hủy/hoàn tiền, gợi ý dịch vụ thêm, và hỗ trợ đặt chỗ hoặc hủy chỗ bằng các công cụ được cấp.

                Quy tắc bắt buộc:
                - Luôn trả lời bằng tiếng Việt, ngắn gọn, thân thiện, chuyên nghiệp.
                - Luôn dùng công cụ để lấy dữ liệu thật (chi nhánh, không gian, giá, đơn đặt chỗ, chính sách...). Không tự
                  bịa ID, giá tiền hay tình trạng còn trống.
                - Khi khách muốn đặt chỗ: gọi thẳng find_workspaces (bỏ trống branchId nếu khách chưa nêu chi nhánh —
                  kết quả đã kèm tên chi nhánh), chỉ dùng list_branches khi khách hỏi riêng về danh sách chi nhánh.
                  Sau đó xác nhận lại với khách về không gian, thời điểm bắt đầu/kết thúc, đơn vị thời gian
                  (hour/day/week/month) và số lượng đơn vị trước khi gọi propose_create_booking.
                - Mỗi lượt hãy gọi càng ít công cụ càng tốt; nếu cần nhiều công cụ độc lập thì gọi chúng cùng lúc
                  trong một lượt thay vì gọi lần lượt.
                - propose_create_booking / propose_cancel_booking / propose_add_extra_service KHÔNG tự thực hiện hành
                  động — hệ thống sẽ hiển thị thẻ xác nhận cho khách bấm trước khi thực sự đặt/hủy/thêm dịch vụ. Chỉ gọi
                  các tool này khi đã có đầy đủ tham số và khách đã đồng ý qua hội thoại.
                - Không nhắc UUID/id nội bộ trong câu trả lời cho khách, chỉ dùng tên hoặc mã đơn dễ hiểu.
                - startAt/endAt truyền cho tool phải là chuỗi ISO-8601 có timezone, ví dụ 2026-09-11T14:00:00+07:00. Hãy
                  suy ra ngày giờ tương đối ("ngày mai", "chiều nay"...) dựa trên thời điểm hiện tại: %s.
                - Nếu câu hỏi không liên quan tới CoSpace, lịch sự từ chối và hướng khách quay lại chủ đề đặt chỗ.
                """.formatted(now);
    }

    private List<Map<String, Object>> buildToolDeclarations() {
        List<Map<String, Object>> tools = new ArrayList<>();

        tools.add(tool("list_branches", "Lấy danh sách các chi nhánh CoSpace đang hoạt động.",
                schema(Map.of(), List.of())));

        tools.add(tool("find_workspaces",
                "Tìm không gian làm việc (bàn cá nhân, phòng họp, phòng riêng...) đang hoạt động. Có thể lọc theo "
                        + "chi nhánh, loại không gian (mô tả tự do, ví dụ 'phòng họp') và sức chứa tối thiểu.",
                schema(Map.of(
                        "branchId", prop("STRING", "ID chi nhánh (UUID), lấy từ list_branches. Bỏ trống để tìm ở mọi chi nhánh."),
                        "workspaceType", prop("STRING", "Loại không gian mong muốn, ví dụ 'phòng họp', 'bàn cá nhân', 'phòng riêng'."),
                        "minCapacity", prop("INTEGER", "Sức chứa tối thiểu (số người).")),
                        List.of())));

        tools.add(tool("list_my_bookings", "Lấy danh sách các đơn đặt chỗ của khách hàng đang trò chuyện.",
                schema(Map.of(), List.of())));

        tools.add(tool("get_booking", "Lấy chi tiết một đơn đặt chỗ của khách hàng theo id.",
                schema(Map.of("bookingId", prop("STRING", "ID đơn đặt chỗ (UUID).")), List.of("bookingId"))));

        tools.add(tool("get_cancellation_policy", "Lấy chính sách hủy/hoàn tiền đang áp dụng.",
                schema(Map.of("branchId", prop("STRING", "ID chi nhánh (UUID), bỏ trống để lấy chính sách chung.")),
                        List.of())));

        tools.add(tool("list_extra_services",
                "Lấy danh sách dịch vụ thêm (đồ uống, máy chiếu, đồ ăn...) có thể thêm vào đơn đặt chỗ.",
                schema(Map.of("branchId", prop("STRING", "ID chi nhánh (UUID), bỏ trống để lấy dịch vụ ở mọi chi nhánh.")),
                        List.of())));

        tools.add(tool("propose_create_booking",
                "Đề xuất tạo một đơn đặt chỗ mới. KHÔNG tạo đơn ngay — hệ thống sẽ hỏi khách xác nhận trước. Chỉ gọi "
                        + "khi đã có workspaceId cụ thể từ find_workspaces và khách đã xác nhận thời gian, số lượng đơn vị.",
                schema(Map.of(
                        "workspaceId", prop("STRING", "ID không gian làm việc (UUID), lấy từ find_workspaces."),
                        "startAt", prop("STRING", "Thời điểm bắt đầu, ISO-8601 có timezone."),
                        "endAt", prop("STRING", "Thời điểm kết thúc, ISO-8601 có timezone."),
                        "unit", propEnum("Đơn vị thời gian.", List.of("hour", "day", "week", "month")),
                        "unitCount", prop("INTEGER", "Số lượng đơn vị thời gian, ví dụ 2 giờ thì unit=hour, unitCount=2.")),
                        List.of("workspaceId", "startAt", "endAt", "unit", "unitCount"))));

        tools.add(tool("propose_cancel_booking",
                "Đề xuất hủy một đơn đặt chỗ đã có. KHÔNG hủy ngay — cần khách hàng xác nhận.",
                schema(Map.of(
                        "bookingId", prop("STRING", "ID đơn đặt chỗ cần hủy (UUID)."),
                        "reason", prop("STRING", "Lý do hủy, nếu khách có nêu.")),
                        List.of("bookingId"))));

        tools.add(tool("propose_add_extra_service",
                "Đề xuất thêm một dịch vụ vào đơn đặt chỗ đã có. KHÔNG thêm ngay — cần khách hàng xác nhận.",
                schema(Map.of(
                        "bookingId", prop("STRING", "ID đơn đặt chỗ (UUID)."),
                        "extraServiceId", prop("STRING", "ID dịch vụ thêm (UUID), lấy từ list_extra_services."),
                        "quantity", prop("INTEGER", "Số lượng, mặc định 1.")),
                        List.of("bookingId", "extraServiceId"))));

        return tools;
    }

    private Map<String, Object> tool(String name, String description, Map<String, Object> parameters) {
        Map<String, Object> t = new LinkedHashMap<>();
        t.put("name", name);
        t.put("description", description);
        t.put("parameters", parameters);
        return t;
    }

    private Map<String, Object> schema(Map<String, Object> properties, List<String> required) {
        Map<String, Object> s = new LinkedHashMap<>();
        s.put("type", "OBJECT");
        s.put("properties", properties);
        if (!required.isEmpty()) {
            s.put("required", required);
        }
        return s;
    }

    private Map<String, Object> prop(String type, String description) {
        return Map.of("type", type, "description", description);
    }

    private Map<String, Object> propEnum(String description, List<String> values) {
        Map<String, Object> p = new LinkedHashMap<>();
        p.put("type", "STRING");
        p.put("description", description);
        p.put("enum", values);
        return p;
    }

    private Map<String, Object> textContent(String role, String text) {
        return Map.of("role", role, "parts", List.of(Map.of("text", text != null ? text : "")));
    }

    private Map<String, Object> functionResponse(String name, String callId, Object result) {
        Map<String, Object> functionResponse = new LinkedHashMap<>();
        functionResponse.put("name", name);
        if (callId != null && !callId.isBlank()) {
            functionResponse.put("id", callId);
        }
        functionResponse.put("response", Map.of("result", result));
        return functionResponse;
    }

    private Map<String, Object> argsOf(JsonNode functionCall) {
        Map<String, Object> args = objectMapper.convertValue(functionCall.path("args"), Map.class);
        return args != null ? args : Map.of();
    }

    private List<ChatTurn> appendedHistory(ChatMessageRequest req, String modelReply) {
        List<ChatTurn> history = new ArrayList<>(req.getHistory() != null ? req.getHistory() : List.of());
        history.add(ChatTurn.builder().role("user").text(req.getMessage()).build());
        history.add(ChatTurn.builder().role("model").text(modelReply).build());
        return history;
    }

    /* ═══════════════════════ helpers ═══════════════════════ */

    private Long safeUnitPrice(UUID branchId, String workspaceTypeId, String unit) {
        try {
            return pricingService.getUnitPriceVnd(branchId, workspaceTypeId, unit);
        } catch (Exception e) {
            return null;
        }
    }

    private String formatDateTime(String iso) {
        if (iso == null) {
            return "";
        }
        try {
            return OffsetDateTime.parse(iso).format(DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy"));
        } catch (Exception e) {
            return iso;
        }
    }

    private String unitLabel(String unit) {
        if (unit == null) {
            return "";
        }
        return switch (unit.toLowerCase()) {
            case "hour" -> "giờ";
            case "day" -> "ngày";
            case "week" -> "tuần";
            case "month" -> "tháng";
            default -> unit;
        };
    }

    private boolean containsIgnoreCase(String haystack, String needle) {
        return haystack != null && haystack.toLowerCase(Locale.ROOT).contains(needle.toLowerCase(Locale.ROOT));
    }

    private String stringArg(Map<String, Object> args, String key) {
        Object v = args.get(key);
        if (v == null) {
            return null;
        }
        String s = v.toString().trim();
        return s.isEmpty() ? null : s;
    }

    private Integer intArg(Map<String, Object> args, String key) {
        Object v = args.get(key);
        if (v == null) {
            return null;
        }
        if (v instanceof Number n) {
            return n.intValue();
        }
        try {
            return Integer.parseInt(v.toString().trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private UUID requireUuid(Map<String, Object> args, String key) {
        String v = stringArg(args, key);
        if (v == null) {
            throw new IllegalArgumentException("Thiếu tham số " + key);
        }
        try {
            return UUID.fromString(v);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Tham số " + key + " không hợp lệ.");
        }
    }
}
