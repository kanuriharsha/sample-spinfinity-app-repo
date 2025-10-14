#!/usr/bin/env node
/* eslint-disable no-console */
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Missing MONGODB_URI in .env');
  process.exit(1);
}

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Accept', 'Content-Type', 'Authorization', 'X-User', 'X-Password'],
  credentials: false,
}));
app.options('*', cors()); // handle preflight
app.use(express.json());

let db, Login, SpinResults;

async function connect() {
  const client = new MongoClient(MONGODB_URI, {
    serverApi: { version: '1', strict: true, deprecationErrors: true },
  });
  await client.connect();
  db = client.db('spin-and-win');
  Login = db.collection('login');
  SpinResults = db.collection('spinResults');
  console.log('Connected to MongoDB: spin-and-win');
}

function norm(v) {
  return String(v ?? '').trim().toLowerCase();
}

function extractCreds(req) {
  const headerUser = req.headers['x-user'];
  const headerPass = req.headers['x-password'];
  if (headerUser && headerPass) {
    return { username: String(headerUser).trim(), password: String(headerPass).trim() };
  }

  const auth = req.headers.authorization || '';
  if (auth.startsWith('Basic ')) {
    try {
      const decoded = Buffer.from(auth.slice(6), 'base64').toString('utf8');
      const colon = decoded.indexOf(':');
      if (colon > -1) {
        return {
          username: decoded.slice(0, colon).trim(),
          password: decoded.slice(colon + 1).trim(),
        };
      }
    } catch {}
  }

  if (req.body && req.body.username && req.body.password) {
    return {
      username: String(req.body.username).trim(),
      password: String(req.body.password).trim(),
    };
  }

  return null;
}

async function basicAuth(req, res, next) {
  try {
    const creds = extractCreds(req);
    if (!creds) return res.status(401).json({ error: 'Unauthorized' });

    const user = await Login.findOne({ username: creds.username, password: creds.password });
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    req.user = {
      username: creds.username,
      routeName: norm(user.routeName || 'all'),
      displayRouteName: user.routeName || 'all',
    };
    next();
  } catch (e) {
    console.error('auth error:', e);
    res.status(401).json({ error: 'Unauthorized' });
  }
}

// Health
app.get('/api/health', (req, res) => res.json({ status: 'OK', message: 'Spin & Win API is running' }));

// Login (no token; returns user info)
app.post('/api/login', async (req, res) => {
  try {
    const creds = extractCreds(req) || {};
    const { username, password } = creds;
    if (!username || !password) return res.status(400).json({ error: 'username and password are required' });

    const user = await Login.findOne({ username, password });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const displayRouteName = user.routeName || 'all';
    const routeName = norm(displayRouteName) || 'all';

    return res.json({ user: { username, routeName, displayRouteName } });
  } catch (e) {
    console.error('Login error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Spin results
app.get('/api/spin-results', basicAuth, async (req, res) => {
  try {
    const qRoute = norm(req.query.routeName || '');
    const allowedNorm = req.user.routeName === 'all' ? (qRoute || null) : req.user.routeName;

    const pipeline = [
      { $addFields: { __rn: { $toLower: { $trim: { input: '$routeName' } } } } },
    ];
    if (allowedNorm) pipeline.push({ $match: { __rn: allowedNorm } });
    pipeline.push(
      {
        $lookup: {
          from: 'login',
          let: { rn: '$__rn' },
          pipeline: [
            { $addFields: { __rn: { $toLower: { $trim: { input: '$routeName' } } } } },
            { $match: { $expr: { $eq: ['$$rn', '$__rn'] } } },
          ],
          as: 'loginMatches',
        },
      },
      { $match: { $expr: { $gt: [{ $size: '$loginMatches' }, 0] } } },
      { $project: { _id: 0, loginMatches: 0, __rn: 0 } },
      { $sort: { createdAt: -1 } },
      { $limit: 500 }
    );

    const items = await SpinResults.aggregate(pipeline).toArray();
    res.json({ items });
  } catch (e) {
    console.error('spin-results error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Analytics (support GET and POST)
const analyticsHandler = async (req, res) => {
  try {
    const allowedNorm = req.user.routeName === 'all' ? null : req.user.routeName;

    // Parse optional date range
    const q = { ...(req.query || {}), ...(req.body || {}) };
    let fromDate = null;
    let toDate = null;
    if (q.rangeDays) {
      const n = Number(q.rangeDays) || 0;
      if (n > 0) {
        toDate = new Date();
        fromDate = new Date(Date.now() - n * 24 * 60 * 60 * 1000);
      }
    }
    if (q.from) fromDate = new Date(q.from);
    if (q.to) toDate = new Date(q.to);
    const tz = typeof q.tz === 'string' && q.tz ? q.tz : 'UTC'; // NEW: timezone from client

    // Build base pipeline: normalize route, compute timestamp, optional date filter, restrict to allowed routes, ensure route exists in login
    const base = [
      { $addFields: { __rn: { $toLower: { $trim: { input: '$routeName' } } } } },
      {
        $addFields: {
          tsSource: {
            $ifNull: ['$createdAt', { $ifNull: ['$outTime', { $ifNull: ['$inTime', '$timestamp'] }] }],
          },
        },
      },
      {
        $addFields: {
          ts: {
            $switch: {
              branches: [{ case: { $eq: [{ $type: '$tsSource' }, 'date'] }, then: '$tsSource' }],
              default: { $toDate: '$tsSource' },
            },
          },
        },
      },
      { $match: { ts: { $ne: null } } },
    ];

    if (fromDate || toDate) {
      const range = {};
      if (fromDate) range.$gte = fromDate;
      if (toDate) range.$lte = toDate;
      base.push({ $match: { ts: range } });
    }

    if (allowedNorm) {
      base.push({ $match: { __rn: allowedNorm } });
    }

    base.push(
      {
        $lookup: {
          from: 'login',
          let: { rn: '$__rn' },
          pipeline: [
            { $addFields: { __rn: { $toLower: { $trim: { input: '$routeName' } } } } },
            { $match: { $expr: { $eq: ['$$rn', '$__rn'] } } },
          ],
          as: 'loginMatches',
        },
      },
      { $match: { $expr: { $gt: [{ $size: '$loginMatches' }, 0] } } }
    );

    // Results distribution (prize/winner) with prizeAmount
    const byResult = await SpinResults.aggregate([
      ...base,
      {
        $addFields: {
          _prizeAmountStr: {
            $trim: {
              input: {
                $replaceAll: {
                  input: {
                    $replaceAll: {
                      input: { $ifNull: ['$prizeAmount', '0'] },
                      find: ',',
                      replacement: '',
                    },
                  },
                  find: '₹',
                  replacement: '',
                },
              },
            },
          },
        },
      },
      { $addFields: { prizeAmountNum: { $convert: { input: '$_prizeAmountStr', to: 'double', onError: 0, onNull: 0 } } } },
      { 
        $group: { 
          _id: { $ifNull: ['$result', '$winner'] }, 
          count: { $sum: 1 },
          totalPrizeAmount: { $sum: '$prizeAmountNum' },
          avgPrizeAmount: { $avg: '$prizeAmountNum' }
        } 
      },
      { 
        $project: { 
          _id: 0, 
          result: '$_id', 
          count: 1, 
          totalPrizeAmount: 1,
          avgPrizeAmount: 1,
          prizeAmount: { $round: ['$avgPrizeAmount', 0] }
        } 
      },
      { $sort: { count: -1 } },
    ]).toArray();

    // Daily activity (apply tz)
    const byDay = await SpinResults.aggregate([
      ...base,
      { $group: { _id: { $dateToString: { date: '$ts', format: '%Y-%m-%d', timezone: tz } }, count: { $sum: 1 } } },
      { $project: { _id: 0, day: '$_id', count: 1 } },
      { $sort: { day: 1 } },
    ]).toArray();

    // Hour-of-day distribution
    const byHour = await SpinResults.aggregate([
      ...base,
      { $group: { _id: { $hour: '$ts' }, count: { $sum: 1 } } },
      { $project: { _id: 0, hour: '$_id', count: 1 } },
      { $sort: { hour: 1 } },
    ]).toArray();

    // Day-of-week distribution (1=Sun ... 7=Sat)
    const dayOfWeek = await SpinResults.aggregate([
      ...base,
      { $group: { _id: { $dayOfWeek: '$ts' }, count: { $sum: 1 } } },
      { $project: { _id: 0, dow: '$_id', count: 1 } },
      { $sort: { dow: 1 } },
    ]).toArray();

    // Spend stats (amountSpent might be string; sanitize and sum)
    const amountAgg = await SpinResults.aggregate([
      ...base,
      {
        $addFields: {
          _amountStr: {
            $trim: {
              input: {
                $replaceAll: {
                  input: {
                    $replaceAll: {
                      input: { $ifNull: ['$amountSpent', '0'] },
                      find: ',',
                      replacement: '',
                    },
                  },
                  find: '₹',
                  replacement: '',
                },
              },
            },
          },
        },
      },
      { $addFields: { amountNum: { $convert: { input: '$_amountStr', to: 'double', onError: 0, onNull: 0 } } } },
      {
        $group: {
          _id: null,
          totalAmountSpent: { $sum: '$amountNum' },
          avgAmountSpent: { $avg: '$amountNum' },
        },
      },
      { $project: { _id: 0, totalAmountSpent: 1, avgAmountSpent: 1 } },
    ]).toArray();
    const amountStats = amountAgg[0] || { totalAmountSpent: 0, avgAmountSpent: 0 };

    // Dwell time (seconds) using inTime/outTime when available
    const dwellAgg = await SpinResults.aggregate([
      ...base,
      {
        $addFields: {
          _in: {
            $switch: {
              branches: [{ case: { $eq: [{ $type: '$inTime' }, 'date'] }, then: '$inTime' }],
              default: { $toDate: '$inTime' },
            },
          },
          _out: {
            $switch: {
              branches: [{ case: { $eq: [{ $type: '$outTime' }, 'date'] }, then: '$outTime' }],
              default: { $toDate: '$outTime' },
            },
          },
        },
      },
      { $match: { _in: { $ne: null }, _out: { $ne: null } } },
      { $addFields: { dwellSecs: { $divide: [{ $subtract: ['$_out', '$_in'] }, 1000] } } },
      {
        $group: {
          _id: null,
          avgDwellSecs: { $avg: '$dwellSecs' },
          maxDwellSecs: { $max: '$dwellSecs' },
          minDwellSecs: { $min: '$dwellSecs' },
          samples: { $sum: 1 },
        },
      },
      { $project: { _id: 0, avgDwellSecs: 1, maxDwellSecs: 1, minDwellSecs: 1, samples: 1 } },
    ]).toArray();
    const dwellTime = dwellAgg[0] || { avgDwellSecs: 0, maxDwellSecs: 0, minDwellSecs: 0, samples: 0 };

    // Device breakdown (basic UA classification)
    const devices = await SpinResults.aggregate([
      ...base,
      {
        $addFields: {
          device: {
            $switch: {
              branches: [
                { case: { $regexMatch: { input: { $ifNull: ['$userAgent', ''] }, regex: /android/i } }, then: 'Android' },
                { case: { $regexMatch: { input: { $ifNull: ['$userAgent', ''] }, regex: /iphone|ipad|ios/i } }, then: 'iOS' },
                { case: { $regexMatch: { input: { $ifNull: ['$userAgent', ''] }, regex: /windows|macintosh|linux/i } }, then: 'Desktop' },
              ],
              default: 'Other',
            },
          },
        },
      },
      { $group: { _id: '$device', count: { $sum: 1 } } },
      { $project: { _id: 0, device: '$_id', count: 1 } },
      { $sort: { count: -1 } },
    ]).toArray();

    // Visitors
    const visitorKeyAdd = {
      $addFields: {
        __vk: {
          $trim: {
            input: {
              $toLower: {
                $concat: [{ $ifNull: ['$name', ''] }, '|', { $ifNull: ['$surname', ''] }],
              },
            },
          },
        },
      },
    };

    const uniqueVisitorsAgg = await SpinResults.aggregate([
      ...base,
      visitorKeyAdd,
      { $match: { __vk: { $ne: '' } } },
      { $group: { _id: '$__vk' } },
      { $count: 'count' },
    ]).toArray();
    const uniqueVisitors = uniqueVisitorsAgg[0]?.count || 0;

    const returningVisitorsAgg = await SpinResults.aggregate([
      ...base,
      visitorKeyAdd,
      { $match: { __vk: { $ne: '' } } },
      { $group: { _id: '$__vk', visits: { $sum: 1 } } },
      { $match: { visits: { $gt: 1 } } },
      { $count: 'count' },
    ]).toArray();
    const returningVisitors = returningVisitorsAgg[0]?.count || 0;

    const topReturning = await SpinResults.aggregate([
      ...base,
      visitorKeyAdd,
      { $match: { __vk: { $ne: '' } } },
      {
        $group: {
          _id: '$__vk',
          visits: { $sum: 1 },
          anyName: { $first: '$name' },
          anySurname: { $first: '$surname' },
          lastVisit: { $max: '$ts' },
        },
      },
      { $match: { visits: { $gt: 1 } } },
      { $sort: { visits: -1, lastVisit: -1 } },
      { $limit: 10 },
      {
        $project: {
          _id: 0,
          fullName: {
            $trim: {
              input: { $concat: [{ $ifNull: ['$anyName', ''] }, ' ', { $ifNull: ['$anySurname', ''] }] },
            },
          },
          visits: 1,
          lastVisit: 1,
        },
      },
    ]).toArray();

    // Total spins
    const totalSpinsAgg = await SpinResults.aggregate([...base, { $count: 'count' }]).toArray();
    const totalSpins = totalSpinsAgg[0]?.count || 0;

    // By route only if user is allowed to see all
    let byRoute = [];
    if (!allowedNorm) {
      byRoute = await SpinResults.aggregate([
        ...base,
        { $group: { _id: '$__rn', count: { $sum: 1 } } },
        { $project: { _id: 0, routeName: '$_id', count: 1 } },
        { $sort: { count: -1 } },
      ]).toArray();
    }

    // --- Financial rollups: compute per-row amountNum once then reuse ---
    const amountPrep = [
      {
        $addFields: {
          _amountStr: {
            $trim: {
              input: {
                $replaceAll: {
                  input: {
                    $replaceAll: {
                      input: { $ifNull: ['$amountSpent', '0'] },
                      find: ',',
                      replacement: '',
                    },
                  },
                  find: '₹',
                  replacement: '',
                },
              },
            },
          },
        },
      },
      { $addFields: { amountNum: { $convert: { input: '$_amountStr', to: 'double', onError: 0, onNull: 0 } } } },
    ];

    // Add: discount/prize preprocessors used in topDaily (parse to numbers)
    const discountPrep = [
      {
        $addFields: {
          _discountStr: {
            $trim: {
              input: {
                $replaceAll: {
                  input: {
                    $replaceAll: {
                      input: {
                        $ifNull: [
                          '$discount',
                          { $ifNull: ['$discountGiven', { $ifNull: ['$couponAmount', '0'] }] },
                        ],
                      },
                      find: ',',
                      replacement: '',
                    },
                  },
                  find: '₹',
                  replacement: '',
                },
              },
            },
          },
        },
      },
      { $addFields: { discountNum: { $convert: { input: '$_discountStr', to: 'double', onError: 0, onNull: 0 } } } },
    ];

    const prizeAmountPrep = [
      {
        $addFields: {
          _prizeAmountStr: {
            $trim: {
              input: {
                $replaceAll: {
                  input: {
                    $replaceAll: {
                      input: { $ifNull: ['$prizeAmount', '0'] },
                      find: ',',
                      replacement: '',
                    },
                  },
                  find: '₹',
                  replacement: '',
                },
              },
            },
          },
        },
      },
      { $addFields: { prizeAmountNum: { $convert: { input: '$_prizeAmountStr', to: 'double', onError: 0, onNull: 0 } } } },
    ];

    // --- Top Daily Metrics using tz-safe dayKey ---
    const currentDayKey = new Date().toLocaleDateString('en-CA', { timeZone: tz }); // YYYY-MM-DD
    const todayRollupAgg = await SpinResults.aggregate([
      ...base,
      ...amountPrep,
      ...discountPrep,
      ...prizeAmountPrep,
      { $addFields: { dayKey: { $dateToString: { date: '$ts', format: '%Y-%m-%d', timezone: tz } } } },
      {
        $group: {
          _id: null,
          spins: { $sum: 1 },
          sales: { $sum: '$amountNum' },
          discounts: { $sum: '$discountNum' },
          prizeAmount: { $sum: '$prizeAmountNum' },
        },
      },
      { $project: { _id: 0, spins: 1, sales: 1, discounts: 1, prizeAmount: 1 } },
    ]).toArray();
    const todayRoll = todayRollupAgg[0] || { spins: 0, sales: 0, discounts: 0, prizeAmount: 0 };

    const uniqueTodayAgg = await SpinResults.aggregate([
      ...base,
      { $addFields: { dayKey: { $dateToString: { date: '$ts', format: '%Y-%m-%d', timezone: tz } } } },
      { $match: { dayKey: currentDayKey } },
      visitorKeyAdd,
      { $match: { __vk: { $ne: '' } } },
      { $group: { _id: '$__vk' } },
      { $count: 'count' },
    ]).toArray();
    const customersToday = uniqueTodayAgg[0]?.count || 0;

    const topDaily = {
      customers: customersToday,
      spins: todayRoll.spins || 0,
      sales: todayRoll.sales || 0,
      discounts: todayRoll.discounts || 0,
      prizeAmount: todayRoll.prizeAmount || 0,
      income: Math.max(0, (todayRoll.sales || 0) - (todayRoll.discounts || 0)),
    };

    // Financial rollups (day/week/month) for charts
    const financialBase = [...base, ...amountPrep, ...discountPrep];

    const dailyFinancial = await SpinResults.aggregate([
      ...financialBase,
      { $addFields: { day: { $dateToString: { date: '$ts', format: '%Y-%m-%d', timezone: tz } } } },
      {
        $group: {
          _id: '$day',
          spins: { $sum: 1 },
          sales: { $sum: '$amountNum' },
          discount: { $sum: '$discountNum' },
        },
      },
      {
        $project: {
          _id: 0,
          day: '$_id',
          spins: 1,
          sales: { $round: ['$sales', 2] },
          discount: { $round: ['$discount', 2] },
          income: { $round: [{ $subtract: ['$sales', '$discount'] }, 2] },
        },
      },
      { $sort: { day: 1 } },
      { $limit: 30 },
    ]).toArray();

    const weeklyFinancial = await SpinResults.aggregate([
      ...financialBase,
      {
        $addFields: {
          week: {
            $dateToString: { date: '$ts', format: '%G-W%V', timezone: tz },
          },
        },
      },
      {
        $group: {
          _id: '$week',
          spins: { $sum: 1 },
          sales: { $sum: '$amountNum' },
          discount: { $sum: '$discountNum' },
        },
      },
      {
        $project: {
          _id: 0,
          week: '$_id',
          spins: 1,
          sales: { $round: ['$sales', 2] },
          discount: { $round: ['$discount', 2] },
          income: { $round: [{ $subtract: ['$sales', '$discount'] }, 2] },
        },
      },
      { $sort: { week: 1 } },
      { $limit: 26 },
    ]).toArray();

    const monthlyFinancial = await SpinResults.aggregate([
      ...financialBase,
      { $addFields: { month: { $dateToString: { date: '$ts', format: '%Y-%m', timezone: tz } } } },
      {
        $group: {
          _id: '$month',
          spins: { $sum: 1 },
          sales: { $sum: '$amountNum' },
          discount: { $sum: '$discountNum' },
        },
      },
      {
        $project: {
          _id: 0,
          month: '$_id',
          spins: 1,
          sales: { $round: ['$sales', 2] },
          discount: { $round: ['$discount', 2] },
          income: { $round: [{ $subtract: ['$sales', '$discount'] }, 2] },
        },
      },
      { $sort: { month: 1 } },
      { $limit: 12 },
    ]).toArray();

    res.json({
      totalSpins,
      byResult,
      byDay,
      byHour,
      dayOfWeek,
      uniqueVisitors,
      returningVisitors,
      topReturning,
      amountStats,
      dwellTime,
      devices,
      byRoute,
      dailyFinancial,
      weeklyFinancial,
      monthlyFinancial,
      topDaily,
    });
  } catch (e) {
    console.error('analytics error:', e);
    res.status(500).json({ error: 'Server error' });
  }
};

// Customer Details Endpoint - Get detailed spin history for a specific customer
const customerDetailsHandler = async (req, res) => {
  try {
    const { customerId } = req.params;
    const user = req.user;

    if (!customerId) {
      return res.status(400).json({ error: 'Customer ID is required' });
    }

    // Base route filtering
    const base = [
      { $addFields: { __rn: { $toLower: { $trim: { input: '$routeName' } } } } },
      {
        $addFields: {
          tsSource: {
            $ifNull: ['$createdAt', { $ifNull: ['$outTime', { $ifNull: ['$inTime', '$timestamp'] }] }],
          },
        },
      },
      {
        $addFields: {
          ts: {
            $switch: {
              branches: [{ case: { $eq: [{ $type: '$tsSource' }, 'date'] }, then: '$tsSource' }],
              default: { $toDate: '$tsSource' },
            },
          },
        },
      },
      { $match: { ts: { $ne: null } } },
    ];

    const allowedNorm = user.routeName === 'all' ? null : user.routeName;
    if (allowedNorm) base.push({ $match: { __rn: allowedNorm } });

    // Validate route exists in login collection
    base.push(
      {
        $lookup: {
          from: 'login',
          let: { rn: '$__rn' },
          pipeline: [
            { $addFields: { __rn: { $toLower: { $trim: { input: '$routeName' } } } } },
            { $match: { $expr: { $eq: ['$$rn', '$__rn'] } } },
          ],
          as: 'loginMatches',
        },
      },
      { $match: { $expr: { $gt: [{ $size: '$loginMatches' }, 0] } } }
    );

    // Amount and prize amount parsing
    const amountPrep = [
      {
        $addFields: {
          _amountStr: {
            $trim: {
              input: {
                $replaceAll: {
                  input: {
                    $replaceAll: {
                      input: { $ifNull: ['$amountSpent', '0'] },
                      find: ',',
                      replacement: '',
                    },
                  },
                  find: '₹',
                  replacement: '',
                },
              },
            },
          },
          _prizeAmountStr: {
            $trim: {
              input: {
                $replaceAll: {
                  input: {
                    $replaceAll: {
                      input: { $ifNull: ['$prizeAmount', '0'] },
                      find: ',',
                      replacement: '',
                    },
                  },
                  find: '₹',
                  replacement: '',
                },
              },
            },
          },
        },
      },
      { 
        $addFields: { 
          amountNum: { $convert: { input: '$_amountStr', to: 'double', onError: 0, onNull: 0 } },
          prizeAmountNum: { $convert: { input: '$_prizeAmountStr', to: 'double', onError: 0, onNull: 0 } }
        }
      },
    ];

    // Name preparation and customer matching
    const namePrep = [
      {
        $addFields: {
          _fullName: {
            $trim: {
              input: { $concat: [{ $ifNull: ['$name', ''] }, ' ', { $ifNull: ['$surname', ''] }] },
            },
          },
          _session: {
            $ifNull: ['$sessionId', { $ifNull: ['$sessionID', { $ifNull: ['$session', ''] }] }],
          },
        },
      },
      {
        $addFields: {
          __vk: {
            $trim: {
              input: {
                $toLower: {
                  $cond: [
                    { $ne: ['$_fullName', ''] },
                    '$_fullName',
                    {
                      $cond: [
                        { $ne: ['$_session', ''] },
                        '$_session',
                        { $ifNull: ['$ipAddress', ''] },
                      ],
                    },
                  ],
                },
              },
            },
          },
        },
      },
    ];

    // Match specific customer by decoded customerId
    const customerMatch = { $match: { __vk: customerId.toLowerCase() } };

    const pipeline = [
      ...base,
      ...amountPrep,
      ...namePrep,
      customerMatch,
      { $sort: { ts: -1 } }, // Latest spins first
      {
        $project: {
          _id: 0,
          fullName: '$_fullName',
          sessionId: '$_session',
          spinDate: '$ts',
          amountSpent: '$amountNum',
          prizeAmount: '$prizeAmountNum',
          prize: { $ifNull: ['$winner', '$result'] },
          prizeType: { $ifNull: ['$prizeType', 'other'] },
          userAgent: 1,
          ipAddress: 1,
          routeName: 1,
        },
      },
      { $limit: 100 }, // Limit to last 100 spins
    ];

    const customerSpins = await SpinResults.aggregate(pipeline).toArray();

    if (customerSpins.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Calculate summary stats
    const totalSpins = customerSpins.length;
    const totalSpent = customerSpins.reduce((sum, spin) => sum + (spin.amountSpent || 0), 0);
    const totalPrizeAmount = customerSpins.reduce((sum, spin) => sum + (spin.prizeAmount || 0), 0);
    const avgSpent = totalSpins > 0 ? totalSpent / totalSpins : 0;

    // Group by date for daily activity
    const dailyActivity = {};
    customerSpins.forEach(spin => {
      const date = spin.spinDate.toISOString().split('T')[0];
      if (!dailyActivity[date]) {
        dailyActivity[date] = { spins: 0, spent: 0, prizes: 0 };
      }
      dailyActivity[date].spins += 1;
      dailyActivity[date].spent += spin.amountSpent || 0;
      dailyActivity[date].prizes += spin.prizeAmount || 0;
    });

    const customerDetails = {
      customer: {
        fullName: customerSpins[0].fullName,
        sessionId: customerSpins[0].sessionId,
        totalSpins,
        totalSpent,
        totalPrizeAmount,
        avgSpent,
        firstVisit: customerSpins[customerSpins.length - 1].spinDate,
        lastVisit: customerSpins[0].spinDate,
      },
      spins: customerSpins,
      dailyActivity: Object.entries(dailyActivity).map(([date, stats]) => ({
        date,
        ...stats,
      })).sort((a, b) => b.date.localeCompare(a.date)),
    };

    res.json(customerDetails);
  } catch (e) {
    console.error('Customer details error:', e);
    res.status(500).json({ error: 'Server error' });
  }
};

// Monthly Customers Endpoint
const monthlyCustomersHandler = async (req, res) => {
  try {
    const user = req.user;

    // Base route filtering (same as other endpoints)
    const base = [
      { $addFields: { __rn: { $toLower: { $trim: { input: '$routeName' } } } } },
      {
        $addFields: {
          tsSource: {
            $ifNull: ['$createdAt', { $ifNull: ['$outTime', { $ifNull: ['$inTime', '$timestamp'] }] }],
          },
        },
      },
      {
        $addFields: {
          ts: {
            $switch: {
              branches: [{ case: { $eq: [{ $type: '$tsSource' }, 'date'] }, then: '$tsSource' }],
              default: { $toDate: '$tsSource' },
            },
          },
        },
      },
      { $match: { ts: { $ne: null } } },
    ];

    const allowedNorm = user.routeName === 'all' ? null : user.routeName;
    if (allowedNorm) base.push({ $match: { __rn: allowedNorm } });

    base.push(
      {
        $lookup: {
          from: 'login',
          let: { rn: '$__rn' },
          pipeline: [
            { $addFields: { __rn: { $toLower: { $trim: { input: '$routeName' } } } } },
            { $match: { $expr: { $eq: ['$$rn', '$__rn'] } } },
          ],
          as: 'loginMatches',
        },
      },
      { $match: { $expr: { $gt: [{ $size: '$loginMatches' }, 0] } } }
    );

    // Get current and last month dates
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    // Customer key preparation
    const visitorKeyAdd = {
      $addFields: {
        __vk: {
          $trim: {
            input: {
              $toLower: {
                $concat: [{ $ifNull: ['$name', ''] }, '|', { $ifNull: ['$surname', ''] }],
              },
            },
          },
        },
      },
    };

    // This month customers
    const thisMonthAgg = await SpinResults.aggregate([
      ...base,
      { $match: { ts: { $gte: thisMonthStart } } },
      visitorKeyAdd,
      { $match: { __vk: { $ne: '' } } },
      { $group: { _id: '$__vk' } },
      { $count: 'count' },
    ]).toArray();

    // Last month customers
    const lastMonthAgg = await SpinResults.aggregate([
      ...base,
      { $match: { ts: { $gte: lastMonthStart, $lte: lastMonthEnd } } },
      visitorKeyAdd,
      { $match: { __vk: { $ne: '' } } },
      { $group: { _id: '$__vk' } },
      { $count: 'count' },
    ]).toArray();

    const thisMonth = thisMonthAgg[0]?.count || 0;
    const lastMonth = lastMonthAgg[0]?.count || 0;

    res.json({
      thisMonth,
      lastMonth,
      growth: lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth * 100).toFixed(1) : '0',
    });
  } catch (e) {
    console.error('Monthly customers error:', e);
    res.status(500).json({ error: 'Server error' });
  }
};

// Update customer search for case-insensitive search
const customerSearchHandler = async (req, res) => {
  try {
    const { search = '', limit = 50 } = req.query;
    const user = req.user;

    // Normalize and restrict by route the same way as analytics
    const base = [
      { $addFields: { __rn: { $toLower: { $trim: { input: '$routeName' } } } } },
      {
        $addFields: {
          // pick a reliable timestamp from createdAt/outTime/inTime/timestamp
          tsSource: {
            $ifNull: ['$createdAt', { $ifNull: ['$outTime', { $ifNull: ['$inTime', '$timestamp'] }] }],
          },
        },
      },
      {
        $addFields: {
          ts: {
            $switch: {
              branches: [{ case: { $eq: [{ $type: '$tsSource' }, 'date'] }, then: '$tsSource' }],
              default: { $toDate: '$tsSource' },
            },
          },
        },
      },
      { $match: { ts: { $ne: null } } },
    ];

    const allowedNorm = user.routeName === 'all' ? null : user.routeName;
    if (allowedNorm) base.push({ $match: { __rn: allowedNorm } });

    // Validate route exists in login collection (same as analytics)
    base.push(
      {
        $lookup: {
          from: 'login',
          let: { rn: '$__rn' },
          pipeline: [
            { $addFields: { __rn: { $toLower: { $trim: { input: '$routeName' } } } } },
            { $match: { $expr: { $eq: ['$$rn', '$__rn'] } } },
          ],
          as: 'loginMatches',
        },
      },
      { $match: { $expr: { $gt: [{ $size: '$loginMatches' }, 0] } } }
    );

    // Amount parsing (₹#,###.## or plain strings)
    const amountPrep = [
      {
        $addFields: {
          _amountStr: {
            $trim: {
              input: {
                $replaceAll: {
                  input: {
                    $replaceAll: {
                      input: { $ifNull: ['$amountSpent', '0'] },
                      find: ',',
                      replacement: '',
                    },
                  },
                  find: '₹',
                  replacement: '',
                },
              },
            },
          },
        },
      },
      { $addFields: { amountNum: { $convert: { input: '$_amountStr', to: 'double', onError: 0, onNull: 0 } } } },
    ];

    // Name/session helpers
    const namePrep = [
      {
        $addFields: {
          _name: { $ifNull: ['$name', ''] },
          _surname: { $ifNull: ['$surname', ''] },
          _fullName: {
            $trim: {
              input: { $concat: [{ $ifNull: ['$name', ''] }, ' ', { $ifNull: ['$surname', ''] }] },
            },
          },
          _session: {
            $ifNull: ['$sessionId', { $ifNull: ['$sessionID', { $ifNull: ['$session', ''] }] }],
          },
        },
      },
      {
        $addFields: {
          // Customer key preference: full name -> session id -> ip
          __vk: {
            $trim: {
              input: {
                $toLower: {
                  $cond: [
                    { $ne: ['$_fullName', ''] }, // fixed path
                    '$_fullName',               // fixed path
                    {
                      $cond: [
                        { $ne: ['$_session', ''] },
                        '$_session',
                        { $ifNull: ['$ipAddress', ''] },
                      ],
                    },
                  ],
                },
              },
            },
          },
        },
      },
    ];

    // Optional search across concatenated name, session, ip, userAgent (case-insensitive)
    const searchStage = !search
      ? []
      : [
          {
            $match: {
              $or: [
                { _fullName: { $regex: search.trim(), $options: 'i' } }, // Case-insensitive
                { _session: { $regex: search.trim(), $options: 'i' } },
                { ipAddress: { $regex: search.trim(), $options: 'i' } },
                { userAgent: { $regex: search.trim(), $options: 'i' } },
              ],
            },
          },
        ];

    const pipeline = [
      ...base,
      ...amountPrep,
      ...namePrep,
      // ignore rows that still have empty key
      { $match: { __vk: { $ne: '' } } },
      ...searchStage,
      // sort by time so $last works as "latest"
      { $sort: { ts: 1 } },
      {
        $group: {
          _id: '$__vk',
          fullName: { $last: '$_fullName' },
          sessionId: { $last: '$_session' },
          visits: { $sum: 1 },
          totalSpent: { $sum: '$amountNum' },
          avgSpent: { $avg: '$amountNum' },
          lastVisit: { $max: '$ts' },
          firstVisit: { $min: '$ts' },
          lastPrize: { $last: { $ifNull: ['$winner', '$result'] } },
          lastPrizeAmount: { $last: { $ifNull: ['$prizeAmount', 0] } },
          userAgent: { $last: '$userAgent' },
          ipAddress: { $last: '$ipAddress' },
        },
      },
      {
        $project: {
          _id: 0,
          fullName: { $ifNull: ['$fullName', ''] },
          sessionId: 1,
          visits: 1,
          totalSpent: { $round: ['$totalSpent', 2] },
          avgSpent: { $round: ['$avgSpent', 2] },
          lastVisit: 1,
          firstVisit: 1,
          lastPrize: 1,
          lastPrizeAmount: 1,
          userAgent: 1,
          ipAddress: 1,
          customerType: {
            $cond: [
              { $gte: ['$visits', 5] },
              'Loyal',
              { $cond: [{ $gte: ['$visits', 2] }, 'Returning', 'New'] },
            ],
          },
        },
      },
      // Prefer most recent active customers first
      { $sort: { lastVisit: -1, visits: -1 } },
      { $limit: parseInt(limit) || 50 },
    ];

    const customers = await SpinResults.aggregate(pipeline).toArray();

    res.json({
      customers,
      total: customers.length,
      searchTerm: search,
    });
  } catch (e) {
    console.error('Customer search error:', e);
    res.status(500).json({ error: 'Server error' });
  }
};

app.get('/api/customers/search', basicAuth, customerSearchHandler);
app.get('/api/customers/monthly', basicAuth, monthlyCustomersHandler);
app.get('/api/customers/:customerId/details', basicAuth, customerDetailsHandler);

app.get('/api/analytics', basicAuth, analyticsHandler);
app.post('/api/analytics', basicAuth, analyticsHandler);

connect()
  .then(() =>
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Spin & Win API running on:`);
      console.log(`   Local:    http://localhost:${PORT}`);
      console.log(`   Network:  http://0.0.0.0:${PORT}`);
      console.log(`   Health:   http://localhost:${PORT}/api/health`);
    })
  )
  .catch((e) => {
    console.error('Failed to start server:', e);
    process.exit(1);
  });
