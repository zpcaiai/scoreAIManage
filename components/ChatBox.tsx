"use client";

import { useState } from "react";
import MessageList from "./MessageList";
import InputBar from "./InputBar";

export default function ChatBox() {
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async (content: string) => {
    if (!content.trim()) return;

    const newMessages = [
      ...messages,
      { role: "user", content },
    ];

    setMessages(newMessages);
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages: newMessages }),
      });

      const data = await res.json();
      setMessages([...newMessages, data]);
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto p-4">
      <div className="flex-1 overflow-hidden flex flex-col bg-white rounded-lg shadow-lg">
        <div className="bg-gray-800 text-white p-4 rounded-t-lg">
          <h1 className="text-xl font-semibold">AI Chat Assistant</h1>
        </div>
        
        <MessageList messages={messages} />
        
        <InputBar 
          onSendMessage={sendMessage} 
          disabled={isLoading}
        />
      </div>
    </div>
  );
}
