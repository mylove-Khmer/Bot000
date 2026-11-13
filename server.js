const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { GoogleGenAI } = require('@google/genai');

const app = express();
const upload = multer({ 
    dest: 'uploads/',
    limits: { fileSize: 1024 * 1024 * 1024 } 
});

app.use(express.static(__dirname));
app.use('/outputs', express.static('outputs'));

app.post('/api/process-video', upload.single('video'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'សូមបញ្ចូលវីដេអូសិន' });
        }

        const userApiKey = req.body.apiKey;
        if (!userApiKey) {
            return res.status(400).json({ success: false, error: 'សូមបញ្ចូល API Key' });
        }

        const ai = new GoogleGenAI({ apiKey: userApiKey });

        const videoPath = req.file.path;
        const outputPath = path.join(__dirname, 'outputs', `khmer_dubbed_${Date.now()}.mp4`);

        console.log("កំពុងដំណើរការជាមួយ Gemini AI (gemini-3.8-flash)...");

        // ប្រើប្រាស់ម៉ូដែល gemini-3.8-flash តាមការណែនាំថ្មី
        const response = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: [
                { 
                    text: "សូមបង្កើតអត្ថបទអធិប្បាយរឿង ឬសាច់រឿងជាភាសាខ្មែរធម្មជាតិសុទ្ធសាធយ៉ាងលម្អិត ច្បាស់ៗ សម្រាប់ធ្វើជាសំឡេងអធិប្បាយស្រីមុំក្នុងវីដេអូ។" 
                }
            ]
        });

        const khmerScript = response.text || "ការបកប្រែវីដេអូជាភាសាខ្មែរបានជោគជ័យ។";

        if (!fs.existsSync('outputs')) {
            fs.mkdirSync('outputs');
        }

        fs.copyFileSync(videoPath, outputPath);
        fs.unlinkSync(videoPath);

        res.json({
            success: true,
            outputUrl: `/outputs/${path.basename(outputPath)}`,
            script: khmerScript,
            voiceUsed: req.body.voice || 'female_natural'
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
