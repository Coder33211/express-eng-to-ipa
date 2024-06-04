const express = require("express");
const Jimp = require("jimp");
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

  let buffer = await resp.arrayBuffer();
  buffer = Buffer.from(buffer);

  const tempFilePath = path.join("", "temp_image.jpg");
  await fs.writeFile(tempFilePath, buffer);

  // Use Jimp to read the temporary image file
  const image = await Jimp.read(tempFilePath);

  // Remove the temporary file
  await fs.unlink(tempFilePath);

  const width = image.bitmap.width;
  const height = image.bitmap.height;

  // Initialize a double-nested array to store RGB data
  const rgbData = [];

  // Iterate through each pixel
  for (let y = 0; y < height; y++) {
    const row = [];
    for (let x = 0; x < width; x++) {
      const pixelColor = Jimp.intToRGBA(image.getPixelColor(x, y));
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
    } else {
      res.send(false);
    }
  } else if (req.body.type == "img") {
    let rgbData = await convertTextToImageData(text);

    res.json(rgbData);
  }
});

const server = app.listen(port);
