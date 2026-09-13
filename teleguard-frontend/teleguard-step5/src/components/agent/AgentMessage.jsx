import { Bot, AlertCircle } from "lucide-react";
import ToolCallChip from "./ToolCallChip.jsx";

export default function AgentMessage({ message }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[75%] rounded-lg rounded-tr-sm bg-indigo px-3 py-2 text-sm text-white">
          {message.text}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] space-y-1.5">
        {message.toolCalls?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {message.toolCalls.map((call, i) => (
              <ToolCallChip key={`${message.id}-${i}`} call={call} />
            ))}
          </div>
        )}

        <div
          className={`flex items-start gap-2 rounded-lg rounded-tl-sm px-3 py-2 text-sm ${
            message.isError
              ? "border border-risk-critical/30 bg-risk-critical/10 text-risk-critical"
              : "bg-surface-raised text-text-primary"
          }`}
        >
          {message.isError ? (
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
          ) : (
            <Bot size={14} className="mt-0.5 shrink-0 text-indigo" />
          )}
          <p className="whitespace-pre-wrap leading-relaxed">{message.text}</p>
        </div>
      </div>
    </div>
  );
}
