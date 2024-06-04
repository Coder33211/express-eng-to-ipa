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
  let blob = await fetch(
    "https://api-inference.huggingface.co/models/OFA-Sys/small-stable-diffusion-v0",
    {
      headers: {
        Authorization: "Bearer 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"
      },
      method: "POST",
      body: JSON.stringify(text)
    }
  ).then((data) => data.blob());
  
  // Convert Blob to Buffer
  let buffer = await blob.arrayBuffer();
  let imageData = await sharp(buffer).extract({left: 0, top: 0, width: 512, height: 512});
  let pixelData = imageData.data;

  let pixels = [];
  for (let y = 0; y < 512; y+=4) {
    let row = [];
    for (let x = 0; x < 512; x+=4) {
      let offset = (y * 512 * 4) + (x * 4); // Calculate offset for each pixel (assuming RGBA format)
      let red = pixelData[offset];
      let green = pixelData[offset + 1];
      let blue = pixelData[offset + 2];
      row.push([ red, green, blue ]);
    }
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
