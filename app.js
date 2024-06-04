const express = require("express");
const sharp = require("sharp");
const app = express();
const port = process.env.PORT || 3001;

app.use(express.json());

function filterIPA(ipa) {
  let bad = ["ˈ", "ˌ", "ː"];

  let filtered = "";

  for (let i = 0; i < ipa.length; i++) {
    if (!bad.includes(ipa[i])) {
      filtered += ipa[i];
    }
  }

  filtered = filtered.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  return filtered;
}

async function convertEngToIPA(text) {
  let data = await fetch("https://api2.unalengua.com/ipav3", {
    method: "POST",
    body: JSON.stringify({ text: text, lang: "en-US", mode: true })
  })
    .then((data) => data.json())
    .then((data) => data.ipa);

  return data;
}

async function convertTextToImageData(text) {
  let resp = await fetch(
    "https://api-inference.huggingface.co/models/OFA-Sys/small-stable-diffusion-v0",
    {
      headers: {
        Authorization: "Bearer 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"
      },
      method: "POST",
      body: JSON.stringify(text)
    }
  );
  
  // Convert Blob to Buffer
  let buffer = await resp.arrayBuffer();
  buffer = Buffer.from(buffer);
  
  let metadata = await sharp(buffer).metadata();
  let { width, height } = metadata;

  // Extract pixel RGB data
  let pixels = [];

  // Iterate over each pixel row
  for (let y = 0; y < height; y+=4) {
      const row = [];
      // Iterate over each pixel column
      for (let x = 0; x < width; x+=4) {
          // Get pixel color
          const pixel = await sharp(buffer)
              .ensureAlpha()
              .extract({ left: x, top: y, width: 1, height: 1 })
              .raw()
              .toBuffer();

          // Extract RGB values
          const r = pixel[0];
          const g = pixel[1];
          const b = pixel[2];

          // Push RGB values to the row array
          row.push([r, g, b]);
      }
      // Push the row array to the main array
      pixels.push(row);
  }

  return pixels;
}

app.post("/", async (req, res) => {
  if (req.body.type == "text") {
    let text = req.body.text;

    let rawIPA = await convertEngToIPA(text);
  
    if (rawIPA) {
      let filteredIPA = filterIPA(rawIPA);
      
      res.send(filteredIPA);
    } else {
      res.send(false);
    }
  } else if (req.body.type == "img") {
    let data = await convertTextToImageData(req.body.text);

    res.json(data);
  }
});

const server = app.listen(port);
