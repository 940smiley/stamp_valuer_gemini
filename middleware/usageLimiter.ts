// usageLimiter.ts
import { Request, Response, NextFunction } from 'express';

// Simple in-memory usage tracking (per IP). In production replace with persistent store.
const usageMap = new Map<string, { count: number; resetTime: number }>();
const LIMIT = 15; // runs per month per user (IP for demo)
const WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function usageLimiter(req: Request, res: Response, next: NextFunction) {
    // Developer bypass
    if (process.env.NODE_ENV === 'development' || req.headers['x-dev-access'] === 'true') {
        return next();
    }

    // Premium bypass (simulated)
    if (req.headers['x-premium-user'] === 'true') {
        return next();
    }

    const ip = req.ip;
    const now = Date.now();
    const record = usageMap.get(ip) ?? { count: 0, resetTime: now + WINDOW_MS };
    if (now > record.resetTime) {
        // reset window
        record.count = 0;
        record.resetTime = now + WINDOW_MS;
    }
    if (record.count >= LIMIT) {
        res.status(429).json({ error: 'Usage limit exceeded. Identifying service is limited to 15 runs per month. Upgrade to premium for unlimited service.' });
        return;
    }
    record.count += 1;
    usageMap.set(ip, record);
    next();
}
