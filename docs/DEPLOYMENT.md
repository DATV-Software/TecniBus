# Deployment & GitHub Secrets Setup

## GitHub Repository Secret: EXPO_TOKEN

**IMPORTANT**: This step must be done manually in GitHub's web interface.

### Steps

1. Navigate to your repository settings:
   - Go to: https://github.com/Diego31-10/tecnibus/settings/secrets/actions
   - OR: Repository → Settings → Secrets and variables → Actions

2. Click "New repository secret" button

3. Fill in the details:
   - **Name**: `EXPO_TOKEN`
   - **Value**: Get your token by running this command locally:
     ```bash
     eas secret:create --scope project
     ```
     - This will prompt you to select the project (TecniBus)
     - It will generate a token — copy the entire token value
     - Paste it into the GitHub secret value field

4. Click "Add secret"

### Why This Is Needed

The `EXPO_TOKEN` secret is used by the GitHub Actions deploy workflow (`.github/workflows/deploy.yml`) to authenticate with EAS (Expo Application Services) when deploying updates.

Without this token:
- Deploy workflow will fail with authentication error
- `eas update` command will not be able to push updates to production
- Live updates to your app will not work

### Verification

Once configured:
1. Go to `.github/workflows/deploy.yml`
2. The workflow can now access `secrets.EXPO_TOKEN`
3. Next time you merge to `main`, the deploy workflow will have permission to publish updates

### Documentation Reference

- EAS Secrets: https://docs.expo.dev/eas-update/environment-variables/
- GitHub Secrets: https://docs.github.com/en/actions/security-guides/encrypted-secrets

---

**Manual Step Required**: This cannot be automated with scripts or CLI tools — GitHub requires manual entry through the web interface for security reasons.
