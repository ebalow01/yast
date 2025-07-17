# 🚀 Netlify Setup - Step by Step Guide

## Step 1: Run the GitHub Setup Script (if you haven't already)

In PowerShell, run:
```powershell
.\scripts\setup_github.bat
```

Or if you prefer the Python version:
```powershell
python scripts\setup_github.py
```

## Step 2: Set Up Netlify

### A. Create Netlify Account
1. Go to https://netlify.com
2. Click "Sign up"
3. Choose "Sign up with GitHub"
4. Authorize Netlify to access your GitHub account

### B. Deploy Your Site
1. In Netlify dashboard, click "New site from Git"
2. Choose "GitHub" as your Git provider
3. Select your repository (e.g., `yast` or `yieldmax-analysis`)
4. Configure build settings:
   - **Build command**: `python scripts/build_web.py`
   - **Publish directory**: `yast-react/dist`
   - **Production branch**: `main`
5. Click "Deploy site"

### C. Your Site is Live!
- Netlify will assign a URL like: `https://amazing-name-123456.netlify.app`
- Build takes 2-3 minutes
- Auto-deploys when you push to GitHub

## Step 3: Configure Custom Domain (Optional)
1. In Netlify dashboard, go to Site Settings → Domain management
2. Click "Add custom domain"
3. Enter your domain (e.g., `yieldmax-analysis.com`)
4. Follow DNS configuration instructions
5. SSL certificate is automatically provisioned

## Step 4: Test Your Deployment
1. Visit your Netlify URL
2. Check that your React app loads
3. Verify data is displaying correctly
4. Test navigation between pages

## Step 5: Monitor and Maintain
- **Deploy logs**: Check Netlify dashboard for build status
- **GitHub Actions**: Monitor daily data updates
- **Performance**: Use Netlify's built-in analytics

## 🔧 Configuration Files Already Set Up:
- ✅ `netlify.toml` - Netlify configuration
- ✅ `scripts/build_web.py` - Build script
- ✅ `scripts/generate_web_data.py` - Data generation
- ✅ `.github/workflows/update-data.yml` - Automated updates

## 🎯 What Happens Next:
1. **Daily Updates**: GitHub Actions runs your analysis daily
2. **Auto-Deploy**: Netlify rebuilds when data changes
3. **Fresh Data**: Website shows latest market analysis
4. **Zero Maintenance**: Everything runs automatically

## 🚨 If Build Fails:
1. Check Netlify build logs
2. Verify Python dependencies in `requirements.txt`
3. Ensure Node.js version compatibility
4. Review `netlify.toml` configuration

Your YieldMax analysis website will be live and updating automatically! 🎉
