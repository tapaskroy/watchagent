# Security Guidelines

## Environment Variables and API Keys

### CRITICAL: Never Commit Secrets to Git

All API keys and secrets MUST be stored in `.env` files, which are already configured in `.gitignore`.

### Required API Keys

You need to obtain the following API keys:

1. **TMDB API Key** - Get from https://www.themoviedb.org/settings/api
2. **OMDB API Key** - Get from http://www.omdbapi.com/apikey.aspx
3. **Anthropic API Key** - Get from https://console.anthropic.com/

### Environment Setup for Development

1. Copy the `.env.example` files in each service directory:
   ```bash
   cp apps/api/.env.example apps/api/.env
   cp apps/web/.env.example apps/web/.env.local
   cp packages/database/.env.example packages/database/.env
   ```

2. Edit each `.env` file and add your actual API keys

3. **NEVER** commit the `.env` files

### Environment Setup for Production/AWS

For production deployments:

1. Store secrets in **AWS Systems Manager Parameter Store** or **AWS Secrets Manager**
2. Reference secrets in ECS task definitions using `secrets` configuration
3. Use IAM roles for AWS service authentication (no hardcoded credentials)

### Checking for Leaked Secrets

Before pushing to GitHub, verify no secrets are committed:

```bash
# Check git status
git status

# Search for potential API keys in staged files
git diff --cached | grep -i "api.*key\|secret\|password"

# Check if any .env files are staged (they shouldn't be)
git ls-files | grep ".env$"
```

### If You Accidentally Commit a Secret

1. **Immediately revoke/rotate the exposed API key**
2. Remove the secret from git history:
   ```bash
   # Use BFG Repo-Cleaner or git-filter-branch
   # See: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository
   ```
3. Force push the cleaned history (only if repository is not yet public)
4. Generate new API keys

## GitHub Repository Setup

When creating your public GitHub repository:

1. Ensure `.gitignore` includes all `.env` files (already configured)
2. Include `.env.example` files as templates (already created)
3. Add this `SECURITY.md` file to document security practices
4. Consider adding a `CONTRIBUTING.md` with setup instructions

## AWS Deployment Security

1. **Never** include API keys in Docker images
2. Use AWS Secrets Manager or Parameter Store for production secrets
3. Use IAM roles for service-to-service authentication
4. Enable AWS CloudTrail for audit logging
5. Use VPC for database and Redis isolation
6. Enable encryption at rest for RDS and ElastiCache
7. Use HTTPS/TLS for all public endpoints
8. Set up AWS WAF for API protection

## Recommended Security Practices

1. Rotate API keys periodically (every 90 days)
2. Use different API keys for development, staging, and production
3. Implement rate limiting (already configured)
4. Use helmet for HTTP security headers (already configured)
5. Enable CORS with specific origins only (configured in .env)
6. Monitor API usage and set up alerts for unusual activity
7. Use JWT with short expiry times (15 minutes for access tokens)
8. Implement refresh token rotation

## Security Contacts

For security issues, please contact: [your-email@example.com]
