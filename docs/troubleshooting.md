# Troubleshooting

## "Network request failed" errors on startup

**Check Supabase first.** Free tier projects pause after 7 days of inactivity.

1. Go to https://supabase.com/dashboard
2. If project shows "Paused", click Restore
3. Wait 1-3 minutes for restore to complete
4. Restart Expo: `npx expo start --clear`

## Verify Supabase is reachable

```bash
ping qwotlnuhszatzifasngg.supabase.co
```

If "Unknown host" → project is paused or deleted.
