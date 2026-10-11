export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    if (pathname.startsWith('/api/admin/orbit/')) return handleOrbitAdmin(request, env);
    // Non-SEO routes, including login, home and admin, use the original assets.
    if (!(pathname in documents) && !(pathname in aliases) && pathname !== '/sitemap.xml') {
      return env.ASSETS.fetch(request);
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method Not Allowed', {status:405,headers:{Allow:'GET, HEAD'}});
    }
    const preview = url.hostname !== 'showpayy.com' && url.hostname !== 'www.showpayy.com';
    const headers = new Headers({
      'X-Content-Type-Options':'nosniff',
      'Referrer-Policy':'strict-origin-when-cross-origin',
      'X-Robots-Tag':preview ? 'noindex, nofollow' : 'index, follow',
      'Cache-Control':'public, max-age=0, must-revalidate',
    });
    if (pathname in aliases) {
      headers.set('Location', `${aliases[pathname]}${url.search}`);
      return new Response(null, {status:301,headers});
    }
    const isSitemap = pathname === '/sitemap.xml';
    headers.set('Content-Type', isSitemap ? 'application/xml; charset=utf-8' : 'text/html; charset=utf-8');
    if (!isSitemap) headers.set('Link', `<https://showpayy.com${pathname}>; rel="canonical"`);
    return new Response(request.method === 'HEAD' ? null : isSitemap ? sitemap : documents[pathname], {status:200,headers});
  },
};
