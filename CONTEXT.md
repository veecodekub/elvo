# Elvo Links

Elvo Links is Elvo's URL shortening product. It gives individuals short links, downloadable QR codes, and click analytics.

## Language

**Short Link**:
A public URL owned by one account that forwards visitors to a destination URL.
_Avoid_: custom link, alias

**Link Code**:
The system-generated identifier in a short link's path. Owners cannot choose or change it.
_Avoid_: custom slug, username

**Destination URL**:
The editable web address a short link forwards visitors to.
_Avoid_: original URL (the destination can change)

**Link Title**:
An optional owner-provided name for organizing a short link; it is not part of the public URL.
_Avoid_: slug

**Owner**:
The account that created and manages a short link.
_Avoid_: visitor

**Visitor**:
A person or automated client opening a public short link, without needing an account.
_Avoid_: unique user (visitors are not identified)

**Disabled Link**:
A short link its owner has switched off; the owner may enable it again unless it is suspended.
_Avoid_: deleted link

**Suspended Link**:
A short link blocked by an administrator, either directly or through suspension of its owner's account. The owner cannot lift the suspension.
_Avoid_: disabled link

**Click**:
An opening of a short link that receives a successful redirect response, including repeat openings and automated traffic. It does not prove that the destination loaded.
_Avoid_: unique visitor, page view

**Total Clicks**:
The recorded click count across a short link's lifetime.
_Avoid_: visitor count

**Daily Clicks**:
The recorded click count for a short link on a UTC calendar date.
_Avoid_: local-day clicks

**Link QR Code**:
A downloadable visual encoding of the short link, retaining the same URL when its destination changes.
