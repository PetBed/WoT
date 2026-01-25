const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Import Models
const TarotCard = require('../models/tarot/tarotCard.js');
const TarotSpread = require('../models/tarot/tarotSpread.js');
const TarotReading = require('../models/tarot/tarotReading.js');
const TarotCardNote = require('../models/tarot/tarotCardNote.js');

// ... (init endpoint remains same) ...
// ==========================================
// 1. BOOTSTRAP ENDPOINT
// ==========================================
router.get('/init', async (req, res) => {
    const { userId } = req.query;

    try {
        const [cards, spreads, notes] = await Promise.all([
            TarotCard.find({}).sort({ _id: 1 }).lean(),
            TarotSpread.find({ userId: userId }).lean(),
            TarotCardNote.find({ userId: userId }).lean()
        ]);

        res.json({ cards, spreads, notes });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 2. CARD NOTES (Library)
// ==========================================
router.put('/cards/:cardId/notes', async (req, res) => {
    const { userId } = req.body;
    const { cardId } = req.params;
    
    const updateData = {
        keywordsUpright: req.body.keywordsUpright,
        keywordsReversed: req.body.keywordsReversed,
        interpretation: req.body.interpretation,
        meaning: req.body.meaning,
        symbolism: req.body.symbolism,
        // [UPDATED] Handles both URL and Base64 string
        customImage: req.body.customImage 
    };

    try {
        const note = await TarotCardNote.findOneAndUpdate(
            { userId: userId, cardId: cardId },
            { $set: updateData },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );
        res.json(note);
    } catch (err) {
        // Note: Check server.js body parser limit if large images fail
        res.status(400).json({ error: err.message });
    }
});

// ... (rest of the endpoints: readings, spreads, stats) ...
// (I am omitting the rest for brevity as they are unchanged, but ensure they are present in your file)
router.get('/readings', async (req, res) => {
    const { userId, page = 1, limit = 10 } = req.query;
    try {
        const readings = await TarotReading.find({ userId }).sort({ date: -1 }).limit(limit * 1).skip((page - 1) * limit).populate('spreadId', 'name').lean();
        const count = await TarotReading.countDocuments({ userId });
        res.json({ readings, totalPages: Math.ceil(count / limit), currentPage: page });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/readings', async (req, res) => {
    try {
        const newReading = new TarotReading(req.body);
        const savedReading = await newReading.save();
        res.status(201).json(savedReading);
    } catch (err) { res.status(400).json({ error: err.message }); }
});

router.post('/spreads', async (req, res) => {
    try {
        const newSpread = new TarotSpread(req.body);
        const savedSpread = await newSpread.save();
        res.status(201).json(savedSpread);
    } catch (err) { res.status(400).json({ error: err.message }); }
});

router.put('/spreads/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updatedSpread = await TarotSpread.findByIdAndUpdate(id, req.body, { new: true });
        res.json(updatedSpread);
    } catch (err) { res.status(400).json({ error: err.message }); }
});

router.get('/stats', async (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: "User ID required" });
    try {
        const objectIdUser = new mongoose.Types.ObjectId(userId);
        const stats = await TarotReading.aggregate([
            { $match: { userId: objectIdUser } },
            { $unwind: "$cards" },
            { $lookup: { from: "tarotcards", localField: "cards.cardId", foreignField: "_id", as: "cardDetails" } },
            { $unwind: "$cardDetails" },
            { $facet: {
                    "suits": [{ $group: { _id: "$cardDetails.suit", count: { $sum: 1 } } }],
                    "topCards": [{ $group: { _id: "$cardDetails.name", count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 5 }],
                    "orientations": [{ $group: { _id: "$cards.orientation", count: { $sum: 1 } } }]
                }
            }
        ]);
        res.json(stats[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;