import { create } from "zustand";

export const useCallStore = create((set) => ({
    // calls: { [groupId]: { active, participantCount, participants: [{userId,name,avatar}] } }
    calls: {},
    setCall: (groupId, data) =>
        set((s) => ({ calls: { ...s.calls, [groupId]: data } })),
    clearCall: (groupId) =>
        set((s) => {
            const calls = { ...s.calls };
            delete calls[groupId];
            return { calls };
        }),
}));
