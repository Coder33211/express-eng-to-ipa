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
  getPixels(buffer, async (err, pixels) => {
    if (err) {
        throw new Error('Error decoding image:', err);
    }

    const width = pixels.shape[0];
    const height = pixels.shape[1];
    const channels = pixels.shape[2];

    // Initialize a double-nested array to store RGB data
    const rgbData = [];

    // Iterate through each pixel
    for (let y = 0; y < height; y++) {
        const row = [];
        for (let x = 0; x < width; x++) {
            const pixel = [];
            for (let c = 0; c < channels; c++) {
                pixel.push(pixels.get(x, y, c));
            }
            row.push(pixel);
        }
        rgbData.push(row);
    }

    // Now rgbData contains the RGB data of the image
    console.log(rgbData);
});
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
