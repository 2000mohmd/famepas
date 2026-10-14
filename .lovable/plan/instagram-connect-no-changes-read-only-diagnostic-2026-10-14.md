# Instagram connect: no changes (read-only diagnostic)

You asked for a read-only check, so nothing will be changed. If you approve, nothing gets built. This is only a record of what the logs showed for the 18:43 UTC connect attempt.

## What the logs show
- Two connect calls arrived at the same moment. The second was refused with "This authorization code has been used", so the same Instagram code was used twice.
- The first call got a short-term token from Instagram. After that, every call to Instagram failed with the same refusal (IGApiException, code 100, "Unsupported request - method type: get"). That includes the step that turns it into a long-term token, tried three ways, and the step that reads the user's profile.

## Suggested next step (needs your OK first)
1. Find out why Instagram refuses everything, including reading the profile, even right after giving out the token.
2. Stop the same connect code from being used twice.
