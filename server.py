from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

class Handler(SimpleHTTPRequestHandler):
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        ".mp4": "video/mp4",
        ".webm": "video/webm",
        ".js": "text/javascript",
        ".css": "text/css",
    }

if __name__ == "__main__":
    ThreadingHTTPServer(("localhost", 8000), Handler).serve_forever()
