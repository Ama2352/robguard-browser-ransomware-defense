import sys
import pickle
import pathlib
import warnings
import numpy as np

warnings.filterwarnings("ignore")

BASE = pathlib.Path(__file__).parent.parent.parent
MODEL_PATH = BASE / "models" / "best_model.pkl"
SCALER_PATH = BASE / "models" / "scaler.pkl"

with open(SCALER_PATH, "rb") as f:
    scaler = pickle.load(f)
with open(MODEL_PATH, "rb") as f:
    model = pickle.load(f)

entropy_diff     = float(sys.argv[1])
size_diff        = float(sys.argv[2])
original_entropy = float(sys.argv[3])

X = scaler.transform([[entropy_diff, size_diff, original_entropy]])
label = int(model.predict(X)[0])

print(label)
