"use client";

import { FeedbackWidget } from "@/components/motion/feedback-widget";

export function FeedbackWidgetMount() {
  const handleSubmit = async ({ message }) => {
    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        path:
          typeof window !== "undefined" ? window.location.pathname : null,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to send feedback");
    }

    return res.json();
  };

  return (
    <div className="fixed bottom-0 right-0 z-[60] hidden md:block">
      <FeedbackWidget onSubmit={handleSubmit} />
    </div>
  );
}
