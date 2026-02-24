# Github API Token Limits

## 1. Does the method (HTTPS/SSH) you use to sign in with `gh auth login` affect API rate limits?

**No.**

- The GitHub CLI (`gh`) uses HTTPS and personal access tokens (PATs) for API calls, regardless of whether you use SSH or HTTPS for git operations.
- The way you authenticate for git (SSH vs HTTPS) does **not** affect the API rate limits for `gh`.

---

## 2. What is the API rate limit for authenticated users?

- For most authenticated users, the GitHub REST API rate limit is **5,000 requests per hour per user** (per token).
- Unauthenticated requests are limited to 60 per hour per IP.

---

## 3. Can you increase the API rate limit?

- **No,** for normal users, the 5,000/hour limit is fixed and cannot be increased.
- **Enterprise Cloud** customers may have higher limits for their organization’s API requests, but this is managed at the org level.
- For automation, you can use multiple tokens (from different users) to distribute load, but each user/token is still limited to 5,000/hour.

---

## 4. How to check your current rate limit

You can check your current rate limit with:

```sh
gh api rate_limit
```

or via curl:

```sh
curl -H "Authorization: token YOUR_TOKEN" https://api.github.com/rate_limit
```

---

## 5. Tips to avoid hitting the limit

- Cache results where possible.
- Avoid polling APIs in tight loops.
- Use GraphQL for more efficient queries if possible.

---

**Summary:**

- The way you log in (HTTPS/SSH) does not affect `gh` API rate limits.
- The limit is 5,000 requests/hour per user/token.
- You cannot increase this limit for a normal account.

Let me know if you want more details on rate limits or best practices for using the GitHub API!
