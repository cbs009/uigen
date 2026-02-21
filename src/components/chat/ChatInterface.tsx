"use client";

import { useEffect, useRef } from "react";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { useChat } from "@/lib/contexts/chat-context";

export function ChatInterface() {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { messages, input, handleInputChange, handleSubmit, status } = useChat();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-full p-4 overflow-hidden">
      <div ref={scrollAreaRef} className="flex-1 overflow-y-auto min-h-0 flex flex-col">
        <div className="pr-4 flex-1">
          <MessageList messages={messages} isLoading={status === "streaming"} />
        </div>
      </div>
      <div className="mt-4 flex-shrink-0">
        <MessageInput
          input={input}
          handleInputChange={handleInputChange}
          handleSubmit={handleSubmit}
          isLoading={status === "submitted" || status === "streaming"}
        />
      </div>
    </div>
  );
}
