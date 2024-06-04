const express = require("express");
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

async function convertTextToImage(text) {
  let response = await fetch(
    "https://api-inference.huggingface.co/models/OFA-Sys/small-stable-diffusion-v0",
    {
      headers: {
        Authorization: "Bearer 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"
      },
      method: "POST",
      body: JSON.stringify(text)
    }
  ).then((data) => data.json());

  return response;
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
    let blob = convertTextToImage(req.body.text);

    let img = new Image();
    let canvas = document.createElement("Canvas");
  
    let data = [];
  
    img.addEventListener("load", () => {
      canvas.width = img.width;
      canvas.height = img.height;
  
      let ctx = canvas.getContext("2d");
  
      ctx.drawImage(img, 0, 0);
  
      let imgSize = 128;
      let af = img.width / imgSize;
  
      for (let h = 0; h < img.height; h += af) {
        data.push([]);
  
        for (let w = 0; w < img.width; w += af) {
          let imgData = ctx.getImageData(w, h, 1, 1);
  
          let red = imgData.data[0];
          let green = imgData.data[1];
          let blue = imgData.data[2];
  
          data[data.length - 1].push([red, green, blue]);
        }
      }

      res.json(data);
    });
  
    img.src = URL.createObjectURL(blob);
  }
});

const server = app.listen(port);
