import { io } from "socket.io-client";
import { SignJWT } from "jose";
const secret = new TextEncoder().encode("c92211f42840f0e6643aac0e72161b606ab86b78af502f4a364161196705fc15");
const token = await new SignJWT({ userId: "000000000000000000000000", scope: "chat" }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("60s").sign(secret);
const s = io("http://localhost:4000", { transports: ["websocket"], auth: { token } });
s.on("connect", () => {
  console.log("CONNECTED", s.id);
  s.emit("message:send", { kind: "dm", id: "000000000000000000000000", content: "hi", type: "text", clientId: "c1" }, (ack) => {
    console.log("ACK:", JSON.stringify(ack));
    s.close(); process.exit(0);
  });
});
s.on("connect_error", (e) => { console.log("CONNECT_ERROR:", e.message); process.exit(1); });
setTimeout(() => { console.log("TIMEOUT"); process.exit(1); }, 6000);
