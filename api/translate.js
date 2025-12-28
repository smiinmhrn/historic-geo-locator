export default async function handler(req, res) {
  // 1. Extract the 'text' to be translated from the request body
  const { text } = req.body;

  console.log(`\n--- [Translate API] Start Translation ---`);
  console.log(
    `[Translate API] Input Text (First 50 chars): "${text?.substring(
      0,
      50
    )}..."`
  );

  try {
    // 2. Optimization: Take only the first paragraph to speed up the translation process
    // This splits the text by double newlines and takes the first segment
    const firstParagraph = text.split("\n\n")[0].trim();

    // 3. Construct the Google Translate API URL
    // client: "gtx" - specific client identifier for the public API
    // sl: "auto" - Source Language (set to auto-detect)
    // tl: "fa" - Target Language (set to Persian/Farsi)
    // q: the query text to translate
    const url =
      "https://translate.googleapis.com/translate_a/t?" +
      new URLSearchParams({
        client: "gtx",
        sl: "auto",
        tl: "fa",
        dt: "t",
        q: firstParagraph,
      });

    // 4. Send the request to Google's translation service
    const response = await fetch(url);
    const json = await response.json();

    // 5. Extract the translated string from the nested JSON array response
    // Fallback: Use the original paragraph if the translation fails
    const translated = json[0]?.[0] || firstParagraph;

    console.log(
      `[Translate API] Translated Result: "${translated.substring(0, 50)}..."`
    );

    // 6. Return the translated text to the client
    res.status(200).json({ translated });
  } catch (err) {
    // 7. Error Handling: Log the error and return the original text as a fallback
    console.error("[Translate API] Translation Error:", err);
    res.status(500).json({ translated: text });
  }
}
