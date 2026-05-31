export const config = {
  matcher: '/:path*',
};

export default function middleware(request) {
  const url = new URL(request.url);
  // Canonical: aphrodītē.com (macron). Redirect acute variant to macron.
  if (url.hostname === 'xn--aphrodt-dza75a.com' || url.hostname === 'aphrodítē.com') {
    url.hostname = 'xn--aphrodt-27a8s.com';
    return Response.redirect(url.toString(), 301);
  }
}
