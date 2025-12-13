export default async function handler(req, res) {
  const { text } = req.body;

  try {
    // فقط پاراگراف اول را برداریم
    const firstParagraph = text.split("\n\n")[0].trim();

    const url =
      "https://translate.googleapis.com/translate_a/t?" +
      new URLSearchParams({
        client: "gtx",
        sl: "auto",
        tl: "fa",
        dt: "t",
        q: firstParagraph,
      });

    const response = await fetch(url);
    const json = await response.json();

    const translated = json[0]?.[0] || firstParagraph;

    res.status(200).json({ translated });
  } catch (err) {
    res.status(500).json({ translated: text });
  }
}
