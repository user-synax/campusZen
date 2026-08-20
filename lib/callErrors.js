export function micErrorMessage(err) {
    const name = err?.name || "";
    switch (name) {
        case "NotAllowedError":
        case "SecurityError":
            return "Microphone access denied. Allow mic permission in your browser's site settings and rejoin.";
        case "NotFoundError":
        case "DevicesNotFoundError":
            return "No microphone detected on this device. Connect a mic/headset or join from a device that has one.";
        case "NotReadableError":
        case "TrackStartError":
            return "Microphone is being used by another app. Close other apps using the mic and try again.";
        default:
            return "Could not connect to the microphone. Check your device and try again.";
    }
}
