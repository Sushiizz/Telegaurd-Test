import { useCallback, useState } from "react";
import { queryAgent } from "../api/client.js";

function newId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function useAgentChat() {
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [loading, setLoading] = useState(false);

  const sendQuery = useCallback(
    async (query) => {
      const trimmed = query.trim();
      if (!trimmed || loading) return;

      setMessages((prev) => [...prev, { id: newId(), role: "user", text: trimmed }]);
      setLoading(true);

      try {
        const res = await queryAgent({ query: trimmed, conversationId });
        setConversationId(res.conversation_id);
        setMessages((prev) => [
          ...prev,
          { id: newId(), role: "assistant", text: res.reply, toolCalls: res.tool_calls },
        ]);
      } catch (e) {
        setMessages((prev) => [
          ...prev,
          {
            id: newId(),
            role: "assistant",
            text: e.message || "The agent is unavailable right now.",
            isError: true,
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [conversationId, loading],
  );

  const resetConversation = useCallback(() => {
    setMessages([]);
    setConversationId(null);
  }, []);

  return { messages, loading, sendQuery, resetConversation };
}
