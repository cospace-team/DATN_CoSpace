import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiMessageCircle, FiSend, FiX, FiCheck, FiLoader, FiCreditCard } from "react-icons/fi";
import { chatbotApi, ChatBooking, ChatTurn, PendingAction } from "../../lib/chatbotApi";
import { startPayment, PaymentProvider } from "../../lib/startPayment";
import { formatVND } from "../../utils/formatters";
import { useToast } from "../Toast";

const WELCOME: ChatTurn = {
  role: "model",
  text: "Chào bạn! Mình là trợ lý CoSpace. Mình có thể giúp bạn tìm không gian phù hợp, đặt chỗ, tra cứu đơn, giải đáp chính sách hủy hoặc gợi ý dịch vụ thêm. Bạn cần gì hôm nay?",
};

const SUGGESTIONS = [
  "Tìm phòng họp cho 4 người",
  "Đơn đặt chỗ của tôi",
  "Chính sách hủy thế nào?",
];

// Memoized: it takes no props, so it only needs to re-render on its own state/context changes,
// not every time the AppShell header re-renders (sidebar/theme toggles, navigation).
export const ChatWidget = React.memo(function ChatWidget() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<ChatTurn[]>([WELCOME]);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [payFor, setPayFor] = useState<ChatBooking | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [steps, setSteps] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, pending, payFor, busy, steps]);

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || busy) return;

    setInput("");
    setPending(null);
    setPayFor(null);
    setHistory((prev) => [...prev, { role: "user", text: message }]);
    setBusy(true);
    setSteps([]);
    try {
      // The welcome bubble is local-only; the backend replays the rest as Gemini context.
      const res = await chatbotApi.sendMessage(message, history.slice(1), (label) =>
        setSteps((prev) => (prev[prev.length - 1] === label ? prev : [...prev, label])),
      );
      setHistory([WELCOME, ...res.history]);
      setPending(res.pendingAction ?? null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Trợ lý AI đang gặp sự cố.";
      setHistory((prev) => [...prev, { role: "model", text: msg }]);
      showToast(msg, "error");
    } finally {
      setBusy(false);
      setSteps([]);
    }
  };

  const confirm = async () => {
    if (!pending || busy) return;
    setBusy(true);
    try {
      const res = await chatbotApi.confirmAction(pending.type, pending.args);
      setPending(null);
      setHistory((prev) => [...prev, { role: "model", text: res.reply }]);
      // A new booking lands in pending_payment, so offer the gateway right here — otherwise it
      // silently expires at the payment deadline.
      if (pending.type === "create_booking" && res.booking) {
        setPayFor(res.booking);
      }
      showToast(res.reply, "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Không thể thực hiện hành động.";
      setHistory((prev) => [...prev, { role: "model", text: msg }]);
      showToast(msg, "error");
    } finally {
      setBusy(false);
    }
  };

  const pay = async (provider: PaymentProvider) => {
    if (!payFor || busy) return;
    setBusy(true);
    try {
      const redirected = await startPayment(provider, payFor.id, payFor.totalAmount);
      if (!redirected) {
        setPayFor(null);
        setHistory((prev) => [
          ...prev,
          { role: "model", text: `Đã tạo yêu cầu thanh toán cho đơn ${payFor.bookingCode}. Mình chuyển bạn sang trang lịch sử đặt chỗ để theo dõi nhé.` },
        ]);
        navigate("/customer/history");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Không tạo được yêu cầu thanh toán.";
      setHistory((prev) => [...prev, { role: "model", text: msg }]);
      showToast(msg, "error");
    } finally {
      setBusy(false);
    }
  };

  const payLater = () => {
    const code = payFor?.bookingCode;
    setPayFor(null);
    setHistory((prev) => [
      ...prev,
      { role: "model", text: `Được nhé. Đơn ${code} đang chờ thanh toán, bạn có thể vào mục Lịch sử để thanh toán trước khi hết hạn giữ chỗ.` },
    ]);
  };

  const dismiss = () => {
    setPending(null);
    setHistory((prev) => [...prev, { role: "model", text: "Mình đã bỏ qua đề xuất này. Bạn cần điều chỉnh gì không?" }]);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-5 lg:bottom-6 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/30 flex items-center justify-center hover:scale-105 transition-transform"
        aria-label="Mở trợ lý AI CoSpace"
      >
        <FiMessageCircle className="h-6 w-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-20 right-5 lg:bottom-6 z-50 flex flex-col w-[min(24rem,calc(100vw-2.5rem))] h-[min(34rem,calc(100vh-8rem))] rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
      <header className="flex items-center justify-between px-4 h-14 border-b border-border bg-card/80 backdrop-blur shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <FiMessageCircle className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground leading-tight">Trợ lý CoSpace</p>
            <p className="text-[11px] text-muted-foreground leading-tight">Hỗ trợ đặt chỗ bằng AI</p>
          </div>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          aria-label="Đóng trợ lý"
        >
          <FiX className="h-4 w-4" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {history.map((turn, i) => (
          <div key={i} className={`flex ${turn.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed whitespace-pre-wrap ${
                turn.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-sm"
                  : "bg-muted text-foreground rounded-bl-sm"
              }`}
            >
              {turn.text}
            </div>
          </div>
        ))}

        {pending && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-2.5">
            <p className="text-[13px] text-foreground">{pending.summary}</p>
            <div className="flex gap-2">
              <button
                onClick={() => void confirm()}
                disabled={busy}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60"
              >
                <FiCheck className="h-3.5 w-3.5" /> Xác nhận
              </button>
              <button
                onClick={dismiss}
                disabled={busy}
                className="flex-1 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted disabled:opacity-60"
              >
                Bỏ qua
              </button>
            </div>
          </div>
        )}

        {payFor && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-2.5">
            <p className="text-[13px] text-foreground">
              Đơn <span className="font-semibold">{payFor.bookingCode}</span> đang chờ thanh toán —{" "}
              <span className="font-semibold">{formatVND(payFor.totalAmount)}</span>
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => void pay("payos")}
                disabled={busy}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60"
              >
                <FiCreditCard className="h-3.5 w-3.5" /> VietQR
              </button>
              <button
                onClick={() => void pay("momo")}
                disabled={busy}
                className="flex-1 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-60"
              >
                MoMo
              </button>
              <button
                onClick={payLater}
                disabled={busy}
                className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted disabled:opacity-60"
              >
                Để sau
              </button>
            </div>
          </div>
        )}

        {busy && (
          <div className="rounded-xl border border-border bg-muted/40 p-2.5 space-y-1.5">
            {(steps.length ? steps : ["Trợ lý đang xử lý..."]).map((label, i, all) => {
              const isCurrent = i === all.length - 1;
              return (
                <div key={`${i}-${label}`} className="flex items-center gap-2 text-xs">
                  {isCurrent ? (
                    <FiLoader className="h-3.5 w-3.5 shrink-0 animate-spin text-primary" />
                  ) : (
                    <FiCheck className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                  )}
                  <span className={isCurrent ? "text-foreground" : "text-muted-foreground"}>{label}</span>
                </div>
              );
            })}
          </div>
        )}

        {history.length === 1 && !busy && (
          <div className="flex flex-wrap gap-2 pt-1">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => void send(s)}
                className="rounded-full border border-border px-3 py-1.5 text-[11px] text-muted-foreground hover:bg-muted transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <form
        className="flex items-center gap-2 border-t border-border p-3 shrink-0"
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Nhập câu hỏi của bạn..."
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-primary/30"
          aria-label="Tin nhắn gửi tới trợ lý AI"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="h-9 w-9 shrink-0 rounded-lg bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50"
          aria-label="Gửi"
        >
          <FiSend className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
});
