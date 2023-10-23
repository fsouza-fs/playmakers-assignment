const express = require('express');
const multer = require('multer');
const getColors = require('get-image-colors');

const jimp = require('jimp');
const Color = require('color');

const path = require('path');
const bodyParser = require('body-parser');

const upload = multer({ dest: 'upload/' });
const app = express();

const PORT = process.env.PORT || 3000;

function isImageWithinCircle(image) {
    let isImageWithinCircle = true;

    // Check that all non-transparent pixels are within a circle
    const radius = 256; // Because we know the image is 512x512
    image.scan(0, 0, image.bitmap.width, image.bitmap.height, function(x, y, idx) {
      const distance = Math.sqrt(
        Math.pow(x - radius, 2) + Math.pow(y - radius, 2)
      );
      
      if (distance > radius) {
        // Making sure pixels outside the circle are transparent
        if (this.bitmap.data[idx + 3] !== 0) {
          isImageWithinCircle = false;
        }
      }
    });

    return isImageWithinCircle;
}

async function getImageAvg(image) {
    try {
        // Variables to accumulate saturation and lightness values
        let totalSaturation = 0;
        let totalLightness = 0;
        let totalPixels = image.bitmap.width * image.bitmap.height;

        // Scan all pixels
        image.scan(0, 0, image.bitmap.width, image.bitmap.height, function(x, y, idx) {
            // Get the RGB values
            let red = this.bitmap.data[idx + 0];
            let green = this.bitmap.data[idx + 1];
            let blue = this.bitmap.data[idx + 2];
            let alpha = this.bitmap.data[idx + 3];

            // Skip transparent pixels
            if (alpha === 0) {
                totalPixels -= 1; // don't count fully transparent pixels
                return;
            }

            // Convert RGB to HSL using the color library
            let hsl = Color.rgb([red, green, blue]).hsl();
            let s = hsl.color[1]; // saturation
            let l = hsl.color[2]; // lightness

            // Accumulate the saturation and lightness
            totalSaturation += s
            totalLightness += l
        });

        if (totalPixels === 0) {
            console.error('No opaque pixels found in the image.');
            return { avgSaturation: 0, avgLightness: 0 };
        }

        // Calculate the average saturation and lightness
        let avgSaturation = totalSaturation / totalPixels;
        let avgLightness = totalLightness / totalPixels;

        return { avgSaturation, avgLightness };
    } catch (error) {
        console.error(error);
        throw error;
    }
}

async function getColorsFromImage(image) {
    try {
        // Convert the Jimp image to a Buffer
        const buffer = await image.getBufferAsync(jimp.MIME_PNG);
        
        return await getColors(buffer, { type: 'image/png' });
    } catch (error) {
        console.error('Error getting colors from image:', error);
        throw error;
    }
}

async function getBorderColor(image) {
    try {
        const colors = await getColorsFromImage(image);
        const dominantColor = Color.rgb(colors[0]._rgb);

        // Convert RGB to HSL
        const dominantHsl = Color(dominantColor).hsl();

        let complementaryHue = (dominantHsl.color[0] + 180) % 360;

        // Use avgSaturation and avgLightness for vibrancy and brightness
        let { avgSaturation, avgLightness } = await getImageAvg(image);
        avgSaturation = Math.max(avgSaturation, 60); 
        avgLightness = Math.min(Math.max(avgLightness, 40), 60);

        // Generate border color and adjust using avgSaturation and avgLightness
        let borderColor = Color.hsl([complementaryHue, avgSaturation, avgLightness]);

        return borderColor.hex(); 
    } catch (error) {
        console.error(error);
        throw error;
    }
}

async function processImage(filePath) {
    try {
        let image = await jimp.read(filePath);
    
        // Check for correct size
        if (image.bitmap.width !== 512 || image.bitmap.height !== 512) {
            image.resize(512, 512);
        }
    
        // Check for circle
        if (!isImageWithinCircle(image)) {
            // Create a circular mask with a white circle on a black background
            const mask = new jimp(512, 512, 0x00000000); // black background, fully transparent
            const circle = new jimp(512, 512, 0xFFFFFFFF); // white circle
        
            circle.scan(0, 0, circle.bitmap.width, circle.bitmap.height, function (x, y, idx) {
            const distance = Math.sqrt(
                Math.pow(x - 256, 2) + Math.pow(y - 256, 2)
            );
            if (distance > 256) {
                this.bitmap.data[idx + 0] = 0;
                this.bitmap.data[idx + 1] = 0;
                this.bitmap.data[idx + 2] = 0;
                this.bitmap.data[idx + 3] = 0;
            }
            });

            mask.composite(circle, 0, 0);

            image.mask(mask, 0, 0);
        }

        const borderColor = await getBorderColor(image);
        
        return { processedImage: image, borderColor: borderColor };
    } catch (error) {
        console.error(error);
        throw error;
    }
}

app.post('/upload', upload.single('avatar'), async (req, res) => {
  try {
    const fs = require('fs');
    const outputDirectory = path.join(__dirname, 'output');
    if (!fs.existsSync(outputDirectory)){
        fs.mkdirSync(outputDirectory, { recursive: true });
    }

    const { processedImage, borderColor } = await processImage(req.file.path)
    const outputFilePath = `output/${req.file.originalname.split('.').slice(0, -1).join('.') + '.png'}`;
    await processedImage.writeAsync(outputFilePath);
    const imageUrl = `${req.protocol}://${req.get('host')}/${outputFilePath}`;
    res.status(200).json({ imageUrl, borderColor }); // Return the image URL and border color
  } catch (error) {
    res.status(500).send(error.message);
  }
});


app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'static')));
app.use('/output', express.static(path.join(__dirname, 'output')));

// Route to serve the static files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}.`);
});
