"use client";

import { createContext, useContext, useEffect, useState } from "react";

const LayoutModeContext = createContext({
    layoutMode: "sidebar",
    setLayoutMode: () => {},
});

const STORAGE_KEY = "cx_layout_mode";

export function LayoutModeProvider({ children }) {
    const [layoutMode, setLayoutModeState] = useState("sidebar");

    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === "sidebar" || stored === "dock") {
            setLayoutModeState(stored);
        }
    }, []);

    const setLayoutMode = (mode) => {
        if (mode !== "sidebar" && mode !== "dock") return;
        localStorage.setItem(STORAGE_KEY, mode);
        setLayoutModeState(mode);
    };

    return (
        <LayoutModeContext.Provider value={{ layoutMode, setLayoutMode }}>
            {children}
        </LayoutModeContext.Provider>
    );
}

export function useLayoutMode() {
    const context = useContext(LayoutModeContext);
    if (context === undefined) {
        throw new Error("useLayoutMode must be used within a LayoutModeProvider");
    }
    return context;
}
