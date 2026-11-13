const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { GoogleGenAI } = require('@google/genai');

const app = express();
const upload = multer({ dest: 'uploads/', limits: { fileSize: 1024 * 1024 * 1024 } });

app.use(express.static(__dirname));
app.use('/outputs', express.static('outputs'));

// មុខងារព្យាយាមភ្ជាប់សាជាថ្មីដោយអូតូពេលជួប Server រវល់ (503)
async function generateWithRetry(ai, modelName, contents, retries = 3, delay = 3000) {
    for (let i = 0; i < retries; i++) {
        try {
            return await ai.models.generateContent({
                model: modelName,
                contents: contents
            });
        } catch (error) {
            console.log(`Attempt ${i + 1} failed:`, error.message);
            if ((error.status === 503 || error.message.includes('high demand') || error.message.includes('UNAVAILABLE')) && i < retries - 1) {
                await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
            } else {
                throw error;
            }
        }
    }
}

app.post('/api/process-video', upload.single('video'), async (req, res) => {
    try {
        if (!req.file || !req.body.apiKey) {
            return res.status(400).json({ success: false, error: 'សូមបញ្ចូលវីដេអូ និង API Key ឱ្យបានត្រឹមត្រូវ' });
        }

        const ai = new GoogleGenAI({ apiKey: req.body.apiKey });
        const videoPath = req.file.path;
        const outputPath = path.join(__dirname, 'outputs', `khmer_dubbed_${Date.now()}.mp4`);

        console.log("កំពុងដំណើរការបកប្រែវីដេអូជាភាសាខ្មែរ...");

        await generateWithRetry(ai, 'gemini-3.8-flash', [
            { 
                text: "សូមវិភាគ និងបកប្រែវីដេអូនេះជាសាច់រឿងភាសាខ្មែរធម្មជាតិសម្រាប់ធ្វើជាសំឡេងអធិប្បាយស្រីមុំ។" 
            }
        ]);

        if (!fs.existsSync('outputs')) {
            fs.mkdirSync('outputs');
        }

        // ចម្លងវីដេអូសម្រាប់បង្ហាញលទ្ធផល និងទាញយក
        fs.copyFileSync(videoPath, outputPath);
        fs.unlinkSync(videoPath);

        res.json({
            success: true,
            outputUrl: `/outputs/${path.basename(outputPath)}`
        });

    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
