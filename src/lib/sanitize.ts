const BANNED = [
  "kill yourself",
  "死ね",
  "氏ね",
  "うんこ",
  "fuck",
  "shit",
  "bitch",
  "rape",
  "sex",
];

export function containsBannedWord(text: string) {
  const lowered = text.toLowerCase();
  return BANNED.some((w) => lowered.includes(w));
}

export function sanitizeText(text: string, maxLen = 500) {
  const trimmed = text.trim().slice(0, maxLen);
  // Strip HTML/script
  return trimmed.replace(/[<>]/g, "");
}

export function sanitizeName(name: string, maxLen = 24) {
  return name.replace(/[^\w぀-ヿ㐀-鿿\- ]/g, "").trim().slice(0, maxLen);
}
