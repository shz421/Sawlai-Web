"""Local static preview with the same clean page URLs as sawlai.com."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit
import argparse


class PreviewHandler(SimpleHTTPRequestHandler):
    def rewrite_route(self):
        parts = urlsplit(self.path)
        routes = {"/about-us", "/readers", "/reader", "/privacy-policy", "/dmca"}
        if parts.path.rstrip("/") in routes:
            page = parts.path.rstrip("/") + ".html"
            self.path = urlunsplit((parts.scheme, parts.netloc, page, parts.query, parts.fragment))

    def do_GET(self):
        self.rewrite_route()
        super().do_GET()

    def do_HEAD(self):
        self.rewrite_route()
        super().do_HEAD()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8001)
    args = parser.parse_args()
    handler = partial(PreviewHandler, directory=str(Path(__file__).resolve().parent))
    with ThreadingHTTPServer(("127.0.0.1", args.port), handler) as server:
        print(f"Sawlai preview: http://127.0.0.1:{args.port}/", flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass
