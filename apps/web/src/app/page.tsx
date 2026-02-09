"use client";

import { useState, useRef, useEffect } from "react";

export default function HomePage() {
  const [age, setAge] = useState("");
  const [condition, setCondition] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll like chat apps
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleCheck() {
    if (!age || !condition) {
      alert("Please enter age and condition");
      return;
    }

    // 1️⃣ Show user message
    setMessages(prev => [
      ...prev,
      { role: "user", text: `I am ${age} years old and I have ${condition}` },
    ]);

    setLoading(true);

    // 2️⃣ Show assistant thinking
    setMessages(prev => [
      ...prev,
      { role: "assistant", text: "🔍 Searching clinical trials for you..." },
    ]);

    try {
      const res = await fetch("/api/eligibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          age: Number(age),
          condition,
        }),
      });

      const data = await res.json();

      // 3️⃣ Show result summary
      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          text: `🧬 I found ${data.trials.length} relevant clinical trials.`,
        },
      ]);

      // 4️⃣ Show trials as cards
      data.trials.forEach((trial: any) => {
        const eligible =
          data.eligibility.find((e: any) => e.trialId === trial.id)?.eligible;

        setMessages(prev => [
          ...prev,
          {
            role: "trial",
            trial,
            eligible,
            reasoning: data.reasoning,
          },
        ]);
      });

      // 5️⃣ Disclaimer (guardrail)
      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          text:
            "⚠️ This tool provides informational assistance only and does not replace professional medical advice.",
        },
      ]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          text: "❌ Something went wrong. Please try again.",
        },
      ]);
    }

    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="p-4 text-center border-b bg-white">
        <h1 className="text-2xl font-bold">🧠 Clinical Trial Assistant</h1>
        <p className="text-sm text-gray-600">
          Find and understand clinical trials easily
        </p>
      </header>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => {
          if (msg.role === "user") {
            return (
              <div key={i} className="flex justify-end">
                <div className="bg-blue-600 text-white p-3 rounded-xl max-w-sm">
                  {msg.text}
                </div>
              </div>
            );
          }

          if (msg.role === "assistant") {
            return (
              <div key={i} className="flex justify-start">
                <div className="bg-gray-200 p-3 rounded-xl max-w-sm">
                  {msg.text}
                </div>
              </div>
            );
          }

          if (msg.role === "trial") {
            return (
              <div key={i} className="bg-white p-4 rounded-xl shadow border">
                <h3 className="font-semibold text-lg">{msg.trial.title}</h3>
                <p className="text-sm text-gray-600">
                  Location: {msg.trial.location}
                </p>
                <p className="mt-2">
                  Eligible:{" "}
                  {msg.eligible ? (
                    <span className="text-green-600 font-bold">✔ Yes</span>
                  ) : (
                    <span className="text-red-600 font-bold">✖ No</span>
                  )}
                </p>
                <p className="text-sm text-gray-700 mt-2">
                  🧠 {msg.reasoning}
                </p>
              </div>
            );
          }
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t bg-white space-y-3">
        <input
          type="number"
          placeholder="Your age"
          value={age}
          onChange={e => setAge(e.target.value)}
          className="w-full border rounded-lg p-3"
        />
        <input
          type="text"
          placeholder="Condition (e.g. Diabetes)"
          value={condition}
          onChange={e => setCondition(e.target.value)}
          className="w-full border rounded-lg p-3"
        />
        <button
          onClick={handleCheck}
          className="w-full bg-blue-600 text-white p-3 rounded-lg"
        >
          {loading ? "Searching..." : "Check Eligibility"}
        </button>
      </div>
    </main>
  );
}
