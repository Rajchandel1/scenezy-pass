SCENEZY ROUTING + DYNAMIC SITEMAP FIX

IMPORTANT BEFORE DEPLOY:
1. DELETE the old physical sitemap.xml file from your project/repository.
   This is required because Vercel gives filesystem files precedence over rewrites.
2. Replace index.html with the included index.html.
3. Add api/sitemap.js.
4. Replace/add vercel.json at project root.
5. robots.txt can remain as-is; included copy is equivalent.
6. Push to Vercel.

WHY IMAGES BROKE ON /events/... REFRESH:
The previous index used relative asset paths such as ./scenezy-logo.png and
./garba_golden_bg.jpg. On /events/dholki they resolve under /events/.
This version uses root-relative URLs such as /scenezy-logo.png, so they work
from every route.

AFTER DEPLOY TEST:
https://scenezy.in/events/dholki
- Open directly
- Refresh
- Go back home
- Logo/background should remain visible

https://scenezy.in/sitemap.xml
- Must NOT show only the old homepage entry.
- It should include homepage + 3 Ahmedabad landing pages + visible Supabase events.

Do not add a static sitemap.xml again. /sitemap.xml is now served dynamically
through /api/sitemap by Vercel.
