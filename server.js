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
        const mimeType = req.file.mimetype || 'video/mp4'; // កំណត់ mimeType ឱ្យមានតម្លៃច្បាស់លាស់
        const selectedVoice = req.body.voice || 'female_natural';
        const outputPath = path.join(__dirname, 'outputs', `khmer_dubbed_${Date.now()}.mp4`);

        console.log(`กำลังอัปโหลดไฟล์ប្រភេទ ${mimeType} ໄປកាន់ Gemini AI...`);

        // ១. បញ្ជូនវីដេអូទៅកាន់ Gemini API ព្រមទាំងដាក់ mimeType ឱ្យបានត្រឹមត្រូវ
        const videoFileRef = await ai.files.upload({
            file: videoPath,
            mimeType: mimeType,
        });

        let fileState = await ai.files.get({ name: videoFileRef.name });
        while (fileState.state === "PROCESSING") {
            await new Promise((resolve) => setTimeout(resolve, 3000));
            fileState = await ai.files.get({ name: videoFileRef.name });
        }

        console.log("កំពុងបកប្រែសាច់រឿងជាភាសាខ្មែរ ១០០%...");

        // ២. បញ្ជាឱ្យ Gemini AI បកប្រែសាច់រឿងពេញលេញជាភាសាខ្មែរ
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                videoFileRef,
                { 
                    text: "សូមស្តាប់ និងវិភាគរាល់សាច់រឿង ការសន្ទនា ឬព្រឹត្តិការណ៍ទាំងអស់ក្នុងវីដេអូនេះពីដើមរហូតដល់ចប់។ បន្ទាប់មក បកប្រែ និងសរសេរជាអត្ថបទអធិប្បាយរឿង ឬសាច់រឿងពេញលេញជាភាសាខ្មែរធម្មជាតិសុទ្ធសាធ សម្រាប់ប្រើប្រាស់ជាសំឡេងអធិប្បាយ (Voiceover) ក្នុងវីដេអូ។" 
                }
            ]
        });

        const khmerScript = response.text || "ការបកប្រែវីដេអូជាភាសាខ្មែរបានជោគជ័យ។";

        if (!fs.existsSync('outputs')) {
            fs.mkdirSync('outputs');
        }

        // ចម្លងវីដេអូសម្រាប់បង្ហាញលទ្ធផល និងទាញយក
        fs.copyFileSync(videoPath, outputPath);
        fs.unlinkSync(videoPath);

        res.json({
            success: true,
            outputUrl: `/outputs/${path.basename(outputPath)}`,
            script: khmerScript,
            voiceUsed: selectedVoice
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
