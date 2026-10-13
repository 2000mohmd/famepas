# Architecture rules
- Serve the supplied public marketing design in an isolated same-origin iframe under /website, while retaining React authentication and dashboard routes, so uploaded styles cannot affect the app.
- Load homepage category names and available covers through the existing public categories query and origin-checked iframe messages, so admin data remains authoritative.
- Keep transformed WebP website media locally alongside asset pointers because the sandbox asset endpoint currently serves HTML rather than image bytes.
- Scope venue workspace presentation under `.venue-workspace` with its own semantic tokens; other roles and public pages must retain their themes.