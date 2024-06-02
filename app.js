const express = require("express");
const app = express();
const port = process.env.PORT || 3001;

app.use(express.json());

function filterIPA(text) {
  let bad = ["ˈ", "ˌ", "ː"];

  let filtered = "";

  for (let i = 0; i < ipa.length; i++) {
    if (!bad.includes(text[i])) {
      filtered += text[i];
    }
  }

  filtered = filtered.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  return filtered;
}

app.post("/", (req, res) => {
  let text = req.body.text;

  fetch("https://api2.unalengua.com/ipav3", {
    method: "POST",
    body: JSON.stringify({ text: text, lang: "en-US", mode: true })
  }).then((data) => data.json()).then((textData) => res.send(filterIPA(textData)));
});

const server = app.listen(port);
