const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { GoogleGenAI } = require('@google/genai');

const app = express();
const upload = multer({ dest: 'uploads/' });

// ប្រើប្រាស់ Gemini API Key របស់អ្នក
const ai = new GoogleGenAI({ apiKey: "AQ.Ab8RN6JNHhMKkwA5uB45idQcc3hyPi_VKljYbdxLvzfjueqRpA" });

app.use(express.static('public'));
app.use('/outputs', express.static('outputs'));

app.post('/api/process-video', upload.single('video'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'សូមបញ្ចូលវីដេអូសិន' });
        }

        const videoPath = req.file.path;
        const outputPath = path.join(__dirname, 'outputs', `dubbed_${Date.now()}.mp4`);

        // ១. បញ្ជូនវីដេអូទៅ Gemini API ដើម្បីវិភាគ និងបកប្រែអត្ថន័យជាភាសាខ្មែរ
        const videoFileRef = await ai.files.upload({
            file: videoPath,
            mimeType: req.file.mimetype,
        });

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                videoFileRef,
                { text: "សូមស្តាប់ការសន្ទនា ឬវិភាគសាច់រឿងក្នុងវីដេអូនេះ រួចសរសេរការបកប្រែជាអត្ថបទអធិប្បាយជាភាសាខ្មែរច្បាស់ៗសម្រាប់ធ្វើការพากย์เสียง (Voiceover)។" }
            ]
        });

        const khmerScript = response.text;
        console.log("Khmer Translated Script:", khmerScript);

        // ២. (ចំណាំដំណាក់កាល TTS & FFmpeg): 
        // ត្រង់ចំណុចនេះ ប្រព័ន្ធត្រូវប្រើប្រាស់ Google Text-to-Speech (TTS) API ដើម្បីបម្លែងអត្ថបទខ្មែរ ($khmerScript) 
        // ទៅជាဖိုင်សំឡេង (.mp3) និងប្រើប្រាស់ไลบรารี FFmpeg ដើម្បីបញ្ចូលសំឡេងថ្មីជាន់លើវីដេអូដើម។
        // សម្រាប់ការសាកល្បងបណ្តោះអាសន្ន យើងចម្លងវីដេអូដើមចេញជាលទ្ធផល៖
        
        if (!fs.existsSync('outputs')) {
            fs.existsSync('outputs') || fs.mkdirSync('outputs');
        }
        fs.copyFileSync(videoPath, outputPath);

        // លុបឯកសារបណ្តោះអាសន្ន
        fs.unlinkSync(videoPath);

        res.json({
            success: true,
            outputUrl: `/outputs/${path.basename(outputPath)}`,
            script: khmerScript
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
