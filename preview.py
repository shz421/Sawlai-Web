import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit


class PreviewHandler(SimpleHTTPRequestHandler):
    routes = {"/about-us", "/readers", "/reader", "/privacy-policy", "/dmca"}

    def rewrite_route(self):
        parts = urlsplit(self.path)
        route = parts.path.rstrip("/")
        if route in self.routes:
            self.path = urlunsplit((parts.scheme, parts.netloc, route + ".html", parts.query, parts.fragment))

    def do_GET(self):
        self.rewrite_route()
        super().do_GET()

    def do_HEAD(self):
        self.rewrite_route()
        super().do_HEAD()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Serve Sawlai on the local network")
    parser.add_argument("--port", type=int, default=8765)
    args = parser.parse_args()
    handler = partial(PreviewHandler, directory=str(Path(__file__).resolve().parent))
    with ThreadingHTTPServer(("0.0.0.0", args.port), handler) as server:
        print(f"Sawlai preview listening on port {args.port}", flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass
