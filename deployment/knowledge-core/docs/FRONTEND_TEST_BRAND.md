# Frontend Test Brand Walkthrough

## Goal

This file gives you one complete fictional brand you can enter through the frontend so every screen has useful data.

You do **not** need to enter a `brand_id` anywhere in the UI.  
The frontend already uses `brand_001` internally.

## Test Brand

Use this fictional brand:

- Brand name: `Northstar Wellness`
- Theme: supplements and wellness education

## What You Will End Up With

After entering everything below, you should have:

- `6` entities
- `11` facts
- `4` citations
- `2` authors

On the dashboard, you should roughly see:

- Entities: `6`
- Total Facts: `11`
- Citations: `4`
- Authors: `2`

Verified fact count on the dashboard should be around `7` because the dashboard counts facts with confidence `>= 0.85`.

## 1. Add Citations First

Go to `/sources` and add these 4 sources.

### Source 1

- URL: `https://example.com`
- Title: leave blank
- Source Type: `Website`
- Reliability: `⭐⭐⭐ Medium`

### Source 2

- URL: `https://www.nih.gov`
- Title: leave blank
- Source Type: `Research Paper`
- Reliability: `⭐⭐⭐⭐⭐ Very High`

### Source 3

- URL: `https://www.cdc.gov`
- Title: leave blank
- Source Type: `Government Doc`
- Reliability: `⭐⭐⭐⭐⭐ Very High`

### Source 4

- URL: `https://www.who.int`
- Title: leave blank
- Source Type: `Website`
- Reliability: `⭐⭐⭐⭐ High`

### What You Should See

- each item should appear in the citations list
- the title should auto-fill if the site responds
- the domain should display
- the item should usually show `Live`

## 2. Add Authors

Go to `/authors` and create these 2 authors.

### Author 1

- Full Name: `Dr. Maya Rao`
- Bio: `Clinical nutrition specialist and scientific advisor for Northstar Wellness.`
- Credentials / Qualifications: `PhD in Nutrition, RD`
- LinkedIn URL: `https://www.linkedin.com/in/maya-rao`
- Expertise Areas: `Clinical Nutrition, Supplements, Wellness`

### Author 2

- Full Name: `Arjun Mehta`
- Bio: `Product educator focused on supplement routines, dosage clarity, and customer education.`
- Credentials / Qualifications: `Certified Health Coach`
- LinkedIn URL: `https://www.linkedin.com/in/arjun-mehta`
- Expertise Areas: `Customer Education, Wellness Content, Product Training`

### What You Should See

- both authors appear as cards
- each author shows expertise chips
- E-E-A-T signals should show positive values because credentials and LinkedIn are filled in

## 3. Add Entities

Go to `/entities` and add these 6 entities.

### Entity 1

- Name: `Northstar Calm Gummies`
- Type: `Product`
- Category: `Sleep Support`
- Description: `Magnesium-based evening gummies for stress and sleep support.`

### Entity 2

- Name: `Northstar Focus Capsules`
- Type: `Product`
- Category: `Daily Energy`
- Description: `Morning capsules designed for focus and steady energy.`

### Entity 3

- Name: `Dr. Maya Rao`
- Type: `Person`
- Category: `Clinical Nutrition`
- Description: `Scientific advisor for Northstar Wellness.`

### Entity 4

- Name: `Wellness Innovation Award 2025`
- Type: `Award`
- Category: `Industry Recognition`
- Description: `Recognition for product clarity and customer education.`

### Entity 5

- Name: `Repeat Purchase Rate`
- Type: `Stat`
- Category: `Customer Metrics`
- Description: `Quarterly repeat purchase benchmark for the flagship line.`

### Entity 6

- Name: `30-Day Refund Policy`
- Type: `Policy`
- Category: `Customer Support`
- Description: `Refund terms for first retail orders.`

### What You Should See

- entity list shows all 6 entries
- searching `Northstar` should show the 2 product entities
- filtering by `Product` should show 2 entries
- filtering by `Policy` should show 1 entry

## 4. Add Facts To Each Entity

Open each entity from the list and add the facts below in `/entities/:id`.

## 4.1 Facts For `Northstar Calm Gummies`

### Fact 1

- Attribute: `Magnesium per serving`
- Value: `200`
- Unit: `mg`
- Confidence: `High (90%)`
- Source URL: `https://www.nih.gov`

### Fact 2

- Attribute: `Flavor`
- Value: `Mixed Berry`
- Unit: leave blank
- Confidence: `Good (80%)`
- Source URL: `https://example.com`

### Fact 3

- Attribute: `Sugar per serving`
- Value: `2`
- Unit: `g`
- Confidence: `High (90%)`
- Source URL: `https://www.cdc.gov`

### Expected Result

- this entity should show `3` facts
- two facts should look strongly verified by badge color

## 4.2 Facts For `Northstar Focus Capsules`

### Fact 1

- Attribute: `Caffeine per serving`
- Value: `80`
- Unit: `mg`
- Confidence: `High (90%)`
- Source URL: `https://www.nih.gov`

### Fact 2

- Attribute: `Capsules per bottle`
- Value: `60`
- Unit: `capsules`
- Confidence: `Good (80%)`
- Source URL: `https://example.com`

### Expected Result

- this entity should show `2` facts

## 4.3 Facts For `Dr. Maya Rao`

### Fact 1

- Attribute: `Years of experience`
- Value: `12`
- Unit: `years`
- Confidence: `High (90%)`
- Source URL: `https://example.com`

### Fact 2

- Attribute: `Specialty`
- Value: `Clinical Nutrition`
- Unit: leave blank
- Confidence: `High (90%)`
- Source URL: `https://www.who.int`

### Expected Result

- this entity should show `2` facts

## 4.4 Facts For `Wellness Innovation Award 2025`

### Fact 1

- Attribute: `Issuer`
- Value: `Health Product Review`
- Unit: leave blank
- Confidence: `Low (70%)`
- Source URL: `https://example.com`

### Expected Result

- this entity should show `1` fact
- this one is intentionally lower confidence so FactGuard can show a `low_confidence` result

## 4.5 Facts For `Repeat Purchase Rate`

### Fact 1

- Attribute: `Q1 2026`
- Value: `42`
- Unit: `%`
- Confidence: `High (90%)`
- Source URL: `https://example.com`

### Expected Result

- this entity should show `1` fact

## 4.6 Facts For `30-Day Refund Policy`

### Fact 1

- Attribute: `Refund window`
- Value: `30`
- Unit: `days`
- Confidence: `Verified (100%)`
- Source URL: `https://example.com`

### Fact 2

- Attribute: `Applies to`
- Value: `First retail order`
- Unit: leave blank
- Confidence: `Low (70%)`
- Source URL: `https://example.com`

### Expected Result

- this entity should show `2` facts

## 5. FactGuard Claims To Test

Go to `/factguard` and paste these one by one.

## 5.1 Verified Example

Paste:

`Northstar Calm Gummies contain 200 mg magnesium per serving.`

### Likely Result

- Status: `Verified`
- Match count: around `3`
- Confidence: around `87%`

Why:

- the entity name matches
- the product facts have a strong average confidence

## 5.2 Low Confidence Example

Paste:

`Wellness Innovation Award 2025 was issued by Health Product Review.`

### Likely Result

- Status: `Low Confidence`
- Match count: `1`
- Confidence: around `70%`

Why:

- that entity has one matching fact
- that fact was intentionally stored at a lower confidence

## 5.3 Another Verified Example

Paste:

`The refund window is 30 days for the first retail order.`

### Likely Result

- Status: `Verified` or `Low Confidence`
- Match count: around `2`
- Confidence: around `85%`

Why:

- both refund policy facts should match
- their average confidence is about `85%`

## 5.4 Unverified Example

Paste:

`SolarCharge Tablets won a NASA grant in 2026.`

### Likely Result

- Status: `Unverified`
- Match count: `0`
- Confidence: `0%`

Why:

- none of those words exist in your entities or facts

## 6. Good Search Tests In Entities

Go to `/entities` and try these:

### Search Test 1

- Search: `Northstar`
- Expected: `Northstar Calm Gummies` and `Northstar Focus Capsules`

### Search Test 2

- Search: `Refund`
- Expected: `30-Day Refund Policy`

### Filter Test 1

- Filter: `Product`
- Expected: the 2 product entities only

### Filter Test 2

- Filter: `Person`
- Expected: `Dr. Maya Rao`

## 7. Good Manual UI Tests

These help you confirm the app is working end to end.

### Dashboard

- confirm the stat cards update
- confirm recent entities section shows the latest created items

### Entities

- create all entities
- open one entity
- add facts
- edit one fact
- delete one fact if you want to test removal

### Entity Detail

- click a confidence badge once on a fact
- expected: after refresh, the confidence score increases

### Citations

- filter by `Government Doc`
- expected: the CDC entry appears

### Authors

- edit `Arjun Mehta` and add one more expertise area
- expected: updated chip list appears

### FactGuard

- test one verified claim, one low-confidence claim, and one unrelated claim

## 8. Important MVP Quirk

FactGuard is keyword-based, not truly semantic.

That means:

- a claim can sometimes look more correct than it really is if it shares enough words with an entity
- for a clean `unverified` result, use a claim with words that do not appear anywhere else in your data

## 9. Fastest Order To Enter Everything

If you want the smoothest path:

1. add all 4 citations
2. add both authors
3. add all 6 entities
4. open each entity and add its facts
5. go back to dashboard and confirm the counts
6. test the FactGuard claims

## 10. Short Version

If you only want the minimum useful demo:

1. create `Northstar Calm Gummies`
2. add facts:
   - `Magnesium per serving = 200 mg`
   - `Flavor = Mixed Berry`
   - `Sugar per serving = 2 g`
3. add author `Dr. Maya Rao`
4. add source `https://www.nih.gov`
5. run claim:
   - `Northstar Calm Gummies contain 200 mg magnesium per serving.`

That alone is enough to demonstrate the main idea of the app.
