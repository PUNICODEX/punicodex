export const config = {
  matcher: '/:path*',
};

export default function middleware(request) {
  const url = new URL(request.url);
  if (url.hostname === 'xn--aphrodt-27a8s.com' || url.hostname === 'aphrodītē.com') {
    url.hostname = 'xn--aphrodt-dza75a.com';
    return Response.redirect(url.toString(), 301);
  }
}
