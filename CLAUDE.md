# Twinkle Crew Mobile App

## Project Overview

**Twinkle** is a premium party-decoration and setup brand in Riyadh. Customers order custom backdrops, balloon installations, and themed setups for birthdays, baby showers, graduations, Eid, and weddings. Every order ends in a white-glove delivery: our crew arrives at the customer's home or venue and physically installs the decoration.

### Operational Context

Two facts about our operation shape everything in this project:

1. **Team overlap**: The team that prepares orders is the same team that delivers them. Mornings (8 AM–12 PM) are spent preparing and loading. Deliveries run from 12 PM to 8 PM, split into two fixed slots — afternoon slot (12:00–16:00) and evening slot (16:00–20:00).

2. **Zero margin for error**: A late or wrong delivery is catastrophic. Our customers have events at fixed times. A backdrop that arrives even 15–30 minutes into a party is a ruined celebration — a full refund and a customer lost for good. The installation also has to match what was ordered, exactly.

### Current State & Problem

Today operations run on Shopify + WhatsApp (Gallabox). On delivery day the crew works off a WhatsApp group and a shared spreadsheet: addresses get copy-pasted, "done" is a thumbs-up emoji, proof-of-setup photos scatter across personal phones. When signal drops in a villa compound or majlis, the crew is flying blind.

**What we're building**: A mobile app the delivery crew uses on the road to run their day.

## Core Requirements

### The One Principle
**A status update or completion photo must never be lost** — not when the app is killed, not when the phone is offline for an hour, not when two updates happen back to back. If the crew tapped it, it survives and eventually syncs. When in doubt, keep the local record and reconcile later. Losing proof of a delivery is as bad as losing the delivery.

### Feature Scope

**A. Today's run**  
Load the crew's stops for the day and show them as an ordered list grouped by slot (afternoon / evening), each with customer name, area, address line, time window, and current status. A stop detail screen shows the full order: items to install, notes, and contact.

**B. Status transitions**  
Let the crew advance a stop through the lifecycle below. Enforce sensible order (you can't complete a stop that was never started). Failed requires a reason. Each change is timestamped locally at the moment of the tap.

| Status | Meaning | Set when |
|--------|---------|----------|
| Loaded | Order is on the truck, ready to go | Before leaving the FC |
| En route | Crew is driving to this stop | Leaving the previous stop |
| Arrived | Crew is on site, setting up | At the door |
| Completed | Setup installed & photographed | Photo + customer confirmation captured |
| Failed | Couldn't deliver (no access, wrong address, customer absent) | With a required reason |

**C. Offline-first, never lose an update**  
Every status change and photo must persist locally immediately and survive an app kill or restart. When connectivity returns, queued changes sync to the mock API in order. A change made offline and then re-synced must not double-apply, and a failed sync must retry rather than silently drop. Make sync state visible to the crew (pending / synced / failed).

**D. Proof of setup**  
Completing a stop requires capturing at least one photo (camera or image picker is fine) plus an optional note. The photo is stored locally and queued for upload with the completion — and it survives offline exactly like a status change. The stop's detail view shows the captured proof.

**E. Lateness awareness**  
Each stop has a "must finish by" time. Surface a clear, calm warning when a stop is at risk of running late (e.g., still en route with little margin left), so the crew can call ahead. Reliability-first: a quiet, honest signal beats a noisy one.

---

@AGENTS.md
