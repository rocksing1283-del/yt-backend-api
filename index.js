const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());

app.get('/api/transcript', async (req, res) => {
    const videoId = req.query.v;
    if (!videoId) return res.status(400).json({ success: false, error: 'Video ID missing' });

    try {
        // Method 1: Ultimate Custom Scraper (Disguised as a real browser)
        const ytUrl = `https://www.youtube.com/watch?v=${videoId}`;
        const ytResponse = await fetch(ytUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'en-US,en;q=0.9,hi;q=0.8'
            }
        });
        const html = await ytResponse.text();

        // Raw HTML se subtitles ka secret link nikalna
        const captionRegex = /"captionTracks":(\[.*?\])/;
        const match = captionRegex.exec(html);

        if (match && match[1]) {
            const tracks = JSON.parse(match[1]);
            
            // Priority: Hindi -> English -> Default
            const track = tracks.find(t => t.languageCode === 'hi') || 
                          tracks.find(t => t.languageCode === 'en') || 
                          tracks[0];
            
            if (track && track.baseUrl) {
                const xmlRes = await fetch(track.baseUrl);
                const xmlText = await xmlRes.text();
                
                // XML code ko saaf karke normal text banana
                const cleanText = xmlText
                    .replace(/<[^>]+>/g, ' ')
                    .replace(/&amp;/g, '&')
                    .replace(/&#39;/g, "'")
                    .replace(/&quot;/g, '"')
                    .replace(/\s+/g, ' ')
                    .trim();
                    
                if (cleanText.length > 0) {
                    return res.json({ success: true, text: cleanText });
                }
            }
        }
        throw new Error("Direct scraping blocked");
    } catch (error1) {
        
        // Method 2: Fallback Backup Servers (Agar method 1 block ho)
        const servers = [
            "https://pipedapi.kavin.rocks",
            "https://api.piped.yt",
            "https://pipedapi.tokhmi.xyz"
        ];
        
        for (let server of servers) {
            try {
                const pipeRes = await fetch(`${server}/streams/${videoId}`);
                if (!pipeRes.ok) continue;
                
                const data = await pipeRes.json();
                if (data.subtitles && data.subtitles.length > 0) {
                    let subTrack = data.subtitles.find(s => s.code === 'hi') || data.subtitles.find(s => s.code === 'en') || data.subtitles[0];
                    const subRes = await fetch(subTrack.url);
                    if (!subRes.ok) continue;
                    
                    let vtt = await subRes.text();
                    let cleanText = vtt.replace(/^WEBVTT.*/gmi, '')
                        .replace(/^Kind:.*/gmi, '')
                        .replace(/^Language:.*/gmi, '')
                        .replace(/^Style:.*/gmi, '')
                        .replace(/^[0-9]{2}:[0-9]{2}:[0-9]{2}.*/gmi, '')
                        .replace(/<[^>]+>/g, '')
                        .replace(/&nbsp;/g, ' ')
                        .replace(/\n+/g, ' ')
                        .trim();
                        
                    if (cleanText.length > 0) {
                        return res.json({ success: true, text: cleanText });
                    }
                }
            } catch (e) {
                continue;
            }
        }
        
        // Final Error Agar video me waqayi captions na ho
        res.status(500).json({ success: false, error: 'Is video mein captions nahi hain ya YouTube ne block kar diya hai.' });
    }
});

module.exports = app;
