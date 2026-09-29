# SPDX-License-Identifier: MPL-2.0
"""Local-only HTTP/WebSocket security regression tests; standard library only."""
import base64
import http.client
import json
import os
import socket
import struct
import threading
import time
import unittest
import decklab_host as host


class Peer:
    def __init__(self, test, *, origin=None, authority=None, version='13', key=None, extra=None):
        self.socket = socket.create_connection(('127.0.0.1', test.port), timeout=3)
        self.file = self.socket.makefile('rb')
        test.peers.append(self)
        headers = [f'Host: {authority or test.authority}', 'Upgrade: websocket', 'Connection: keep-alive, Upgrade',
                   f'Sec-WebSocket-Version: {version}', f'Sec-WebSocket-Key: {key or base64.b64encode(os.urandom(16)).decode()}']
        if origin is not None:
            headers.append('Origin: ' + origin)
        if extra:
            headers.extend(extra)
        self.socket.sendall(('GET / HTTP/1.1\r\n'+'\r\n'.join(headers)+'\r\n\r\n').encode())
        self.status = int(self.file.readline().split()[1])
        while self.file.readline() not in (b'\r\n', b''):
            pass

    def send(self, value, *, opcode=1, final=True, masked=True):
        payload = value if isinstance(value, bytes) else json.dumps(value).encode()
        first = opcode | (0x80 if final else 0)
        maskbit = 0x80 if masked else 0
        n = len(payload)
        header = bytes([first, maskbit | n]) if n < 126 else bytes([first, maskbit | 126])+struct.pack('!H', n) if n < 65536 else bytes([first, maskbit | 127])+struct.pack('!Q', n)
        mask = os.urandom(4) if masked else b''
        data = bytes(b ^ mask[i % 4] for i,b in enumerate(payload)) if masked else payload
        self.socket.sendall(header + mask + data)

    def receive(self):
        first = self.file.read(2)
        if len(first) != 2:
            return None, b''
        n = first[1] & 127
        if n == 126:
            n = struct.unpack('!H',self.file.read(2))[0]
        elif n == 127:
            n = struct.unpack('!Q',self.file.read(8))[0]
        return first[0] & 15, self.file.read(n)

    def message(self):
        opcode, data = self.receive()
        assert opcode == 1, (opcode, data)
        return json.loads(data)

    def close(self):
        try:
            self.socket.shutdown(socket.SHUT_RDWR)
        except OSError:
            pass
        self.file.close()
        self.socket.close()


class CompanionSecurity(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = host.ThreadingHTTPServer(('127.0.0.1',0),host.DeckLabHandler)
        cls.port = cls.server.server_port
        cls.authority = f'127.0.0.1:{cls.port}'
        cls.origin = 'http://' + cls.authority
        cls.thread = threading.Thread(target=cls.server.serve_forever,daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown();cls.server.server_close();cls.thread.join(3)

    def setUp(self):
        self.peers=[]

    def tearDown(self):
        for p in self.peers:
            p.close()
        deadline=time.monotonic()+2
        while (host.browser_clients or host.plugin_clients) and time.monotonic()<deadline:
            time.sleep(.01)
        self.assertFalse(host.browser_clients or host.plugin_clients, 'Connection cleanup failed')

    def request(self,path='/',headers=None,method='GET'):
        c=http.client.HTTPConnection('127.0.0.1',self.port,timeout=3)
        try:
            c.request(method,path,headers=headers or {})
            r=c.getresponse();return r.status,dict(r.getheaders()),r.read()
        finally:
            c.close()

    def closed(self,p,code=1008):
        opcode,data=p.receive();self.assertEqual(opcode,8);self.assertEqual(struct.unpack('!H',data[:2])[0],code)

    def test_local_http_and_head(self):
        for method in ['GET','HEAD']:
            status,headers,_=self.request(headers={'Host':f'localhost:{self.port}'},method=method)
            self.assertEqual(status,200);self.assertEqual(headers['X-Frame-Options'],'DENY')
            self.assertEqual(headers['Cache-Control'],'no-store')

    def test_rebinding_and_foreign_origins_rejected(self):
        for origin in ['https://example.invalid','null',f'http://127.0.0.1:{self.port+1}',f'https://localhost:{self.port}',self.origin+'.evil.invalid']:
            with self.subTest(origin=origin):
                self.assertEqual(Peer(self,origin=origin).status,403)
                self.assertEqual(self.request(headers={'Origin':origin})[0],403)
        for authority in ['example.invalid',self.authority+'.evil.invalid',f'127.0.0.1:{self.port+1}','localhost']:
            self.assertEqual(Peer(self,authority=authority).status,403)
            self.assertEqual(self.request(headers={'Host':authority},method='HEAD')[0],403)

    def test_duplicate_security_headers_and_fetch_metadata(self):
        self.assertEqual(Peer(self,origin=self.origin,extra=['Origin: https://example.invalid']).status,403)
        self.assertEqual(Peer(self,extra=['Host: example.invalid']).status,403)
        self.assertEqual(self.request(headers={'Sec-Fetch-Site':'cross-site'})[0],403)

    def test_hidden_files_traversal_and_listing(self):
        for path in ['/.git/config','/.env','/.github/ISSUE_TEMPLATE/config.yml','/%2e%2e/BUILD.txt','/..%5cBUILD.txt','/assets/']:
            self.assertEqual(self.request(path)[0],404,path)
        self.assertEqual(self.request('/BUILD.txt')[0],200)
        self.assertEqual(self.request('/assets/elgato/plus-black.png')[0],200)

    def test_handshake_validation(self):
        self.assertEqual(Peer(self,version='12').status,400)
        self.assertEqual(Peer(self,key='invalid').status,400)
        self.assertEqual(Peer(self,key=base64.b64encode(b'short').decode()).status,400)

    def test_browser_and_native_plugin_round_trip(self):
        ui=Peer(self,origin=self.origin);self.assertEqual(ui.status,101)
        ui.send({'event':'decklabBrowserRegister','uuid':'test-ui'})
        self.assertFalse(ui.message()['autoLaunchEnabled'])
        plugin=Peer(self);plugin.send({'event':'registerPlugin','uuid':'com.decklab.test'})
        self.assertEqual(ui.message()['type'],'pluginRegistered')
        plugin.send({'event':'getSettings','context':'one','id':'request-1'})
        self.assertEqual(ui.message()['message']['id'],'request-1')
        ui.send({'__decklabControl':True,'type':'sendToPlugin','message':{'event':'didReceiveSettings','id':'request-1','payload':{'settings':{'value':9}}}})
        self.assertEqual(plugin.message()['payload']['settings']['value'],9)
        ui.send({'__decklabControl':True,'type':'launchPlugin'})
        self.assertFalse(ui.message()['ok'])

    def test_localhost_alias(self):
        p=Peer(self,origin=f'http://localhost:{self.port}')
        p.send({'event':'decklabBrowserRegister','uuid':'alias'})
        self.assertEqual(p.message()['type'],'registered')

    def test_registration_role_separation(self):
        cases=[(None,{'event':'decklabBrowserRegister','uuid':'forged-ui'}),
               (self.origin,{'event':'registerPlugin','uuid':'forged-plugin'}),
               (None,{'event':'setSettings','uuid':'not-registered'}),
               (None,{'event':'registerPlugin','uuid':''}),
               (None,{'event':'registerPlugin','uuid':42}),
               (None,{'event':'registerPlugin','uuid':'x'*257})]
        for origin,packet in cases:
            p=Peer(self,origin=origin);p.send(packet);self.closed(p)

    def test_masking_and_size_limits(self):
        p=Peer(self);p.send({'event':'registerPlugin','uuid':'unmasked'},masked=False);self.closed(p,1002)
        p=Peer(self);p.socket.sendall(bytes([0x81,0xff])+struct.pack('!Q',host.MAX_WS_MESSAGE+1));self.closed(p,1009)

    def test_invalid_utf8_json_and_non_object(self):
        for payload,code in [(b'\xff',1007),(b'broken-json',1007),(b'[]',1008)]:
            p=Peer(self);p.send(payload);self.closed(p,code)

    def test_fragmented_text_and_ping(self):
        p=Peer(self,origin=self.origin)
        packet=json.dumps({'event':'decklabBrowserRegister','uuid':'fragmented'}).encode()
        p.send(packet[:20],final=False);p.send(b'ping',opcode=9)
        self.assertEqual(p.receive(),(10,b'ping'))
        p.send(packet[20:],opcode=0)
        self.assertEqual(p.message()['type'],'registered')

    def test_fragment_total_limit_and_unexpected_continuation(self):
        old=host.MAX_WS_MESSAGE
        try:
            host.MAX_WS_MESSAGE=64
            p=Peer(self);p.send(b'x'*40,final=False);p.send(b'y'*30,opcode=0);self.closed(p,1009)
        finally:
            host.MAX_WS_MESSAGE=old
        p=Peer(self);p.send(b'x',opcode=0);self.closed(p,1002)


if __name__=='__main__':
    unittest.main(verbosity=2)
