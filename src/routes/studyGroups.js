const express = require('express');
const crypto = require('crypto');
const mongoose = require('mongoose');
const StudyUser = require('../models/studyUser');
const StudyGroup = require('../models/studyGroup');
const Membership = require('../models/studyGroupMembership');
const Activity = require('../models/studyGroupActivity');
const Message = require('../models/studyGroupMessage');
const DailyAggregate = require('../models/studyDailyAggregate');
const { requireStudyAuth } = require('../middleware/studyAuth');
const { studyDayKey, splitDurationByStudyDay } = require('../utils/studyDay');

const router = express.Router();
const MAX_ROOM_MESSAGES = 40;
const PRESENCE_LEASE_MS = 3 * 60 * 1000;

function validId(value) {
    return mongoose.Types.ObjectId.isValid(value);
}

function studyDayStart(date = new Date()) {
    return new Date(`${studyDayKey(date)}T20:00:00.000Z`);
}

function activeSecondsForStudyDay(activity, now = new Date()) {
    const start = Math.max(new Date(activity.startedAt).getTime(), studyDayStart(now).getTime());
    const end = Math.min(now.getTime(), new Date(activity.expiresAt).getTime());
    return Math.max(0, Math.floor((end - start) / 1000));
}

function newJoinCode() {
    return crypto.randomBytes(4).toString('hex').toUpperCase();
}

function publicUser(user) {
    return { id: String(user._id), username: user.username };
}

async function addActivityDurationToDailyAggregates(activity, endAt) {
    const portions = splitDurationByStudyDay(activity.startedAt, endAt);
    for (const portion of portions) {
        await DailyAggregate.findOneAndUpdate(
            { groupId: activity.groupId, userId: activity.userId, studyDay: portion.studyDay },
            { $inc: { seconds: portion.seconds } },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
    }
    return portions.reduce((total, portion) => total + portion.seconds, 0);
}

async function finalizeExpiredActivities(groupId) {
    const now = new Date();
    let activity = await Activity.findOne({ groupId, status: 'active', expiresAt: { $lte: now } }).lean();
    while (activity) {
        const durationSeconds = Math.max(0, Math.floor((activity.expiresAt - activity.startedAt) / 1000));
        const finalized = await Activity.findOneAndUpdate(
            { _id: activity._id, status: 'active' },
            { $set: { status: 'expired', stoppedAt: activity.expiresAt, durationSeconds } },
            { new: true }
        );
        if (finalized) {
            await addActivityDurationToDailyAggregates(finalized, finalized.stoppedAt);
        }
        activity = await Activity.findOne({ groupId, status: 'active', expiresAt: { $lte: now } }).lean();
    }
}

async function getMembership(groupId, userId, activeOnly = true) {
    const query = { groupId, userId };
    if (activeOnly) query.status = 'active';
    return Membership.findOne(query);
}

async function requireMember(req, res, next) {
    if (!validId(req.params.groupId)) return res.status(400).json({ error: 'Invalid group id.' });
    const membership = await getMembership(req.params.groupId, req.studyUserId);
    if (!membership) return res.status(403).json({ error: 'You are not an active member of this group.' });
    req.membership = membership;
    next();
}

function canShare(user, setting) {
    return user._id.toString() === setting.userId.toString() || user.settings?.shareLiveStatus === true;
}

router.use(requireStudyAuth);

router.get('/', async (req, res) => {
    try {
        const memberships = await Membership.find({ userId: req.studyUserId, status: 'active' }).lean();
        const groups = await StudyGroup.find({ _id: { $in: memberships.map(item => item.groupId) } }).lean();
        res.json(groups.map(group => ({
            id: String(group._id),
            name: group.name,
            joinPolicy: group.joinPolicy,
            joinCode: group.owner.toString() === req.studyUserId ? group.code : undefined,
            isOwner: group.owner.toString() === req.studyUserId
        })));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const name = String(req.body.name || '').trim();
        if (!name || name.length > 80) return res.status(400).json({ error: 'Group name is required and must be 80 characters or fewer.' });
        const group = await StudyGroup.create({
            name,
            code: newJoinCode(),
            joinPolicy: req.body.joinPolicy === 'approval' ? 'approval' : 'public',
            owner: req.studyUserId
        });
        await Membership.create({
            groupId: group._id,
            userId: req.studyUserId,
            role: 'owner',
            status: 'active',
            privacy: { shareLiveStatus: true, shareLeaderboard: true, shareHistory: true, shareSubject: true, shareActivityDetails: true }
        });
        res.status(201).json({ id: String(group._id), name: group.name, joinCode: group.code, joinPolicy: group.joinPolicy, isOwner: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/join', async (req, res) => {
    try {
        const joinCode = String(req.body.joinCode || '').trim().toUpperCase();
        const group = await StudyGroup.findOne({ code: joinCode });
        if (!group) return res.status(404).json({ error: 'Study group code not found.' });
        const existing = await getMembership(group._id, req.studyUserId, false);
        if (existing) return res.status(409).json({ error: existing.status === 'pending' ? 'Your join request is awaiting approval.' : 'You are already a member of this group.' });
        const status = group.joinPolicy === 'approval' ? 'pending' : 'active';
        await Membership.create({
            groupId: group._id,
            userId: req.studyUserId,
            status,
            role: 'member',
            privacy: { shareLiveStatus: true, shareLeaderboard: true, shareHistory: true, shareSubject: true, shareActivityDetails: true }
        });
        res.status(201).json({ groupId: String(group._id), status, name: group.name });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/:groupId/room', requireMember, async (req, res) => {
    try {
        const group = await StudyGroup.findById(req.params.groupId).lean();
        if (!group) return res.status(404).json({ error: 'Study group not found.' });
        await finalizeExpiredActivities(group._id);
        await Activity.updateMany(
            { groupId: group._id, userId: req.studyUserId, status: 'active' },
            { $set: { expiresAt: new Date(Date.now() + PRESENCE_LEASE_MS) } }
        );
        const memberships = await Membership.find({ groupId: group._id, status: 'active' }).lean();
        const membershipByUser = new Map(memberships.map(item => [String(item.userId), item]));
        const users = await StudyUser.find({ _id: { $in: memberships.map(item => item.userId) } }).select('username settings studySessions').lean();
        const usersById = new Map(users.map(user => [String(user._id), user]));
        const pendingMemberships = req.membership.role === 'owner'
            ? await Membership.find({ groupId: group._id, status: 'pending' }).lean()
            : [];
        const pendingUsers = pendingMemberships.length
            ? await StudyUser.find({ _id: { $in: pendingMemberships.map(item => item.userId) } }).select('username').lean()
            : [];
        const activeActivities = await Activity.find({ groupId: group._id, status: 'active', expiresAt: { $gt: new Date() } }).lean();
        const activityByUser = new Map(activeActivities.map(activity => [String(activity.userId), activity]));
        const day = studyDayKey();
        const aggregates = await DailyAggregate.find({ groupId: group._id, studyDay: day }).lean();
        const aggregateByUser = new Map(aggregates.map(item => [String(item.userId), item.seconds]));
        const serverNow = new Date();
        const members = users.map(user => {
            const userId = String(user._id);
            const live = activityByUser.get(userId);
            const privacy = membershipByUser.get(userId)?.privacy || {};
            const shareLiveStatus = privacy.shareLiveStatus !== false || userId === req.studyUserId;
            const shareLeaderboard = privacy.shareLeaderboard !== false || userId === req.studyUserId;
            const todaySeconds = Number(aggregateByUser.get(userId) || 0) + (live ? activeSecondsForStudyDay(live, serverNow) : 0);
            return {
                id: userId,
                username: user.username,
                isSelf: userId === req.studyUserId,
                live: shareLiveStatus && live ? {
                    activityId: live.clientActivityId,
                    startedAt: live.startedAt,
                    mode: live.mode,
                    subject: userId === req.studyUserId || privacy.shareSubject === true ? live.subject : '',
                    details: userId === req.studyUserId || privacy.shareActivityDetails !== false ? live.details : ''
                } : null,
                todaySeconds: shareLeaderboard ? todaySeconds : null,
                privateLeaderboard: !shareLeaderboard
            };
        });
        const leaderboard = members
            .filter(member => member.todaySeconds !== null)
            .sort((a, b) => b.todaySeconds - a.todaySeconds)
            .map((member, index) => ({ rank: index + 1, id: member.id, username: member.username, todaySeconds: member.todaySeconds }));
        const latestMessage = req.query.sinceMessageId && validId(req.query.sinceMessageId) ? await Message.findOne({ _id: req.query.sinceMessageId, groupId: group._id }).lean() : null;
        const messageQuery = { groupId: group._id };
        if (latestMessage) messageQuery.createdAt = { $gt: latestMessage.createdAt };
        const messages = await Message.find(messageQuery).sort({ createdAt: 1 }).limit(MAX_ROOM_MESSAGES).lean();
        const pendingCount = req.membership.role === 'owner' ? await Membership.countDocuments({ groupId: group._id, status: 'pending' }) : 0;
        res.set('Cache-Control', 'no-store');
        res.json({
            version: new Date().toISOString(),
            serverNow: serverNow.toISOString(),
            group: { id: String(group._id), name: group.name, joinPolicy: group.joinPolicy, joinCode: req.membership.role === 'owner' ? group.code : undefined },
            permissions: { isOwner: req.membership.role === 'owner', pendingCount },
            privacy: {
                shareLiveStatus: req.membership.privacy?.shareLiveStatus !== false,
                shareLeaderboard: req.membership.privacy?.shareLeaderboard !== false,
                shareHistory: req.membership.privacy?.shareHistory !== false,
                shareSubject: req.membership.privacy?.shareSubject !== false,
                shareActivityDetails: req.membership.privacy?.shareActivityDetails !== false
            },
            pendingMembers: pendingUsers.map(user => ({ id: String(user._id), username: user.username })),
            members,
            leaderboard,
            messages: messages.map(message => ({ id: String(message._id), userId: String(message.userId), username: message.username, body: message.body, type: message.type, createdAt: message.createdAt }))
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/:groupId/activity/start', requireMember, async (req, res) => {
    try {
        const clientActivityId = String(req.body.clientActivityId || '').trim();
        if (!clientActivityId) return res.status(400).json({ error: 'Activity id is required.' });
        const existing = await Activity.findOne({ clientActivityId, groupId: req.params.groupId, userId: req.studyUserId });
        if (existing) return res.json({ activityId: existing.clientActivityId, startedAt: existing.startedAt, status: existing.status });
        const activeActivity = await Activity.findOne({ groupId: req.params.groupId, userId: req.studyUserId, status: 'active', expiresAt: { $gt: new Date() } }).sort({ startedAt: -1 });
        if (activeActivity) return res.json({ activityId: activeActivity.clientActivityId, startedAt: activeActivity.startedAt, status: activeActivity.status });
        const now = new Date();
        const activity = await Activity.create({
            clientActivityId,
            groupId: req.params.groupId,
            userId: req.studyUserId,
            subject: String(req.body.subject || '').trim().slice(0, 80),
            details: String(req.body.details || '').trim().slice(0, 300),
            mode: req.body.mode === 'stopwatch' ? 'stopwatch' : 'pomodoro',
            startedAt: now,
            expiresAt: new Date(now.getTime() + PRESENCE_LEASE_MS)
        });
        res.status(201).json({ activityId: activity.clientActivityId, startedAt: activity.startedAt, status: activity.status });
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ error: 'That activity has already been submitted.' });
        res.status(500).json({ error: error.message });
    }
});

router.post('/:groupId/activity/heartbeat', requireMember, async (req, res) => {
    try {
        const activityId = String(req.body.clientActivityId || '').trim();
        const activity = await Activity.findOneAndUpdate(
            { clientActivityId: activityId, groupId: req.params.groupId, userId: req.studyUserId, status: 'active' },
            { $set: { expiresAt: new Date(Date.now() + PRESENCE_LEASE_MS) } },
            { new: true }
        );
        if (!activity) return res.status(404).json({ error: 'Active shared activity not found.' });
        res.json({ activityId: activity.clientActivityId, expiresAt: activity.expiresAt });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/:groupId/activity/stop', requireMember, async (req, res) => {
    try {
        const activityId = String(req.body.clientActivityId || '').trim();
        const activity = await Activity.findOne({ clientActivityId: activityId, groupId: req.params.groupId, userId: req.studyUserId });
        if (!activity) return res.status(404).json({ error: 'Shared activity not found.' });
        if (activity.status === 'stopped' || activity.status === 'expired') return res.json({ durationSeconds: activity.durationSeconds, alreadyFinalized: true });
        const stoppedAt = new Date();
        const effectiveEnd = activity.expiresAt < stoppedAt ? activity.expiresAt : stoppedAt;
        const durationEnd = new Date(Math.min(effectiveEnd.getTime(), activity.startedAt.getTime() + (24 * 60 * 60 * 1000)));
        const durationSeconds = Math.max(0, Math.floor((durationEnd - activity.startedAt) / 1000));
        activity.stoppedAt = stoppedAt;
        activity.durationSeconds = durationSeconds;
        activity.status = 'stopped';
        await activity.save();
        await addActivityDurationToDailyAggregates(activity, durationEnd);
        res.json({ durationSeconds, alreadyFinalized: false });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/:groupId/messages', requireMember, async (req, res) => {
    try {
        const body = String(req.body.body || '').trim();
        if (!body || body.length > 1000) return res.status(400).json({ error: 'Message must be between 1 and 1000 characters.' });
        const user = await StudyUser.findById(req.studyUserId).select('username');
        const message = await Message.create({ groupId: req.params.groupId, userId: req.studyUserId, username: user.username, body, type: req.body.type === 'activity' ? 'activity' : 'message' });
        res.status(201).json({ id: String(message._id), userId: String(message.userId), username: message.username, body: message.body, type: message.type, createdAt: message.createdAt });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/:groupId/history/:userId', requireMember, async (req, res) => {
    try {
        if (!validId(req.params.userId)) return res.status(400).json({ error: 'Invalid user id.' });
        const user = await StudyUser.findById(req.params.userId).select('username settings studySessions').lean();
        if (!user) return res.status(404).json({ error: 'User not found.' });
        const targetMembership = await Membership.findOne({ groupId: req.params.groupId, userId: req.params.userId, status: 'active' }).lean();
        if (!targetMembership) return res.status(404).json({ error: 'Group member not found.' });
        if (req.params.userId !== req.studyUserId && targetMembership.privacy?.shareHistory === false) return res.status(403).json({ error: 'This member has not shared their study history with this group.' });
        const day = studyDayKey();
        const sessions = (user.studySessions || []).filter(session => studyDayKey(new Date(session.startTime)) === day).map(session => ({
            id: session.id,
            startTime: session.startTime,
            endTime: session.endTime,
            durationSeconds: session.durationSeconds,
            subject: targetMembership.privacy?.shareSubject !== false || req.params.userId === req.studyUserId ? session.subject : '',
            details: targetMembership.privacy?.shareActivityDetails !== false || req.params.userId === req.studyUserId ? session.linkedItem?.displayText || '' : ''
        }));
        res.json({ user: publicUser(user), studyDay: day, sessions });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.patch('/:groupId/privacy', requireMember, async (req, res) => {
    try {
        const allowedKeys = ['shareLiveStatus', 'shareLeaderboard', 'shareHistory', 'shareSubject', 'shareActivityDetails'];
        if (!req.membership.privacy) req.membership.privacy = {};
        for (const key of allowedKeys) {
            if (typeof req.body[key] === 'boolean') req.membership.privacy[key] = req.body[key];
        }
        await req.membership.save();
        res.json({ privacy: req.membership.privacy });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.patch('/:groupId', requireMember, async (req, res) => {
    if (req.membership.role !== 'owner') return res.status(403).json({ error: 'Only the group leader can change group settings.' });
    try {
        const updates = {};
        if (typeof req.body.name === 'string' && req.body.name.trim()) updates.name = req.body.name.trim().slice(0, 80);
        if (req.body.joinPolicy === 'public' || req.body.joinPolicy === 'approval') updates.joinPolicy = req.body.joinPolicy;
        if (req.body.regenerateCode === true) updates.code = newJoinCode();
        const group = await StudyGroup.findByIdAndUpdate(req.params.groupId, updates, { new: true }).lean();
        res.json({ id: String(group._id), name: group.name, joinPolicy: group.joinPolicy, joinCode: group.code });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/:groupId', requireMember, async (req, res) => {
    if (req.membership.role !== 'owner') return res.status(403).json({ error: 'Only the group leader can delete this group.' });
    try {
        const groupId = req.params.groupId;
        await Promise.all([
            Membership.deleteMany({ groupId }),
            Activity.deleteMany({ groupId }),
            Message.deleteMany({ groupId }),
            DailyAggregate.deleteMany({ groupId })
        ]);
        await StudyGroup.deleteOne({ _id: groupId });
        res.json({ message: 'Study group deleted.' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/:groupId/members/:userId/approve', requireMember, async (req, res) => {
    if (req.membership.role !== 'owner') return res.status(403).json({ error: 'Only the group leader can approve members.' });
    const member = await Membership.findOneAndUpdate({ groupId: req.params.groupId, userId: req.params.userId, status: 'pending' }, { status: 'active' }, { new: true });
    if (!member) return res.status(404).json({ error: 'Pending member not found.' });
    res.json({ status: member.status });
});

router.delete('/:groupId/members/:userId', requireMember, async (req, res) => {
    if (req.membership.role !== 'owner') return res.status(403).json({ error: 'Only the group leader can remove members.' });
    if (req.params.userId === req.studyUserId) return res.status(400).json({ error: 'Transfer ownership before leaving as leader.' });
    const result = await Membership.deleteOne({ groupId: req.params.groupId, userId: req.params.userId });
    if (!result.deletedCount) return res.status(404).json({ error: 'Member not found.' });
    res.json({ message: 'Member removed.' });
});

router.delete('/:groupId/leave', requireMember, async (req, res) => {
    if (req.membership.role === 'owner') return res.status(400).json({ error: 'Transfer ownership before leaving this group.' });
    const result = await Membership.deleteOne({ groupId: req.params.groupId, userId: req.studyUserId, status: 'active' });
    if (!result.deletedCount) return res.status(404).json({ error: 'Active membership not found.' });
    const activeActivities = await Activity.find({ groupId: req.params.groupId, userId: req.studyUserId, status: 'active' });
    const stoppedAt = new Date();
    for (const activity of activeActivities) {
        const durationEnd = new Date(Math.min(stoppedAt.getTime(), activity.expiresAt.getTime()));
        const durationSeconds = Math.max(0, Math.floor((durationEnd - activity.startedAt) / 1000));
        activity.status = 'stopped';
        activity.stoppedAt = stoppedAt;
        activity.durationSeconds = durationSeconds;
        await activity.save();
        await addActivityDurationToDailyAggregates(activity, durationEnd);
    }
    res.json({ message: 'You left the study group.' });
});

router.post('/:groupId/transfer/:userId', requireMember, async (req, res) => {
    if (req.membership.role !== 'owner') return res.status(403).json({ error: 'Only the group leader can transfer ownership.' });
    if (!validId(req.params.userId)) return res.status(400).json({ error: 'Invalid user id.' });
    const target = await Membership.findOne({ groupId: req.params.groupId, userId: req.params.userId, status: 'active' });
    if (!target) return res.status(404).json({ error: 'Active member not found.' });
    await Membership.updateOne({ groupId: req.params.groupId, userId: req.studyUserId }, { $set: { role: 'member' } });
    await Membership.updateOne({ groupId: req.params.groupId, userId: req.params.userId }, { $set: { role: 'owner' } });
    await StudyGroup.findByIdAndUpdate(req.params.groupId, { owner: req.params.userId });
    res.json({ message: 'Ownership transferred.' });
});

router.get('/leaderboard/global', async (req, res) => {
    try {
        const day = studyDayKey();
        const users = await StudyUser.find({ 'settings.shareLeaderboard': true }).select('username settings studySessions').lean();
        const leaderboard = users.map(user => ({
            id: String(user._id),
            username: user.username,
            todaySeconds: (user.studySessions || []).filter(session => studyDayKey(new Date(session.startTime)) === day).reduce((total, session) => total + (Number(session.durationSeconds) || 0), 0)
        })).filter(item => item.todaySeconds > 0).sort((a, b) => b.todaySeconds - a.todaySeconds).slice(0, 100).map((item, index) => ({ rank: index + 1, ...item }));
        res.json({ studyDay: day, leaderboard });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
