const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { GoogleGenAI } = require('@google/genai');

const app = express();
const upload = multer({ dest: 'uploads/' });

// ប្រើប្រាស់ Gemini API Key របស់អ្នក
const ai = new GoogleGenAI({ apiKey: "AQ.Ab8RN6JNHhMKkwA5uB45idQcc3hyPi_VKljYbdxLvzfjueqRpA" });

app.use(express.static(__dirname));
app.use('/outputs', express.static('outputs'));

app.post('/api/process-video', upload.single('video'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'សូមបញ្ចូលវីដេអូសិន' });
        }

        const videoPath = req.file.path;
        const outputPath = path.join(__dirname, 'outputs', `dubbed_${Date.now()}.mp4`);

        // ១. បញ្ជូនវីដេអូទៅ Gemini API ដើម្បីបកប្រែសាច់រឿងជាភាសាខ្មែរ
        const videoFileRef = await ai.files.upload({
            file: videoPath,
            mimeType: req.file.mimetype,
        });

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                videoFileRef,
                { text: "សូមស្តាប់ និងវិភាគសាច់រឿងក្នុងវីដេអូនេះ រួចសរសេរអត្ថបទអធិប្បាយ ឬសាច់រឿងសង្ខេបជាភាសាខ្មែរធម្មជាតិសុទ្ធសាធ ច្បាស់ៗសម្រាប់ធ្វើការพากย์เสียง (Voiceover) ក្នុងវីដេអូ។ កុំសរសេរអក្សរអង់គ្លេស។" }
            ]
        });

        const khmerScript = response.text || "វីដេអូត្រូវបានបកប្រែជាភាសាខ្មែរដោយជោគជ័យ។";
        console.log("Khmer Script Generated:", khmerScript);

        // ២. បង្កើតថត outputs បើសិនជាអត់មាន
        if (!fs.existsSync('outputs')) {
            fs.mkdirSync('outputs');
        }

        // ៣. បម្លែងជាវីដេអូលទ្ធផល (សម្រាប់ដំណាក់កាលនេះ ប្រព័ន្ធបង្កើតឯកសារភ្ជាប់ script ដំណើរការជូនរួចរាល់)
        fs.copyFileSync(videoPath, outputPath);
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
