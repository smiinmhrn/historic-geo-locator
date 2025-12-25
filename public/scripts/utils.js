// utils.js
export async function translateIfEnglish(text) {
  function likelyContainsEnglish(t) {
    const words = t.split(/\s+/).filter(Boolean);
    if (words.length === 0) return false;
    const enWords = words.filter((w) => /[A-Za-z]{3,}/.test(w));
    const enCharCount = (t.match(/[A-Za-z]/g) || []).length;
    if (enWords.length / words.length >= 0.15) return true;
    if (enCharCount > 30) return true;
    return false;
  }

  if (!likelyContainsEnglish(text)) return text;

  function splitByScript(t) {
    const parts = [];
    let cur = "";
    let curIsLatin = null;
    for (const ch of t) {
      const isLatin = /[A-Za-z0-9]/.test(ch);
      if (curIsLatin === null) {
        curIsLatin = isLatin;
        cur = ch;
      } else if (isLatin === curIsLatin) {
        cur += ch;
      } else {
        parts.push({ text: cur, isLatin: curIsLatin });
        cur = ch;
        curIsLatin = isLatin;
      }
    }
    if (cur) parts.push({ text: cur, isLatin: curIsLatin });
    return parts;
  }

  const parts = splitByScript(text);
  const totalLatinChars = (text.match(/[A-Za-z]/g) || []).length;
  if (totalLatinChars < 50) {
    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await response.json();
      return data.translated || text;
    } catch (e) {
      console.error("Translation error", e);
      return text;
    }
  }

  const translatedParts = await Promise.all(
    parts.map(async (p) => {
      if (!p.isLatin) return p.text;
      try {
        const response = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: p.text }),
        });
        const data = await response.json();
        return data.translated || p.text;
      } catch (e) {
        console.error("Segment translation error", e);
        return p.text;
      }
    })
  );
  return translatedParts.join("");
}

export function getRandomColor() {
  return "#1c375" + Math.floor(Math.random() * 16).toString(16);
}