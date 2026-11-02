"""Read-only development connection check; NOT pairing or task execution."""
import json, os, urllib.parse, urllib.request, urllib.error
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]/'web'
def check(base, path='/health', opener=None):
    if not base: return {'connected':False,'reason':'Kingdom not configured'}
    u=urllib.parse.urlsplit(base)
    if (u.scheme!='https' and not (u.scheme=='http' and u.hostname in ('localhost','127.0.0.1'))) or u.username or u.password or u.query or u.fragment:
        return {'connected':False,'reason':'Remote Kingdom requires HTTPS and a clean URL'}
    if not path.startswith('/') or path.startswith('//') or '?' in path or '#' in path:
        return {'connected':False,'reason':'Invalid health path'}
    try:
        req=urllib.request.Request(base.rstrip('/')+path,headers={'Accept':'application/json'})
        with (opener or urllib.request.urlopen)(req,timeout=4) as response:
            if len(response.read(16385))>16384 or response.status!=200: raise ValueError('Invalid response')
        return {'connected':True,'verification':'reachability only; pairing and compatibility unverified'}
    except (OSError, ValueError, urllib.error.URLError):
        return {'connected':False,'reason':'Kingdom health endpoint unavailable'}
class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path=='/api/kingdom/status':
            data=json.dumps(check(os.getenv('KINGDOM_BASE_URL',''),os.getenv('KINGDOM_HEALTH_PATH','/health'))).encode()
            self.send_response(200);self.send_header('Content-Type','application/json');self.send_header('Cache-Control','no-store');self.end_headers();self.wfile.write(data);return
        target=(ROOT/(self.path.lstrip('/') or 'index.html')).resolve()
        if not target.is_relative_to(ROOT.resolve()) or target.suffix not in ('.html','.css','.js') or not target.is_file():
            self.send_error(404);return
        data=target.read_bytes();self.send_response(200);self.send_header('Content-Type',{'.html':'text/html','.css':'text/css','.js':'text/javascript'}[target.suffix]);self.end_headers();self.wfile.write(data)
if __name__=='__main__':
    print('Preview: http://127.0.0.1:8765')
    ThreadingHTTPServer(('127.0.0.1',8765),Handler).serve_forever()
