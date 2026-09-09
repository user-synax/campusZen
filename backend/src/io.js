// Singleton so the HTTP emit API can reach the Socket.IO server instance.
let _io = null;

export function setIo(io) {
    _io = io;
}

export function getIo() {
    if (!_io) {
        throw new Error(
            "[emit] Socket.IO not initialized — /api/emit called before server start",
        );
    }
    return _io;
}
