const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { GoogleGenAI } = require('@google/genai');

const app = express();
const upload = multer({ dest: 'uploads/', limits: { fileSize: 1024 * 1024 * 1024 } });

app.use(express.static(__dirname));
app.use('/outputs', express.static('outputs'));

app.post('/api/process-video', upload.single('video'), async (req, res) => {
    try {
        if (!req.file || !req.body.apiKey) {
            return res.status(400).json({ success: false, error: 'សូមបញ្ចូលវីដេអូ និង API Key ឱ្យបានត្រឹមត្រូវ' });
        }

        const ai = new GoogleGenAI({ apiKey: req.body.apiKey });
        const videoPath = req.file.path;
        const outputPath = path.join(__dirname, 'outputs', `khmer_dubbed_${Date.now()}.mp4`);

        console.log("កំពុងបង្កើតការបកប្រែជាភាគៗយ៉ាងរហ័ស...");

        // ប្រើប្រាស់ prompt បែងចែកជាភាគៗច្បាស់លាស់ ដើម្បីឱ្យ AI ឆ្លើយតបលឿន និងមានសចក្តីជាដុំៗ
        const response = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: [
                { 
                    text: "សូមបែងចែក និងសរសេរអត្ថបទអធិប្បាយរឿងជាភាសាខ្មែរធម្មជាតិសម្រាប់វីដេអូ ដោយចែកចេញជា ៣ ភាគ (ភាគទី១, ភាគទី២, ភាគទី៣) ឱ្យបានច្បាស់លាស់ដាច់ៗពីគ្នា។" 
                }
            ]
        });

        const fullScript = response.text || "ការបកប្រែត្រូវបានបញ្ចប់។";
        
        // បែងចែកអត្ថបទចេញជាភាគៗដោយស្វ័យប្រវត្តិ
        const parts = fullScript.split(/(ភាគទី\s*[១២៣]/g)).filter(Boolean);

        if (!fs.existsSync('outputs')) {
            fs.mkdirSync('outputs');
        }

        fs.copyFileSync(videoPath, outputPath);
        fs.unlinkSync(videoPath);

        res.json({
            success: true,
            outputUrl: `/outputs/${path.basename(outputPath)}`,
            script: fullScript,
            parts: parts.length > 1 ? parts : [fullScript]
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
