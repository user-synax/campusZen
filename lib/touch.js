// Touch gesture helpers for context-menu — minimal stub
export const TOUCH_GESTURE_CONTENT_CLASS = "touch-manipulation select-none";

export function holdSelection(el) {
    if (typeof document === "undefined") return () => {};
    const bodyPrev = document.body.style.userSelect;
    const elPrev = el?.style?.userSelect;
    if (document.body) document.body.style.userSelect = "none";
    if (el?.style) el.style.userSelect = "none";
    return () => {
        if (document.body) document.body.style.userSelect = bodyPrev;
        if (el?.style) el.style.userSelect = elPrev || "";
    };
}
