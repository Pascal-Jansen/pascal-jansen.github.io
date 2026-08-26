"""Local preview server that mirrors GitHub Pages URL resolution.

GitHub Pages serves /research from research.html. python3 -m http.server does
not, so without this the extension-less links 404 in local preview only.
"""
import functools, os, sys
from http.server import SimpleHTTPRequestHandler, test


class GHPagesHandler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        local = super().translate_path(path)
        if not os.path.exists(local) and not path.endswith('/'):
            candidate = local + '.html'
            if os.path.isfile(candidate):
                return candidate
        return local

    def end_headers(self):
        # HTML is never cached so edits show up immediately, but assets cache
        # normally -- otherwise local behaviour hides caching-dependent bugs
        # (e.g. image fade-in on revisit) that users hit in production.
        if self.path.endswith('.html') or '.' not in self.path.rsplit('/', 1)[-1]:
            self.send_header('Cache-Control', 'no-store')
        else:
            self.send_header('Cache-Control', 'max-age=300')
        super().end_headers()


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 4173
    test(HandlerClass=functools.partial(GHPagesHandler, directory=os.getcwd()),
         port=port, bind='127.0.0.1')
