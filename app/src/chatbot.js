// chatbot.js — Claude-powered wallet assistant (browser-side)
// Calls a backend /api/chat endpoint that holds the Anthropic API key server-side.

/**
 * Send a user message and get back the assistant's reply.
 * walletState is passed as context so the backend can inject wallet details.
 *
 * @param {string} userMessage
 * @param {object|null} walletState
 * @returns {Promise<string>}
 */
export async function chat(userMessage, walletState) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: userMessage, wallet: walletState }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Chat API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.reply;
}
