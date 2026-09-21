# -*- coding: utf-8 -*-
"""Dinh nghia cac class diagram cua CoSpace, bam sat entity / service trong ma nguon BE.

Quan he giua cac entity la khoa ngoai UUID (khong dung @ManyToOne) nhung duoc rang buoc that
o CSDL, nen ve thanh association kem boi so. Cac enum nho duoc ghi ngay trong thuoc tinh.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from uml_class import Cls, Diagram  # noqa: E402

FK = " \u00abFK\u00bb"


def fk(text):
    return text + FK


def ref(cid, name, note=None):
    return Cls(cid, name, kind="ref", note=note)


# ======================================================================= MIEN DU LIEU
def cd_space():
    d = Diagram("cd01", "Miền dữ liệu 1: không gian làm việc")
    d.add(Cls("Branch", "BranchEntity", [
        "- id : UUID", "- code : String", "- name : String", "- address : String", "- city : String",
        "- timezone : String", "- openTime : LocalTime", "- closeTime : LocalTime",
        "- status : BranchStatus {active, inactive}"]))
    d.add(Cls("Floor", "Floor", [
        "- id : UUID", fk("- branchId : UUID"), "- floorNo : int", "- name : String", "- svgUrl : String",
        "- svgContent : String", "- layoutJson : String", "- mapVersion : int", "- isPublished : boolean"]))
    d.add(Cls("Workspace", "WorkspaceEntity", [
        "- id : UUID", fk("- floorId : UUID"), fk("- workspaceTypeId : UUID"), "- code : String",
        "- name : String", "- capacity : int", "- svgElementId : String",
        "- status : Status {active, maintenance, inactive}"]))
    d.add(Cls("WType", "WorkspaceType", [
        "- id : UUID", "- code : String", "- name : String", "- capacityDefault : int"]))
    d.add(Cls("Amenity", "Amenity", [
        "- id : UUID", "- name : String", "- iconName : String", "- description : String",
        "- isActive : boolean"]))
    d.add(Cls("WTA", "WorkspaceTypeAmenity", [
        fk("- workspaceTypeId : UUID"), fk("- amenityId : UUID"), "- quantity : int"]))
    d.add(Cls("Maint", "WorkspaceMaintenanceEntity", [
        "- id : UUID", fk("- workspaceId : UUID"), "- startAt : ZonedDateTime", "- endAt : ZonedDateTime",
        "- reason : String", "- status : MaintenanceStatus {scheduled, active, done, canceled}",
        fk("- createdBy : UUID")]))
    d.link("Branch", "Floor", "comp", "1", "*", "branchId")
    d.link("Floor", "Workspace", "comp", "1", "*", "floorId")
    d.link("WType", "Workspace", "assoc", "1", "*", "workspaceTypeId")
    d.link("Workspace", "Maint", "comp", "1", "*", "workspaceId")
    d.link("WType", "WTA", "assoc", "1", "*")
    d.link("Amenity", "WTA", "assoc", "1", "*")
    return d


def cd_pricing():
    d = Diagram("cd02", "Miền dữ liệu 2: bảng giá, dịch vụ bổ sung và chính sách hủy")
    d.add(ref("Branch", "BranchEntity"))
    d.add(ref("WType", "WorkspaceType"))
    d.add(Cls("Price", "PricePolicy", [
        "- id : UUID", fk("- branchId : UUID"), fk("- workspaceTypeId : UUID"),
        "- durationUnit : DurationUnit {hour, day, week, month}", "- price : long", "- isActive : boolean",
        fk("- createdBy : UUID")], note="branchId rỗng: bảng giá toàn cục"))
    d.add(Cls("Extra", "ExtraServiceEntity", [
        "- id : UUID", fk("- branchId : UUID"), "- code : String", "- name : String",
        "- serviceType : String", "- description : String", "- price : long", "- unit : String",
        "- isActive : boolean"], note="branchId rỗng: dịch vụ dùng chung"))
    d.add(Cls("Cancel", "CancellationPolicy", [
        "- id : UUID", "- name : String", "- ruleType : String", "- minValue : int", "- maxValue : int",
        "- refundPercent : BigDecimal", "- priority : int", fk("- branchId : UUID"),
        fk("- workspaceTypeId : UUID"), "- isActive : boolean", "- effectiveFrom : OffsetDateTime",
        "- effectiveTo : OffsetDateTime"], note="branchId rỗng: chính sách toàn cục"))
    d.link("Branch", "Price", "assoc", "0..1", "*", "branchId")
    d.link("WType", "Price", "assoc", "1", "*", "workspaceTypeId")
    d.link("Branch", "Extra", "assoc", "0..1", "*", "branchId")
    d.link("Branch", "Cancel", "assoc", "0..1", "*", "branchId")
    d.link("WType", "Cancel", "assoc", "0..1", "*", "workspaceTypeId")
    return d


def cd_booking():
    d = Diagram("cd03", "Miền dữ liệu 3: đặt chỗ, dịch vụ gọi thêm, check-in và hủy")
    d.add(Cls("User", "User", [
        "- id : UUID", "- email : String", "- password : String", "- fullName : String", "- phone : String",
        "- avatarUrl : String", "- role : Role {super_admin, branch_admin, staff, customer, admin}",
        "- status : Status {active, suspended}", fk("- branchId : UUID"), "- membershipTier : String"],
        note="admin: giá trị cũ giữ để tương thích ngược"))
    d.add(ref("Workspace", "WorkspaceEntity"))
    d.add(ref("Branch", "BranchEntity"))
    d.add(ref("Extra", "ExtraServiceEntity"))
    d.add(Cls("Booking", "Booking", [
        "- id : UUID", "- bookingCode : String", fk("- userId : UUID"), fk("- workspaceId : UUID"),
        fk("- branchId : UUID"), "- status : BookingStatus", "- startAt : OffsetDateTime",
        "- endAt : OffsetDateTime", "- unit : DurationUnit", "- unitCount : int", "- isContract : boolean",
        "- subtotalAmount : long", "- discountAmount : long", "- addonAmount : long", "- totalAmount : long",
        "- paymentDeadlineAt : OffsetDateTime", "- source : BookingSource", fk("- promotionId : UUID")],
        note="Lược bớt: workspaceTypeId, pricePerUnit, membership*, promotion*, tax*, serviceFee*"))
    d.add(Cls("BSI", "BookingServiceItem", [
        "- id : UUID", fk("- bookingId : UUID"), fk("- serviceId : UUID"), "- quantity : int",
        "- unitPrice : long", "- subtotal : long", "- status : String", fk("- paymentId : UUID"),
        fk("- createdBy : UUID")], note="Lược bớt: paidAt, voidedAt, voidedBy"))
    d.add(Cls("Checkin", "CheckinLog", [
        "- id : UUID", fk("- bookingId : UUID"), fk("- staffUserId : UUID"), "- checkinAt : OffsetDateTime",
        "- checkoutAt : OffsetDateTime", "- note : String"]))
    d.add(Cls("Canc", "BookingCancellation", [
        "- id : UUID", fk("- bookingId : UUID"), fk("- userId : UUID"), "- reason : String",
        "- refundPercent : int", "- refundAmount : long", "- penaltyAmount : long",
        "- refundStatus : String", "- appliedRuleJson : Map"]))
    d.add(Cls("BStat", "BookingStatus", [
        "PENDING_PAYMENT", "CONFIRMED", "CHECKED_IN", "CHECKED_OUT", "COMPLETED", "CANCELLED", "EXPIRED",
        "NO_SHOW"], kind="enum", stereo="enumeration"))
    d.link("User", "Booking", "assoc", "1", "*", "userId")
    d.link("Workspace", "Booking", "assoc", "1", "*", "workspaceId")
    d.link("Branch", "Booking", "assoc", "1", "*", "branchId")
    d.link("Booking", "BSI", "comp", "1", "*", "bookingId")
    d.link("Extra", "BSI", "assoc", "1", "*", "serviceId")
    d.link("Booking", "Checkin", "comp", "1", "*", "bookingId")
    d.link("User", "Checkin", "assoc", "1", "*", "staffUserId")
    d.link("Booking", "Canc", "assoc", "1", "0..1", "bookingId")
    d.link("Booking", "BStat", "dep")
    return d


def cd_payment():
    d = Diagram("cd04", "Miền dữ liệu 4: thanh toán, hoàn tiền, khuyến mãi và hạng thành viên")
    d.add(ref("Booking", "Booking"))
    d.add(ref("User", "User"))
    d.add(Cls("Payment", "Payment", [
        "- id : UUID", fk("- bookingId : UUID"), fk("- userId : UUID"), "- provider : String",
        "- method : String", "- orderId : String", "- amount : long", "- status : PaymentStatus",
        "- payUrl : String", "- gatewayTransactionId : String", "- paidAt : OffsetDateTime",
        "- purpose : String"], note="Lược bớt: requestId, rawCallback, refundedAt"))
    d.add(Cls("Event", "PaymentEvent", [
        "- id : UUID", fk("- paymentId : UUID"), "- eventType : String", "- idempotencyKey : String",
        "- signatureValid : Boolean", "- payloadJson : Map", "- processed : boolean"]))
    d.add(Cls("Refund", "Refund", [
        "- id : UUID", fk("- bookingId : UUID"), fk("- paymentId : UUID"), fk("- userId : UUID"),
        fk("- branchId : UUID"), "- amount : long", "- reasonType : String", "- reason : String",
        "- status : String", fk("- processedBy : UUID"), "- processedAt : OffsetDateTime"],
        note="Lược bớt: resolutionNote"))
    d.add(Cls("Promo", "Promotion", [
        "- id : UUID", "- code : String", "- name : String", "- discountType : String",
        "- discountValue : long", "- maxDiscountAmount : Long", "- minOrderAmount : long",
        "- startAt : OffsetDateTime", "- endAt : OffsetDateTime", "- usageLimit : Integer",
        "- perUserLimit : Integer", fk("- branchId : UUID"), "- minTierCode : String"],
        note="Lược bớt: description, workspaceTypeId, isPublic, isActive, createdBy"))
    d.add(Cls("Tier", "MembershipTier", [
        "- id : UUID", "- code : String", "- name : String", "- minTotalSpent : long",
        "- minBookings : int", "- discountPercent : int", "- sortOrder : int", "- isActive : boolean"],
        note="Lược bớt: description, benefits, color"))
    d.add(Cls("PStat", "PaymentStatus", [
        "INITIATED", "PENDING", "AUTHORIZED", "PAID", "FAILED", "CANCELLED", "REFUNDED", "EXPIRED"],
        kind="enum", stereo="enumeration"))
    d.link("Booking", "Payment", "assoc", "1", "*", "bookingId")
    d.link("Payment", "Event", "comp", "1", "*", "paymentId")
    d.link("Booking", "Refund", "assoc", "1", "*", "bookingId")
    d.link("Payment", "Refund", "assoc", "0..1", "*", "paymentId")
    d.link("Promo", "Booking", "assoc", "0..1", "*", "promotionId")
    d.link("Tier", "User", "dep", label="theo mã hạng")
    d.link("Payment", "PStat", "dep")
    return d


def cd_matching():
    d = Diagram("cd05", "Miền dữ liệu 5: hồ sơ năng lực và gợi ý đối tác")
    d.add(ref("User", "User"))
    d.add(ref("Branch", "BranchEntity"))
    d.add(Cls("Profile", "Profile", [
        "- userId : UUID {PK, FK}", "- bio : String", "- profession : String", "- company : String",
        "- contactEmail : String", "- contactPhone : String", "- contactLink : String",
        "- contactPublic : boolean", fk("- primaryBranchId : UUID")]))
    d.add(Cls("Tag", "Tag", [
        "- id : UUID", "- name : String", "- category : String {skill, interest, industry}",
        "- isActive : boolean"]))
    d.add(Cls("Skill", "ProfileSkill", [
        fk("- profileUserId : UUID"), fk("- tagId : UUID"), "- level : short"]))
    d.add(Cls("Interest", "ProfileInterest", [
        fk("- profileUserId : UUID"), fk("- tagId : UUID"), "- priority : short"]))
    d.add(Cls("Score", "ProfileMatchScore", [
        fk("- profileUserId : UUID"), fk("- matchedUserId : UUID"), "- score : BigDecimal",
        "- reasonsJson : Map", "- computedAt : OffsetDateTime"]))
    d.link("User", "Profile", "assoc", "1", "1", "userId")
    d.link("Branch", "Profile", "assoc", "0..1", "*", "primaryBranchId")
    d.link("Profile", "Skill", "comp", "1", "*")
    d.link("Tag", "Skill", "assoc", "1", "*")
    d.link("Profile", "Interest", "comp", "1", "*")
    d.link("Tag", "Interest", "assoc", "1", "*")
    d.link("Profile", "Score", "comp", "1", "*", "profileUserId")
    d.link("Profile", "Score", "assoc", "1", "*", "matchedUserId")
    return d


def cd_community():
    d = Diagram("cd06", "Miền dữ liệu 6: bảng tin cộng đồng, thông báo và nhật ký kiểm toán")
    d.add(ref("User", "User"))
    d.add(ref("Branch", "BranchEntity"))
    d.add(ref("Tag", "Tag"))
    d.add(Cls("Post", "Post", [
        "- id : UUID", fk("- authorUserId : UUID"), "- title : String", "- content : String",
        "- postType : String", fk("- branchId : UUID"), "- status : String", "- createdAt : OffsetDateTime"]))
    d.add(Cls("PostTag", "PostTag", [
        fk("- postId : UUID"), fk("- tagId : UUID"), "- source : String"]))
    d.add(Cls("Noti", "NotificationEntity", [
        "- id : UUID", fk("- userId : UUID"), "- title : String", "- content : String",
        "- type : String", "- isRead : boolean", "- referenceId : UUID", "- referenceType : String"]))
    d.add(Cls("Audit", "AuditLogEntity", [
        "- id : UUID", fk("- userId : UUID"), "- action : String", "- entityName : String",
        "- entityId : UUID", "- oldValues : Map", "- newValues : Map", "- ipAddress : String",
        "- userAgent : String"]))
    d.link("User", "Post", "assoc", "1", "*", "authorUserId")
    d.link("Branch", "Post", "assoc", "0..1", "*", "branchId")
    d.link("Post", "PostTag", "comp", "1", "*")
    d.link("Tag", "PostTag", "assoc", "1", "*")
    d.link("User", "Noti", "assoc", "1", "*", "userId")
    d.link("User", "Audit", "assoc", "0..1", "*", "userId")
    return d


# ======================================================================= TANG DICH VU
def svc(cid, name, methods, stereo=None, kind="svc", note=None):
    return Cls(cid, name, [], ["+ " + m for m in methods], kind=kind, stereo=stereo, note=note, minw=200)


def sd_booking():
    d = Diagram("cd07", "Tầng nghiệp vụ 1: đặt chỗ, tính giá và ưu đãi")
    d.add(svc("BS", "BookingService", [
        "createBooking(userId, req) : BookingDto", "createWalkinBooking(staffId, customerId, req)",
        "quote(userId, req) : QuoteResponse", "listMyBookings(userId) : List<BookingDto>",
        "getBookingByCode(code, branchId)"]))
    d.add(svc("PR", "PricingService", ["getUnitPriceVnd(branchId, workspaceTypeId, unit) : long"]))
    d.add(svc("PM", "PromotionService", [
        "apply(code, userId, tier, branchId, workspaceTypeId, ...)", "listAvailable(userId, tier, ...)",
        "create(req, actorId) / update / delete"]))
    d.add(svc("MB", "MembershipService", [
        "evaluate(userId) : Standing", "refreshTier(userId) : Standing", "getMyMembership(userId)",
        "recalculateAll()"]))
    d.add(svc("BA", "BookingAddonService", [
        "priceLines(branchId, requests)", "attachToNewBooking(booking, orderedBy, lines)",
        "addServiceToBooking(actorId, bookingId, serviceId, qty)", "voidUnpaid(booking, actorId) : long",
        "unpaidAmount(bookingId) : long", "settleTab(staffId, bookingId, method)"]))
    d.add(svc("SM", "BookingStateMachine", [
        "canTransition(from, to) : boolean", "transition(booking, to)", "isTerminal(status) : boolean",
        "label(status) : String"], stereo="utility", kind="util",
        note="Cổng duy nhất để đổi trạng thái đơn"))
    d.add(ref("BX", "BookingExpiryService"))
    d.link("BS", "PR", "dep", label="\u00abuse\u00bb")
    d.link("BS", "PM", "dep", label="\u00abuse\u00bb")
    d.link("BS", "MB", "dep", label="\u00abuse\u00bb")
    d.link("BS", "BA", "dep", label="\u00abuse\u00bb")
    d.link("BS", "BX", "dep", label="\u00abuse\u00bb")
    d.link("BA", "SM", "dep", label="\u00abuse\u00bb")
    return d


def sd_lifecycle():
    d = Diagram("cd08", "Tầng nghiệp vụ 2: vòng đời tự động, check-in và bảo trì")
    d.add(svc("XS", "BookingExpiryScheduler", ["expirePendingBookings()"], stereo="Scheduled mỗi 30 giây"))
    d.add(svc("XE", "BookingExpiryService", ["expire(bookingId, now) : boolean",
                                              "isExpiredHold(booking, now) : boolean"]))
    d.add(svc("LS", "BookingLifecycleScheduler", ["closeFinishedBookings()"], stereo="Scheduled mỗi 5 phút"))
    d.add(svc("LC", "BookingLifecycleService", ["autoCheckoutOverdue(bookingId, now) : boolean",
                                                 "closeEndedBooking(bookingId, now) : BookingStatus"]))
    d.add(svc("CI", "CheckinService", ["checkin(staffId, bookingId, note) : CheckinLogDto",
                                       "checkout(staffId, checkinId, note) : CheckinLogDto",
                                       "getActiveCheckins(branchId)"]))
    d.add(svc("MS", "StaffMaintenanceService", [
        "createMaintenance(staffId, request)", "completeMaintenance(maintenanceId)",
        "deleteMaintenance(maintenanceId)", "getAllMaintenanceForBranch(branchId)"]))
    d.add(ref("BA", "BookingAddonService"))
    d.add(ref("NS", "NotificationService"))
    d.add(ref("CS", "CancellationService"))
    d.link("XS", "XE", "dep", label="\u00abuse\u00bb")
    d.link("LS", "LC", "dep", label="\u00abuse\u00bb")
    d.link("XE", "BA", "dep", label="\u00abuse\u00bb")
    d.link("LC", "BA", "dep", label="\u00abuse\u00bb")
    d.link("LC", "NS", "dep", label="\u00abuse\u00bb")
    d.link("CI", "BA", "dep", label="\u00abuse\u00bb")
    d.link("MS", "CS", "dep", label="\u00abuse\u00bb")
    d.link("MS", "NS", "dep", label="\u00abuse\u00bb")
    return d


def sd_payment():
    d = Diagram("cd09", "Tầng nghiệp vụ 3: thanh toán, hủy đặt chỗ và hoàn tiền")
    d.add(svc("PS", "PaymentService", [
        "createPayosPayment(userId, bookingId, idempotencyKey)", "createMomoPayment(userId, bookingId, key)",
        "createCashPayment(staffId, bookingId)", "handlePayosWebhook(dto)", "handleMomoCallback(params)",
        "handlePayosReturn(params) : boolean"]))
    d.add(svc("PY", "PayosService", [
        "createPaymentLink(orderCode, amount, description, deadline)",
        "verifyWebhookSignature(data, signature) : boolean", "getPaymentLinkStatus(orderCode)",
        "isDemoMode() : boolean"]))
    d.add(svc("MO", "MomoService", [
        "createPayment(orderId, requestId, amount, orderInfo)",
        "verifyCallbackSignature(params, signature) : boolean"]))
    d.add(svc("CS", "CancellationService", [
        "cancelBooking(userId, bookingId, reason)", "cancelByStaff(staffId, bookingId, reason, waivePenalty)",
        "cancelForMaintenance(booking, reason)", "refundTimeLostToMaintenance(booking, start, end, reason)"]))
    d.add(svc("RS", "RefundService", [
        "refundableAmount(bookingId) : long", "requestRefund(booking, paymentId, amount, reasonType, reason)",
        "cancelOpenPayments(bookingId)", "markProcessed(refundId, actorId, note)",
        "reject(refundId, actorId, note)"]))
    d.add(svc("NS", "NotificationService", [
        "createNotification(userId, title, content, type, refId, refType)",
        "getUserNotifications(userId)", "markAsRead(userId, notificationId)"]))
    d.add(ref("BS", "BookingService"))
    d.add(ref("BA", "BookingAddonService"))
    d.link("PS", "PY", "dep", label="\u00abuse\u00bb")
    d.link("PS", "MO", "dep", label="\u00abuse\u00bb")
    d.link("PS", "RS", "dep", label="\u00abuse\u00bb")
    d.link("PS", "BS", "dep", label="\u00abuse\u00bb")
    d.link("PS", "BA", "dep", label="\u00abuse\u00bb")
    d.link("CS", "RS", "dep", label="\u00abuse\u00bb")
    d.link("CS", "NS", "dep", label="\u00abuse\u00bb")
    d.link("CS", "BA", "dep", label="\u00abuse\u00bb")
    d.link("RS", "NS", "dep", label="\u00abuse\u00bb")
    return d


def sd_auth():
    d = Diagram("cd10", "Tầng nghiệp vụ 4: xác thực và phân quyền")
    d.add(svc("AS", "AuthService", [
        "register(request) : AuthResponse", "login(request) : AuthResponse", "refresh(refreshToken)",
        "syncGoogleUser(jwt) : User", "toAuthUserDto(user)"]))
    d.add(svc("JU", "JwtUtil", [
        "generateAccessToken(user) : String", "generateRefreshToken(user) : String",
        "parseRefreshToken(refreshToken) : UUID"], stereo="HS384, access 1 giờ, refresh 30 ngày"))
    d.add(svc("SC", "SecurityConfig", [
        "jwtDecoder() : JwtDecoder", "securityFilterChain(http) : SecurityFilterChain",
        "passwordEncoder() : PasswordEncoder", "corsConfigurationSource() : CorsConfigurationSource"],
        stereo="Configuration"))
    d.add(svc("CV", "SupabaseJwtAuthenticationConverter", ["convert(jwt) : AbstractAuthenticationToken"]))
    d.add(svc("BG", "BranchAccessGuard", [
        "requireAccessToBranch(jwt, resourceBranchId)", "requireBranchAccess(jwt, requestedBranchId)",
        "requireOwnBranch(jwt) : UUID", "isSuperAdmin(jwt) : boolean",
        "resolveReportBranchId(jwt, requestedBranchId)"], stereo="Component"))
    d.link("AS", "JU", "dep", label="\u00abuse\u00bb")
    d.link("SC", "CV", "dep", label="\u00abuse\u00bb")
    d.link("SC", "JU", "dep", label="cùng khóa HS384")
    return d


def sd_assist():
    d = Diagram("cd11", "Tầng nghiệp vụ 5: trợ lý ảo, gợi ý đối tác và nhật ký kiểm toán")
    d.add(svc("CB", "ChatbotService", [
        "chat(userId, req, onProgress) : ChatMessageResponse", "confirmAction(userId, req) : ChatActionResult"]))
    d.add(svc("GC", "GeminiClient", [
        "generateContent(systemInstruction, contents, tools) : JsonNode", "isConfigured() : boolean"],
        note="gemini-3.5-flash, dự phòng gemini-3.7-flash"))
    d.add(svc("PMS", "PartnerMatchingService", [
        "getNetworkingProfile(userId)", "updateNetworkingProfile(userId, req)",
        "suggestPartners(currentUserId) : List<PartnerSuggestionDto>"]))
    d.add(svc("AL", "AuditLogService", [
        "log(request, userId, action, entityName, entityId, oldValues, newValues)",
        "searchAuditLogs(userId, entityName, action, page, size) : Page"]))
    d.add(ref("BS", "BookingService"))
    d.add(ref("CS", "CancellationService"))
    d.add(ref("BA", "BookingAddonService"))
    d.add(ref("PR", "PricingService"))
    d.link("CB", "GC", "dep", label="\u00abuse\u00bb")
    d.link("CB", "BS", "dep", label="\u00abuse\u00bb")
    d.link("CB", "CS", "dep", label="\u00abuse\u00bb")
    d.link("CB", "BA", "dep", label="\u00abuse\u00bb")
    d.link("CB", "PR", "dep", label="\u00abuse\u00bb")
    d.link("PMS", "GC", "dep", label="\u00abuse\u00bb")
    return d


ORDER = [
    ("cd01", cd_space, "cd-01-khonggian", "Miền dữ liệu: không gian làm việc"),
    ("cd02", cd_pricing, "cd-02-gia-chinhsach", "Miền dữ liệu: bảng giá, dịch vụ và chính sách hủy"),
    ("cd03", cd_booking, "cd-03-datcho", "Miền dữ liệu: đặt chỗ, check-in và hủy"),
    ("cd04", cd_payment, "cd-04-thanhtoan", "Miền dữ liệu: thanh toán, hoàn tiền, khuyến mãi, hạng"),
    ("cd05", cd_matching, "cd-05-goiydoitac", "Miền dữ liệu: hồ sơ năng lực và gợi ý đối tác"),
    ("cd06", cd_community, "cd-06-congdong", "Miền dữ liệu: bảng tin, thông báo, kiểm toán"),
    ("cd07", sd_booking, "cd-07-svc-datcho", "Tầng nghiệp vụ: đặt chỗ, tính giá, ưu đãi"),
    ("cd08", sd_lifecycle, "cd-08-svc-vongdoi", "Tầng nghiệp vụ: vòng đời tự động, check-in, bảo trì"),
    ("cd09", sd_payment, "cd-09-svc-thanhtoan", "Tầng nghiệp vụ: thanh toán, hủy và hoàn tiền"),
    ("cd10", sd_auth, "cd-10-svc-xacthuc", "Tầng nghiệp vụ: xác thực và phân quyền"),
    ("cd11", sd_assist, "cd-11-svc-trolyao", "Tầng nghiệp vụ: trợ lý ảo, gợi ý đối tác, kiểm toán"),
]
