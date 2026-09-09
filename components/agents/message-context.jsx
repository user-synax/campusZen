"use client";

import { createContext } from "react";

// Mirrors beui.dev pattern: provides "start" | "end" alignment for bubbles
// inside a MessageBubbleGroup. Defaults to "start" (received).
export const MessageSideContext = createContext("start");
export const MessageGroupContext = createContext(null);
