// FILE: src/components/SpaceChatPanel.tsx

import React, { useState } from "react";
import { chatWithSpace } from "@/domain/ai/meetings";
import type { MeetingSpace } from "@/domain/types";

interface Props {
  space: MeetingSpace;
}

export const SpaceChatPanel: React.FC<Props> = ({ space }) => {
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const send = async () => {
    const question = input.trim();
    if (!question) return;

    setInput("");
    setMessages((m) => [...m, { role: "user", content: question }]);
    setLoading(true);

    try {
      if (!space.records.some((r) => r.insight)) {
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            content:
              "This space doesn’t have any processed meetings yet. Add a meeting and save it first.",
          },
        ]);
        return;
      }

      const answer = await chatWithSpace(question, space);
      setMessages((m) => [...m, { role: "assistant", content: answer }]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Unable to answer that question." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-96 border-l bg-slate-50 p-4 flex flex-col">
      {/* HEADER */}
      <h3 className="font-semibold mb-1">Space Analyst</h3>

      {space.records.some((r) => r.insight) && (
        <div className="text-xs text-slate-400 mb-3 italic">
          Using summarized meeting history
        </div>
      )}

      {/* MESSAGES */}
      <div className="flex-1 overflow-y-auto space-y-2 text-sm">
        {messages.map((m, i) => (
          <div
            key={i}
            className={m.role === "user" ? "text-right" : "text-left"}
          >
            <div
              className={`inline-block rounded-lg px-3 py-2 max-w-[85%] ${
                m.role === "user"
                  ? "bg-indigo-600 text-white"
                  : "bg-white border"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="italic text-slate-400 text-xs">Thinking…</div>
        )}
      </div>

      {/* INPUT */}
      <div className="mt-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about this space…"
          className="flex-1 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
          disabled={loading}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !loading) send();
          }}
        />
        <button
          onClick={send}
          disabled={loading}
          className="px-4 py-2 text-sm rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
        >
          Ask
        </button>
      </div>
    </div>
  );
};