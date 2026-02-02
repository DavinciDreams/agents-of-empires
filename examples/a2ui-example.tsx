/**
 * A2UI Streaming Example
 *
 * Demonstrates how to use the A2UI streaming interface
 * to display real-time agent UI updates.
 */

"use client";

import React, { useState } from "react";
import { A2UIRenderer, useA2UIStream } from "@/components/a2ui/A2UIRenderer";

/**
 * Example 1: Simple A2UI Streaming Component
 */
export function SimpleA2UIExample() {
  const [task, setTask] = useState("");
  const { components, isStreaming, error, connect } = useA2UIStream(
    "/api/agents/default/ui-stream",
    { task }
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (task.trim()) {
      await connect();
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">A2UI Streaming Example</h1>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="mb-8">
        <div className="flex gap-2">
          <input
            type="text"
            value={task}
            onChange={(e) => setTask(e.target.value)}
            placeholder="Ask the agent something..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isStreaming}
          />
          <button
            type="submit"
            disabled={isStreaming || !task.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isStreaming ? "Streaming..." : "Send"}
          </button>
        </div>
      </form>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-200 rounded-lg text-red-700">
          Error: {error.message}
        </div>
      )}

      {/* A2UI Components */}
      <div className="space-y-4">
        {components.map((message, index) => (
          <A2UIRenderer key={`${message.id}-${index}`} message={message} />
        ))}
      </div>
    </div>
  );
}

/**
 * Example 2: A2UI with Custom Event Handling
 */
export function InteractiveA2UIExample() {
  const [events, setEvents] = useState<Array<{ id: string; data: unknown }>>([]);

  const handleEvent = (eventId: string, data: unknown) => {
    console.log("Event triggered:", eventId, data);
    setEvents((prev) => [...prev, { id: eventId, data }]);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Interactive A2UI Example</h1>

      {/* Event Log */}
      <div className="mb-6 p-4 bg-gray-100 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Event Log</h2>
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {events.map((event, index) => (
            <div key={index} className="text-sm font-mono">
              {event.id}: {JSON.stringify(event.data)}
            </div>
          ))}
        </div>
      </div>

      {/* Note: Component messages would come from the stream */}
      <p className="text-gray-600">
        Components with interactive elements (buttons, inputs) will trigger events here.
      </p>
    </div>
  );
}

/**
 * Example 3: Manual Server-Sent Events Handling
 */
export function ManualSSEExample() {
  const [components, setComponents] = useState<any[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  const startStream = async () => {
    setIsStreaming(true);
    setComponents([]);

    try {
      const response = await fetch("/api/agents/default/ui-stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          task: "Explain how React works",
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No response body");
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.substring(6);
            try {
              const message = JSON.parse(data);
              if (message.type === "complete") {
                setIsStreaming(false);
                console.log("Stream completed");
              } else if (message.type === "error") {
                console.error("Stream error:", message.error);
                setIsStreaming(false);
              } else {
                // Add component message
                setComponents((prev) => [...prev, message]);
              }
            } catch (e) {
              console.warn("Failed to parse SSE message:", data);
            }
          }
        }
      }
    } catch (error) {
      console.error("Stream error:", error);
      setIsStreaming(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Manual SSE Example</h1>

      <button
        onClick={startStream}
        disabled={isStreaming}
        className="mb-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {isStreaming ? "Streaming..." : "Start Stream"}
      </button>

      <div className="space-y-4">
        {components.map((message, index) => (
          <A2UIRenderer key={`${message.id}-${index}`} message={message} />
        ))}
      </div>
    </div>
  );
}

/**
 * Example 4: Using Different Agents
 */
export function MultiAgentA2UIExample() {
  const [selectedAgent, setSelectedAgent] = useState("default");
  const [task, setTask] = useState("");
  const [components, setComponents] = useState<any[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  const agents = [
    { id: "default", name: "Default Agent", description: "General-purpose assistant" },
    { id: "research", name: "Research Agent", description: "Deep research and analysis" },
    { id: "creative", name: "Creative Agent", description: "Creative writing and ideation" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task.trim()) return;

    setIsStreaming(true);
    setComponents([]);

    try {
      const response = await fetch(`/api/agents/${selectedAgent}/ui-stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ task }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error("No response body");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.substring(6);
            try {
              const message = JSON.parse(data);
              if (message.type === "complete") {
                setIsStreaming(false);
              } else if (message.type !== "error") {
                setComponents((prev) => [...prev, message]);
              }
            } catch (e) {
              console.warn("Failed to parse SSE message");
            }
          }
        }
      }
    } catch (error) {
      console.error("Error:", error);
      setIsStreaming(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Multi-Agent A2UI Example</h1>

      {/* Agent Selection */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        {agents.map((agent) => (
          <button
            key={agent.id}
            onClick={() => setSelectedAgent(agent.id)}
            className={`p-4 rounded-lg border-2 transition-colors ${
              selectedAgent === agent.id
                ? "border-blue-600 bg-blue-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className="font-semibold">{agent.name}</div>
            <div className="text-sm text-gray-600">{agent.description}</div>
          </button>
        ))}
      </div>

      {/* Task Input */}
      <form onSubmit={handleSubmit} className="mb-8">
        <div className="flex gap-2">
          <input
            type="text"
            value={task}
            onChange={(e) => setTask(e.target.value)}
            placeholder="Ask the agent something..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
            disabled={isStreaming}
          />
          <button
            type="submit"
            disabled={isStreaming || !task.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isStreaming ? "Streaming..." : "Send"}
          </button>
        </div>
      </form>

      {/* Components */}
      <div className="space-y-4">
        {components.map((message, index) => (
          <A2UIRenderer key={`${message.id}-${index}`} message={message} />
        ))}
      </div>
    </div>
  );
}
