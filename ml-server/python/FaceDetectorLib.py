import os
import numpy as np
from PIL import Image
import matplotlib.pyplot as plt
import dlib
import collections
from typing import Union, List
import requests
import bz2
import cv2


def download_dlib_shape_predictor(predictor_path: str = "shape_predictor_68_face_landmarks.dat"):
    if not os.path.isfile(predictor_path):
        model_file = "shape_predictor_68_face_landmarks.dat.bz2"
        url = f"http://dlib.net/files/{model_file}"
        print(f"Downloading {model_file}...")
        response = requests.get(url, stream=True)
        with open(model_file, 'wb') as f:
            f.write(response.content)
        print(f"Extracting {model_file}...")
        with bz2.BZ2File(model_file) as fr, open(predictor_path, 'wb') as fw:
            fw.write(fr.read())

def display_facial_landmarks(img: Image, landmarks: List[np.ndarray], fig_size=[15, 15]):
    plot_style = dict(marker='o', markersize=4, linestyle='-', lw=2)
    pred_type = collections.namedtuple('prediction_type', ['slice', 'color'])
    pred_types = {
        'face': pred_type(slice(0, 17), (0.682, 0.780, 0.909, 0.5)),
        'eyebrow1': pred_type(slice(17, 22), (1.0, 0.498, 0.055, 0.4)),
        'eyebrow2': pred_type(slice(22, 27), (1.0, 0.498, 0.055, 0.4)),
        'nose': pred_type(slice(27, 31), (0.345, 0.239, 0.443, 0.4)),
        'nostril': pred_type(slice(31, 36), (0.345, 0.239, 0.443, 0.4)),
        'eye1': pred_type(slice(36, 42), (0.596, 0.875, 0.541, 0.3)),
        'eye2': pred_type(slice(42, 48), (0.596, 0.875, 0.541, 0.3)),
        'lips': pred_type(slice(48, 60), (0.596, 0.875, 0.541, 0.3)),
        'teeth': pred_type(slice(60, 68), (0.596, 0.875, 0.541, 0.4))
    }

    fig = plt.figure(figsize=fig_size)
    ax = fig.add_subplot(1, 1, 1)
    ax.imshow(img)
    ax.axis('off')

    for face in landmarks:
        for pred_type in pred_types.values():
            ax.plot(
                face[pred_type.slice, 0],
                face[pred_type.slice, 1],
                color=pred_type.color, **plot_style
            )
    plt.show()

def initializing_face_detector_lib():
    download_dlib_shape_predictor()
    global dlib_face_detector, shape_predictor
    dlib_face_detector = dlib.get_frontal_face_detector()
    shape_predictor_path = "shape_predictor_68_face_landmarks.dat"
    shape_predictor = dlib.shape_predictor(shape_predictor_path)
    return dlib_face_detector, shape_predictor

def detect_face_landmarks(img: Union[Image.Image, np.ndarray]):
    if isinstance(img, Image.Image):
        img = np.array(img)
    faces = []
    dets = dlib_face_detector(img)
    for d in dets:
        shape = shape_predictor(img, d)
        faces.append(np.array([[v.x, v.y] for v in shape.parts()]))
    return faces



def generate_feature_masks(img: np.ndarray):
    """
    Generate masks for specific features based on facial landmarks.

    Parameters:
        img (np.ndarray): Input image as a numpy array.

    Returns:
        dict: A dictionary of binary masks for each feature.
    """
 

    # Ensure image is uint8
    if img.dtype != np.uint8:
        img = (img * 255).astype(np.uint8)

    # Ensure image is RGB
    if len(img.shape) == 2:  # Grayscale image
        img = cv2.cvtColor(img, cv2.COLOR_GRAY2RGB)
    elif img.shape[2] != 3:
        raise ValueError("Input image must be RGB or Grayscale.")

 
    faces = detect_face_landmarks(img)
    if not faces:
        raise ValueError("No faces detected.")


    landmarks = faces[0]

    feature_masks = {
        "l_eye": np.zeros(img.shape[:2], dtype=np.uint8),
        "r_eye": np.zeros(img.shape[:2], dtype=np.uint8),
        "l_brow": np.zeros(img.shape[:2], dtype=np.uint8),
        "r_brow": np.zeros(img.shape[:2], dtype=np.uint8),
        "nose": np.zeros(img.shape[:2], dtype=np.uint8),
        "mouth": np.zeros(img.shape[:2], dtype=np.uint8),
    }


    cv2.fillPoly(feature_masks["l_eye"], [landmarks[36:42]], 255)  # Left eye
    cv2.fillPoly(feature_masks["r_eye"], [landmarks[42:48]], 255)  # Right eye

    cv2.fillPoly(feature_masks["nose"], [landmarks[27:36]], 255)  # Nose

    cv2.fillPoly(feature_masks["mouth"], [landmarks[48:60]], 255)  # Outer lips
    cv2.fillPoly(feature_masks["mouth"], [landmarks[60:68]], 255)  # Inner lips

    return feature_masks

dlib_face_detector, shape_predictor = initializing_face_detector_lib()

