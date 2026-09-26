const express = require('express');
const StudySessionCheckpoint = require('../models/studySessionCheckpoint');
const StudyUser = require('../models/studyUser');
const { requireStudyAuth } = require('../middleware/studyAuth');

const router = express.Router();
const COLLECTIBLE_DROP_INTERVAL = 20 * 60;
router.use(requireStudyAuth);

function validInstallationId(value) {
	return typeof value === 'string' && /^[a-zA-Z0-9_-]{16,100}$/.test(value);
}

function validSnapshot(snapshot) {
	if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) return false;
	if (snapshot.version !== 1 || typeof snapshot.sessionId !== 'string' || !snapshot.sessionId || typeof snapshot.installationId !== 'string') return false;
	try {
		return Buffer.byteLength(JSON.stringify(snapshot), 'utf8') <= 65536;
	} catch (error) {
		return false;
	}
}

function incrementMapExpression(mapExpression, subject, seconds) {
	const entries = { $objectToArray: { $ifNull: [mapExpression, {}] } };
	const matchingEntries = { $filter: { input: entries, as: 'entry', cond: { $eq: ['$$entry.k', { $literal: subject }] } } };
	const otherEntries = { $filter: { input: entries, as: 'entry', cond: { $ne: ['$$entry.k', { $literal: subject }] } } };
	const currentValue = { $ifNull: [{ $arrayElemAt: [{ $map: { input: matchingEntries, as: 'entry', in: '$$entry.v' } }, 0] }, 0] };
	return {
		$arrayToObject: {
			$concatArrays: [otherEntries, [{ k: { $literal: subject }, v: { $add: [currentValue, seconds] } }]]
		}
	};
}

function normalizeAwayInterval(interval) {
	if (!interval || typeof interval !== 'object') return null;
	const startAt = new Date(interval.startAt);
	const endAt = new Date(interval.endAt);
	const seconds = Math.floor(Number(interval.seconds));
	if (!Number.isFinite(startAt.getTime()) || !Number.isFinite(endAt.getTime()) || endAt < startAt || !Number.isSafeInteger(seconds) || seconds < 0) return null;
	return { startAt, endAt, seconds };
}

router.post('/:installationId/finalize-recovery', async (req, res) => {
	const { session, collectibleProgress } = req.body || {};
	if (!validInstallationId(req.params.installationId) || !session || typeof session.id !== 'string' || !session.id || session.id.length > 120) {
		return res.status(400).json({ error: 'A valid installation ID and session record are required.' });
	}
	const durationSeconds = Math.floor(Number(session.durationSeconds));
	const subject = String(session.subject || 'General').trim().slice(0, 80) || 'General';
	const priorCollectibleSeconds = Math.max(0, Math.floor(Number(collectibleProgress?.accumulatedStudyTime) || 0)) % COLLECTIBLE_DROP_INTERVAL;
	const priorCollectibleDrops = Math.max(0, Math.floor(Number(collectibleProgress?.unclaimedDrops) || 0));
	const creditedAwaySeconds = normalizeAwayInterval(session.creditedAwayInterval)?.seconds || 0;
	const collectibleTotalSeconds = priorCollectibleSeconds + creditedAwaySeconds;
	const collectibleRemainder = collectibleTotalSeconds % COLLECTIBLE_DROP_INTERVAL;
	const collectibleDrops = priorCollectibleDrops + Math.floor(collectibleTotalSeconds / COLLECTIBLE_DROP_INTERVAL);
	if (!Number.isSafeInteger(durationSeconds) || durationSeconds <= 0) {
		return res.status(400).json({ error: 'The recovered session must have a positive duration.' });
	}

	const startTime = new Date(session.startTime);
	const endTime = new Date(session.endTime);
	if (!Number.isFinite(startTime.getTime()) || !Number.isFinite(endTime.getTime()) || endTime <= startTime) {
		return res.status(400).json({ error: 'The recovered session timestamps are invalid.' });
	}
	const semesterId = typeof session.semesterId === 'string' ? session.semesterId : '';
	const linkedItem = session.linkedItem && typeof session.linkedItem === 'object' ? session.linkedItem : {};
	const sessionRecord = {
		id: session.id,
		startTime,
		endTime,
		durationSeconds,
		subject,
		mode: session.mode === 'stopwatch' ? 'stopwatch' : 'pomodoro',
		semesterId,
		linkedItem: {
			itemType: String(linkedItem.itemType || 'none'),
			itemId: String(linkedItem.itemId || ''),
			subId: String(linkedItem.subId || ''),
			title: String(linkedItem.title || ''),
			parentTitle: String(linkedItem.parentTitle || ''),
			displayText: String(linkedItem.displayText || '')
		},
		creditedAwayInterval: normalizeAwayInterval(session.creditedAwayInterval),
		excludedAwayInterval: normalizeAwayInterval(session.excludedAwayInterval),
		createdAt: new Date()
	};

	try {
		const checkpoint = await StudySessionCheckpoint.findOne({ userId: req.studyUserId, installationId: req.params.installationId }).lean();
		const checkpointSessionId = checkpoint?.snapshot?.activeSession?.id || checkpoint?.snapshot?.pendingRecovery?.sessionRecord?.id;
		if (!checkpoint || checkpointSessionId !== session.id) {
			return res.status(409).json({ error: 'The active timer checkpoint no longer matches this recovered session.' });
		}
		const user = await StudyUser.findById(req.studyUserId).select('_id activeSemesterId studySessions');
		if (!user) return res.status(404).json({ error: 'User not found.' });
		const effectiveSemesterId = semesterId || user.activeSemesterId || '';
		sessionRecord.semesterId = effectiveSemesterId;
		const update = [
			{
				$set: {
					studyLogs: incrementMapExpression('$studyLogs', subject, durationSeconds),
					semesters: {
						$map: {
							input: { $ifNull: ['$semesters', []] },
							as: 'semester',
							in: {
								$cond: [
									{ $eq: ['$$semester.id', { $literal: effectiveSemesterId }] },
									{ $mergeObjects: ['$$semester', { studyLogs: incrementMapExpression('$$semester.studyLogs', subject, durationSeconds) }] },
									'$$semester'
								]
							}
						}
					},
					studySessions: {
						$slice: [
							{ $concatArrays: [{ $ifNull: ['$studySessions', []] }, [sessionRecord]] },
							-1000
						]
					},
					finalizedRecoverySessionIds: {
						$slice: [
							{ $setUnion: [{ $ifNull: ['$finalizedRecoverySessionIds', []] }, [session.id]] },
							-1000
						]
					},
					accumulatedStudyTime: collectibleRemainder,
					unclaimedDrops: collectibleDrops
				}
			}
		];
		const result = await StudyUser.updateOne(
			{
				_id: req.studyUserId,
				finalizedRecoverySessionIds: { $ne: session.id },
				'studySessions.id': { $ne: session.id }
			},
			update,
			{ updatePipeline: true }
		);
		const updatedUser = await StudyUser.findById(req.studyUserId).select('studyLogs semesters activeSemesterId accumulatedStudyTime unclaimedDrops studySessions');
		const studyLogValues = updatedUser.studyLogs instanceof Map ? Object.fromEntries(updatedUser.studyLogs) : updatedUser.studyLogs || {};
		const semesterValues = (updatedUser.semesters || []).map(semester => ({
			id: semester.id,
			studyLogs: semester.studyLogs instanceof Map ? Object.fromEntries(semester.studyLogs) : semester.studyLogs || {}
		}));
		const savedSession = updatedUser.studySessions.find(item => item.id === session.id);
		res.json({
			alreadyFinalized: result.modifiedCount === 0,
			session: savedSession,
			studyLogs: studyLogValues,
			semesters: semesterValues,
			activeSemesterId: updatedUser.activeSemesterId,
			accumulatedStudyTime: updatedUser.accumulatedStudyTime,
			unclaimedDrops: updatedUser.unclaimedDrops
		});
	} catch (error) {
		console.error('Unable to finalize recovered study session:', error);
		res.status(500).json({ error: 'Unable to finalize the recovered study session.' });
	}
});

router.get('/:installationId', async (req, res) => {
	if (!validInstallationId(req.params.installationId)) return res.status(400).json({ error: 'Invalid installation ID.' });
	try {
		const checkpoint = await StudySessionCheckpoint.findOne({ userId: req.studyUserId, installationId: req.params.installationId }).lean();
		res.json({ checkpoint: checkpoint ? { sequence: checkpoint.sequence, sessionId: checkpoint.sessionId, snapshot: checkpoint.snapshot } : null });
	} catch (error) {
		res.status(500).json({ error: 'Unable to load the saved timer checkpoint.' });
	}
});

router.put('/:installationId', async (req, res) => {
	const { sequence, snapshot } = req.body || {};
	const installationId = req.params.installationId;
	if (!validInstallationId(installationId) || !Number.isSafeInteger(sequence) || sequence < 1 || !validSnapshot(snapshot) || snapshot.installationId !== installationId) {
		return res.status(400).json({ error: 'A valid installation ID, sequence, and timer snapshot are required.' });
	}
	if (snapshot.sessionId.length > 120) return res.status(400).json({ error: 'Invalid session ID.' });

	try {
		for (let attempt = 0; attempt < 3; attempt++) {
			const current = await StudySessionCheckpoint.findOne({ userId: req.studyUserId, installationId });
			if (current && current.sequence >= sequence) {
				return res.status(409).json({ error: 'A newer timer checkpoint already exists.', checkpoint: { sequence: current.sequence, sessionId: current.sessionId, snapshot: current.snapshot } });
			}

			if (current) {
				const updated = await StudySessionCheckpoint.findOneAndUpdate(
					{ _id: current._id, sequence: current.sequence },
					{ $set: { sequence, sessionId: snapshot.sessionId, snapshot } },
					{ new: true, runValidators: true }
				);
				if (updated) return res.json({ checkpoint: { sequence: updated.sequence, sessionId: updated.sessionId, snapshot: updated.snapshot } });
				continue;
			}

			try {
				const created = await StudySessionCheckpoint.create({ userId: req.studyUserId, installationId, sequence, sessionId: snapshot.sessionId, snapshot });
				return res.json({ checkpoint: { sequence: created.sequence, sessionId: created.sessionId, snapshot: created.snapshot } });
			} catch (error) {
				if (error.code !== 11000) throw error;
			}
		}
		const latest = await StudySessionCheckpoint.findOne({ userId: req.studyUserId, installationId }).lean();
		return res.status(409).json({ error: 'A newer timer checkpoint already exists.', checkpoint: latest ? { sequence: latest.sequence, sessionId: latest.sessionId, snapshot: latest.snapshot } : null });
	} catch (error) {
		res.status(500).json({ error: 'Unable to save the timer checkpoint.' });
	}
});

router.delete('/:installationId', async (req, res) => {
	const { sessionId, sequence } = req.query;
	const installationId = req.params.installationId;
	if (!validInstallationId(installationId) || typeof sessionId !== 'string' || !Number.isSafeInteger(Number(sequence))) {
		return res.status(400).json({ error: 'A valid installation ID, session ID, and sequence are required.' });
	}
	try {
		const current = await StudySessionCheckpoint.findOne({ userId: req.studyUserId, installationId });
		if (!current) return res.status(204).end();
		if (current.sessionId !== sessionId || current.sequence > Number(sequence)) {
			return res.status(409).json({ error: 'The timer checkpoint has changed and was not cleared.' });
		}
		await StudySessionCheckpoint.deleteOne({ _id: current._id, sequence: current.sequence });
		res.status(204).end();
	} catch (error) {
		res.status(500).json({ error: 'Unable to clear the timer checkpoint.' });
	}
});

module.exports = router;