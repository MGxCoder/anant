"""DEV ONLY: run the TFLite model on this PC so the app can be tried in Expo Go.

Expo Go cannot load native TFLite, so in Expo Go the app sends its already-preprocessed 224x224 PNG here and gets the
38 probabilities back. The installed CropDoctor APK never uses this; it runs the model on the phone.

  pip install pillow numpy ai-edge-litert
  python tools/model_server.py          # listens on port 8765 (phone and PC on the same Wi-Fi, or `adb reverse tcp:8765 tcp:8765`)
"""
import io, json, pathlib
from http.server import BaseHTTPRequestHandler, HTTPServer
import numpy as np
from PIL import Image
from ai_edge_litert.interpreter import Interpreter

ROOT = pathlib.Path(__file__).resolve().parent.parent
PORT = 8765
names = json.load(open(ROOT / 'src/data/class_names.json'))
it = Interpreter(model_path=str(ROOT / 'assets/models/crop_disease_model.tflite'))
it.allocate_tensors()
inp, out = it.get_input_details()[0], it.get_output_details()[0]


class Handler(BaseHTTPRequestHandler):
    def reply(self, code, obj):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):  # health check used by the app
        self.reply(200, {'ok': True, 'classes': len(names)})

    def do_POST(self):
        try:
            png = self.rfile.read(int(self.headers.get('Content-Length', 0)))
            im = Image.open(io.BytesIO(png))
            if im.size != (224, 224):
                return self.reply(400, {'error': f'expected 224x224, got {im.size}'})
            x = np.asarray(im.convert('RGB'), dtype=np.float32)[None]  # 0..255, no normalization (model does it)
            it.set_tensor(inp['index'], x)
            it.invoke()
            p = it.get_tensor(out['index'])[0]
            i = int(p.argmax())
            print(f'predicted #{i} {names[i]} {p[i] * 100:.2f}%')
            self.reply(200, {'probabilities': p.tolist()})
        except Exception as e:
            self.reply(400, {'error': str(e)})


print(f'CropDoctor model server on port {PORT} (Ctrl+C to stop)')
HTTPServer(('0.0.0.0', PORT), Handler).serve_forever()
