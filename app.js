const express = require("express");
const Jimp = require("jimp");
const app = express();
const port = process.env.PORT || 3001;
// const fs = require("fs").promises;
// const path = require("path");

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

async function convertTextToImageData(text, token) {
  let resp = await fetch(
    "https://api-inference.huggingface.co/models/OFA-Sys/small-stable-diffusion-v0",
    {
      headers: {
        Authorization: "Bearer " + token
      },
      method: "POST",
      body: JSON.stringify({inputs: text})
    }
  );

  if (!resp.ok) {
    return false;
  }

  let buffer = await resp.arrayBuffer();
  buffer = Buffer.from(buffer);
  // Use Jimp to read the temporary image file
  let image = await Jimp.read(buffer);

  let width = image.bitmap.width;
  let height = image.bitmap.height;

  // Initialize a double-nested array to store RGB data
  let rgbData = [];

  // Iterate through each pixel
  for (let y = 0; y < height; y++) {
    let row = [];
    
    for (let x = 0; x < width; x++) {
      let pixelColor = Jimp.intToRGBA(image.getPixelColor(x, y));
      
      row.push([pixelColor.r, pixelColor.g, pixelColor.b]);
    }
    
    rgbData.push(row);
  }
  
  return rgbData;
}

app.post("/", async (req, res) => {
  let text = req.body.text;
  
  if (req.body.type == "text") {
    let rawIPA = await convertEngToIPA(text);
  
    if (rawIPA) {
      let filteredIPA = filterIPA(rawIPA);
      
      res.send(filteredIPA);

      return;
    } else {
      res.send(false);
      
      return;
    }
  } else if (req.body.type == "img") {
    let token = req.body.token;

    if (!token) {
      res.send(false);

      return;
    }
    
    let rgbData = await convertTextToImageData(text, token);

    if (rgbData) {
      res.json(rgbData);

      return;
    } else {
      res.send(false);

      return;
    }
  }

  res.send(false);
});

const server = app.listen(port);
