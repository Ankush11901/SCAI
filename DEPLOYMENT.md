# Deployment Checklist

## Pre-Deployment

### Environment Variables
- [ ] `GOOGLE_AI_API_KEY` - Gemini API key
- [ ] `IMAGEN_API_KEY` - Google Imagen API key
- [ ] `FLUX_API_KEY` - Flux fallback API key
- [ ] `DATABASE_URL` - Turso database URL
- [ ] `DATABASE_AUTH_TOKEN` - Turso auth token
- [ ] `BETTER_AUTH_SECRET` - Auth secret (generate with `openssl rand -base64 32`)
- [ ] `BETTER_AUTH_URL` - Production URL (e.g., https://your-domain.vercel.app)

### Database
- [ ] Turso database created
- [ ] Schema migrated (`pnpm db:push`)
- [ ] Test user created and working
- [ ] Quota table initialized

### Code Quality
- [ ] `pnpm lint` passes with no errors
- [ ] `pnpm type-check` passes with no errors
- [ ] `pnpm test:run` passes all tests
- [ ] `pnpm build` completes successfully

### Security
- [ ] All API keys in environment variables (not committed)
- [ ] `.env.local` is in `.gitignore`
- [ ] CORS configured correctly
- [ ] Rate limiting enabled
- [ ] Input validation on all endpoints
- [ ] XSS prevention (HTML sanitization)

---

## Vercel Deployment

### Initial Setup
1. Connect GitHub repository to Vercel
2. Set framework preset to "Next.js"
3. Set root directory if using monorepo

### Environment Variables in Vercel
1. Go to Project Settings → Environment Variables
2. Add all environment variables from list above
3. Set for Production, Preview, and Development as needed

### Build Settings
- Build Command: `pnpm build`
- Output Directory: `.next`
- Install Command: `pnpm install`
- Node.js Version: 18.x or 20.x

### Deployment
```bash
# Via Vercel CLI
vercel --prod

# Or via Git push to main branch
git push origin main
```

---

## Post-Deployment

### Verification
- [ ] Homepage loads correctly
- [ ] Login flow works
- [ ] Article generation works
- [ ] Images generate correctly
- [ ] Validation displays properly
- [ ] Export downloads work
- [ ] Mobile responsive works
- [ ] All navigation links work

### Monitoring
- [ ] Check Vercel Analytics
- [ ] Check Vercel Logs
- [ ] Monitor error rates
- [ ] Check API response times

### Performance
- [ ] Lighthouse score > 80
- [ ] Time to First Byte < 200ms
- [ ] Largest Contentful Paint < 2.5s
- [ ] No console errors

---

## Rollback Plan

### If Issues Occur
1. Go to Vercel Dashboard → Deployments
2. Find the last working deployment
3. Click "..." menu → "Promote to Production"

### Database Rollback
- Turso supports point-in-time recovery
- Contact Turso support for database restore if needed

---

## Maintenance

### Regular Tasks
- Monitor daily quota usage
- Review error logs weekly
- Update dependencies monthly
- Rotate API keys quarterly

### Updating
```bash
# Update dependencies
pnpm update

# Check for security issues
pnpm audit

# Re-deploy
vercel --prod
```

---

## Contact

For deployment issues:
- Check Vercel Status: https://www.vercel-status.com/
- Check Turso Status: https://status.turso.tech/
- Check Google Cloud Status: https://status.cloud.google.com/
