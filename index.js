const express = require('express');
const cors = require('cors');
const { YoutubeTranscript } = require('youtube-transcript');

const app = express();

// Ye line aapki GitHub pages wali website ko is server se jodne ki permission deti hai (No CORS error)
app.use(cors());

app.get('/api/transcript', async (req, res) => {
    const videoId = req.query.v;
    
    if (!videoId) {
        return res.status(400).json({ success: false, error: 'Video ID missing' });
    }

    try {
        // Direct YouTube ke server se text nikalna (Bina block hue)
        const transcriptList = await YoutubeTranscript.fetchTranscript(videoId);
        const fullText = transcriptList.map(t => t.text).join(' ');
        
        res.json({ success: true, text: fullText });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Captions disabled ya available nahi hain.' });
    }
});

module.exports = app;
