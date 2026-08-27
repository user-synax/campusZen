// Server-side content validation for uploaded files.
// Guards against MIME/extension spoofing by inspecting the REAL leading bytes
// of the file rather than trusting the client-declared `file.type`.

// Inspect only the first few bytes (no need to buffer the whole file).
export async function readHeadFromBlob(file, n = 64) {
    try {
        const ab = await file.slice(0, n).arrayBuffer();
        return new Uint8Array(ab).subarray(0, n);
    } catch {
        return null;
    }
}

// Returns the detected image MIME (one of the known-safe set) or null.
export function detectImageType(head) {
    if (!head || head.length < 4) return null;

    // JPEG: FF D8 FF
    if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) {
        return "image/jpeg";
    }
    // PNG: 89 50 4E 47
    if (
        head[0] === 0x89 &&
        head[1] === 0x50 &&
        head[2] === 0x4e &&
        head[3] === 0x47
    ) {
        return "image/png";
    }
    // WebP: RIFF....WEBP
    if (
        head.length >= 12 &&
        head[0] === 0x52 && head[1] === 0x49 && head[2] === 0x46 && head[3] === 0x46 &&
        head[8] === 0x57 && head[9] === 0x45 && head[10] === 0x42 && head[11] === 0x50
    ) {
        return "image/webp";
    }
    // GIF: GIF8
    if (
        head[0] === 0x47 && head[1] === 0x49 && head[2] === 0x46 && head[3] === 0x38
    ) {
        return "image/gif";
    }
    return null;
}

export function isPdfMagic(head) {
    return !!(
        head &&
        head.length >= 4 &&
        head[0] === 0x25 && head[1] === 0x50 && head[2] === 0x44 && head[3] === 0x46
    );
}

// Validate an image Blob against an allow-list of MIME types by inspecting
// its magic bytes. Returns true only if the detected type is in `allowedMimes`.
export async function verifyImageBlob(file, allowedMimes) {
    const head = await readHeadFromBlob(file);
    const detected = detectImageType(head);
    if (!detected) return false;
    return allowedMimes.includes(detected);
}

// Validate an ID-card Blob that may be an image OR a PDF.
export async function verifyIdCardBlob(file, allowedMimes) {
    const head = await readHeadFromBlob(file);
    if (!head) return false;
    if (isPdfMagic(head)) return allowedMimes.includes("application/pdf");
    const detected = detectImageType(head);
    if (!detected) return false;
    return allowedMimes.includes(detected);
}
