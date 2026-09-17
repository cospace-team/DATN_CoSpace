/**
 * chatbotApi.ts — API client for the CoSpace AI chatbot (Gemini-powered).
 */

export interface ChatTurn {
  role: 'user' | 'model';
  text: string;
}

export interface PendingAction {
  type: 'create_booking' | 'cancel_booking' | 'add_extra_service';
  summary: string;
  args: Record<string, unknown>;
}

export interface ChatMessageResponse {
  reply: string;
  pendingAction?: PendingAction | null;
  history: ChatTurn[];
}

export interface ChatBooking {
  id: string;
  bookingCode: string;
  totalAmount: number;
  status: string;
}

import { API_BASE_URL } from '../config/api';

export interface ChatActionResult {
  reply: string;
  booking?: ChatBooking | null;
}

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('workhub_access_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function parseErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.json();
    return data.message || fallback;
  } catch {
    return fallback;
  }
}

/** Splits an SSE stream into `{event, data}` frames, tolerating chunks that cut a frame in half. */
async function* readSseFrames(body: ReadableStream<Uint8Array>) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const frames = buffer.split(/\n\n|\r\n\r\n/);
    buffer = frames.pop() ?? '';

    for (const frame of frames) {
      let event = 'message';
      let data = '';
      for (const line of frame.split(/\r?\n/)) {
        if (line.startsWith('event:')) event = line.slice(6).trim();
        else if (line.startsWith('data:')) data += line.slice(5).trim();
      }
      if (data) yield { event, data };
    }
  }
}

export const chatbotApi = {
  /**
   * Runs one turn. `onProgress` fires per step the backend actually performs, so the widget can
   * show what is happening rather than a generic spinner.
   */
  async sendMessage(
    message: string,
    history: ChatTurn[],
    onProgress?: (label: string) => void,
  ): Promise<ChatMessageResponse> {
    const res = await fetch(`${API_BASE_URL}/api/chatbot/message`, {
      method: 'POST',
      // JSON stays acceptable so an error raised before the stream opens (validation, auth) can
      // still come back as a normal JSON body instead of a 406.
      headers: { ...authHeaders(), Accept: 'text/event-stream, application/json' },
      body: JSON.stringify({ message, history }),
    });
    if (!res.ok) {
      throw new Error(await parseErrorMessage(res, `Trợ lý AI tạm thời không phản hồi (${res.status})`));
    }
    if (!res.body) {
      throw new Error('Trình duyệt không đọc được phản hồi của trợ lý AI.');
    }

    let result: ChatMessageResponse | null = null;
    for await (const { event, data } of readSseFrames(res.body)) {
      if (event === 'progress') onProgress?.(JSON.parse(data).label);
      else if (event === 'result') result = JSON.parse(data);
      else if (event === 'error') throw new Error(JSON.parse(data).message);
    }
    if (!result) {
      throw new Error('Trợ lý AI không trả về kết quả. Bạn thử lại giúp mình nhé.');
    }
    return result;
  },

  async confirmAction(type: PendingAction['type'], args: Record<string, unknown>): Promise<ChatActionResult> {
    const res = await fetch(`${API_BASE_URL}/api/chatbot/actions/confirm`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ type, args }),
    });
    if (!res.ok) {
      throw new Error(await parseErrorMessage(res, `Không thể thực hiện hành động (${res.status})`));
    }
    return res.json();
  },
};
