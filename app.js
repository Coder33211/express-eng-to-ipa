const express = require("express");
const jpeg = require("jpeg-js");
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
  let buffer = await blob.arrayBuffer().then(buf => Buffer.from(buf));
  // Decode JPEG Buffer to raw image data
  let rawImageData = jpeg.decode(buffer, { useTArray: true });

  let { width, height, data } = rawImageData;

  // Convert raw image data to a 2D array of pixels
  let pixels = [];
  
  for (let y = 0; y < height; y += 4) {
    let row = [];
    for (let x = 0; x < width; x += 4) {
      let idx = (y * width + x) * 4;
      // let pixel = {
      //   r: data[idx],
      //   g: data[idx + 1],
      //   b: data[idx + 2],
      //   a: data[idx + 3], // JPEG images don't have alpha, so it will be 255
      // };
      row.push([data[idx], data[idx + 1], data[idx + 2]]);
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
