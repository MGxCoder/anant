"""Reference predictions to compare against the CropDoctor app.

Uses the same preprocessing as the app: RGB, resize to 224x224 (bilinear), float32 in 0..255, NO normalization
(the model's Rescaling layer does that). Prints the top 3 in the same form as the app's "Model label" line.

  pip install pillow numpy ai-edge-litert        # desktop (or: pip install tensorflow)
  python tools/reference_predict.py leaf1.jpg leaf2.jpg

In Colab, also compare with your original Keras model:
  python reference_predict.py leaf.jpg --keras /content/model.keras
"""
import argparse, json, pathlib
import numpy as np
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
ap = argparse.ArgumentParser()
ap.add_argument('images', nargs='+')
ap.add_argument('--model', default=ROOT / 'assets/models/crop_disease_model.tflite')
ap.add_argument('--classes', default=ROOT / 'src/data/class_names.json')
ap.add_argument('--keras', help='optional path to the original Keras model (.keras/.h5)')
args = ap.parse_args()

names = json.load(open(args.classes))
try:
    from ai_edge_litert.interpreter import Interpreter
except ImportError:
    from tensorflow.lite.python.interpreter import Interpreter
tfl = Interpreter(model_path=str(args.model)); tfl.allocate_tensors()
inp, out = tfl.get_input_details()[0], tfl.get_output_details()[0]
keras = None
if args.keras:
    import tensorflow as tf
    keras = tf.keras.models.load_model(args.keras)

def show(tag, probs):
    top = np.argsort(probs)[::-1][:3]
    print(f'  {tag:7s}', ' | '.join(f'#{i} {names[i]} {probs[i] * 100:.4f}%' for i in top))

for path in args.images:
    x = np.asarray(Image.open(path).convert('RGB').resize((224, 224), Image.BILINEAR), dtype=np.float32)[None]
    tfl.set_tensor(inp['index'], x); tfl.invoke()
    print(path)
    show('tflite', tfl.get_tensor(out['index'])[0])
    if keras is not None:
        show('keras', keras.predict(x, verbose=0)[0])
