# Monetization Plan - Stamplicity

## Overview
Stamplicity follows a "Freemium" model designed to provide value to casual users while encouraging power users to upgrade.

## Usage Tiers

| Feature | Free Tier | Premium Tier |
|---------|-----------|--------------|
| **AI Identifying Service** | 15 runs per month | Unlimited |
| **Collection Logging** | Up to 10 objects | Unlimited |
| **Cross-Platform Sync** | PWA Local Only | Cloud Sync (Supabase) |
| **Market Value Data** | Basic | Advanced Insights |

## Developer Features
- **Open Access**: Developers working on the project (identified via `NODE_ENV=development` or `x-dev-access` header) have all premium features unlocked by default.
- **API Sandbox**: A sandbox mode for testing AI identifications without consuming usage quotas.

## Technical Implementation
- **Usage Limiter Middleware**: Tracks requests per IP/User ID.
- **Client-Side Flags**: UI components adapt based on `premium` status.
- **Supabase Integration**: (Planned) To handle user accounts and subscription states.

## Pricing Strategy
- **Standard**: $4.99/mo - Unlimited AI & Logging.
- **Pro**: $9.99/mo - High-res analysis & Export features.
