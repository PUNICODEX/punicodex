export const config = {
  matcher: '/:path*',
};

export default function middleware(request) {
  const url = new URL(request.url);
  if (url.hostname === 'xn--apolln-fgb.com' || url.hostname === 'apollōn.com') {
    url.hostname = 'xn--aplln-1ta64d.com';
    return Response.redirect(url.toString(), 301);
  }
}
