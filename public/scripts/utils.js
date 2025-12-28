export async function translateIfEnglish(text) {
  // 1. Helper: Heuristic-based detection to see if the text contains significant English content
  function likelyContainsEnglish(t) {
    const words = t.split(/\s+/).filter(Boolean);
    if (words.length === 0) return false;

    // Check for words with at least 3 Latin characters
    const enWords = words.filter((w) => /[A-Za-z]{3,}/.test(w));
    const enCharCount = (t.match(/[A-Za-z]/g) || []).length;

    // If more than 15% of words are English or there are more than 30 Latin chars, trigger translation
    if (enWords.length / words.length >= 0.15) return true;
    if (enCharCount > 30) return true;
    return false;
  }

  // If no significant English is detected, return the original text immediately
  if (!likelyContainsEnglish(text)) return text;

  // 2. Helper: Splits the text into blocks of "Latin" and "Non-Latin" scripts
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

  // 3. Simple Approach: If the English part is small, translate the whole string at once
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

  // 4. Advanced Approach: Translate only the Latin segments in parallel
  // This preserves Farsi words that might be mixed in the English text
  const translatedParts = await Promise.all(
    parts.map(async (p) => {
      if (!p.isLatin) return p.text; // Skip translation for Non-Latin parts
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

  // Re-join the translated segments back into a single string
  return translatedParts.join("");
}

// Generates a random dark-themed color for map styling (Districts).
// Uses a fixed prefix to ensure the colors remain within a specific palette.
export function getRandomColor() {
  return "#1c375" + Math.floor(Math.random() * 16).toString(16);
}
