# Aggregate Click Analytics Without Visitor Identification

Elvo Links reports click activity rather than unique visitors. The confirmed MVP retains lifetime click totals and 30 days of daily UTC aggregates, without collecting visitor IP addresses or identifying visitor data for analytics; this keeps analytics limited to the product's agreed needs instead of introducing visitor tracking.

Repeat requests and bots count. Unique-visitor reporting and historical breakdowns cannot be reconstructed from these aggregates, and expired daily data is unavailable. Analytics recording must not block redirects, so recorded totals may undercount during failures. These are deliberate trade-offs rather than guarantees of exact traffic measurement.
