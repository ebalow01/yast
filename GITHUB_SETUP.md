# 🚀 Quick GitHub Setup Guide

## Step-by-Step Instructions

### 1. Install Git (if not already installed)
- Download from: https://git-scm.com/download/win
- Run the installer with default settings
- Open a new PowerShell window

### 2. Configure Git (first time only)
```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

### 3. Run the Setup Script
```bash
# Option A: Windows Batch Script (recommended for Windows)
scripts\setup_github.bat

# Option B: Python Script (cross-platform)
python scripts\setup_github.py
```

### 4. Create GitHub Repository
1. Go to https://github.com/new
2. Repository name: `yast` or `yieldmax-analysis`
3. Description: `YieldMax ETF Multi-Ticker Analysis System`
4. Make it **Public**
5. **Don't** initialize with README (you already have one)
6. Click "Create repository"

### 5. Connect Local Repository to GitHub
Replace `YOUR_USERNAME` and `REPO_NAME` with your actual values:
```bash
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git
git branch -M main
git push -u origin main
```

### 6. Deploy Your Website

#### Option A: GitHub Pages (Easiest)
1. Go to your repository on GitHub
2. Click "Settings" tab
3. Scroll down to "Pages" section
4. Source: "Deploy from a branch"
5. Branch: `main`
6. Folder: `/ (root)`
7. Click "Save"
8. Your site will be available at: `https://YOUR_USERNAME.github.io/REPO_NAME`

#### Option B: Netlify (More Features)
1. Go to https://netlify.com
2. Sign up with your GitHub account
3. Click "New site from Git"
4. Choose your repository
5. Build settings:
   - Build command: `cd yast-react && npm run build`
   - Publish directory: `yast-react/dist`
6. Deploy!

#### Option C: Vercel (Serverless)
1. Go to https://vercel.com
2. Sign up with your GitHub account
3. Click "Import Project"
4. Select your repository
5. Root directory: `yast-react`
6. Deploy!

### 7. Set Up Automated Updates
Your GitHub Actions workflow (`.github/workflows/update-data.yml`) will:
- Run daily at 6 AM UTC
- Download fresh market data
- Generate new analysis
- Update your website automatically

### 8. Optional: Custom Domain
1. Buy a domain from Namecheap, GoDaddy, etc.
2. In your hosting platform settings, add your custom domain
3. Update DNS records to point to your hosting provider

## 📁 What Gets Published

### Your Repository Will Include:
- ✅ Python analysis code
- ✅ React web interface
- ✅ Documentation (README, guides)
- ✅ Automated data updates
- ✅ MIT License

### What's Hidden (in .gitignore):
- ❌ Raw data files (`data/` folder)
- ❌ Python cache files
- ❌ Personal API keys
- ❌ Temporary files

## 🔒 Security Notes

- Never commit API keys or personal data
- The `data/` folder is gitignored for privacy
- Only processed, aggregated results are published
- All code is public (MIT License)

## 🎯 End Result

Once complete, you'll have:
- 🌐 Public website showing your analysis
- 📊 Daily automated data updates
- 📖 Professional documentation
- 🤝 Open source contribution opportunities
- 📈 Portfolio piece for your resume

## 🆘 Need Help?

- **Git Issues**: https://git-scm.com/doc
- **GitHub Help**: https://docs.github.com
- **Deployment Issues**: See `docs/DEPLOYMENT.md`
- **Code Issues**: Create a GitHub issue in your repository

## 🎉 Success Indicators

You'll know it's working when:
- ✅ Your code is visible on GitHub
- ✅ Website loads at your chosen URL
- ✅ GitHub Actions runs successfully
- ✅ Data updates automatically
- ✅ People can star/fork your repository

Good luck with your deployment! 🚀
