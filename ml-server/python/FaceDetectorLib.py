import os
import numpy as np
from PIL import Image
import matplotlib.pyplot as plt
import dlib
import collections
from typing import Union, List
import requests
import bz2


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

def resize_image(img, img_width=512, img_height=512):
    if img.mode != "RGB":
        img = img.convert("RGB")

    width, height = img.size

    if width < 1024 or height < 1024:
        raise ValueError("Image dimensions should be at least 1024x1024")

    # Calculate aspect ratio
    aspect_ratio = width / height

    # Aspect ratio of 512x512 image is 1:1
    target_aspect_ratio = 1

    if aspect_ratio == target_aspect_ratio:
        img = img.resize((img_width, img_height))
    else:
        img = cropping_and_resizing_face_images(img)
    return img
    
def detect_face_landmarks(img: Union[Image.Image, np.ndarray]):
    if isinstance(img, Image.Image):
        img = np.array(img)
    faces = []
    dets = dlib_face_detector(img)
    for d in dets:
        shape = shape_predictor(img, d)
        faces.append(np.array([[v.x, v.y] for v in shape.parts()]))
    return faces

def align_and_crop_face(img: Image.Image, landmarks: np.ndarray, output_size: int = 1024, padding: float = 0.4):
    # Convert PIL image to numpy array
    img_np = np.array(img)
    h, w, _ = img_np.shape

    # Calculate bounding box based on landmarks
    left = np.min(landmarks[:, 0])
    right = np.max(landmarks[:, 0])
    top = np.min(landmarks[:, 1])
    bottom = np.max(landmarks[:, 1])

    # Calculate width and height of the bounding box
    width = right - left
    height = bottom - top

    # Ensure padding doesn't make the box exceed the image dimensions
    # Limit padding to available space
    available_top_padding = top
    available_bottom_padding = h - bottom
    available_left_padding = left
    available_right_padding = w - right

    # If the padding is larger than available space, adjust the padding dynamically
    top = max(0, top - int(min(height * padding * 2, available_top_padding)))  # More padding above
    bottom = min(h, bottom + int(min(height * padding * 0.5, available_bottom_padding)))  # Less padding below
    left = max(0, left - int(min(width * padding, available_left_padding)))
    right = min(w, right + int(min(width * padding, available_right_padding)))

    # Ensure that we still have a valid bounding box after applying padding
    if right - left <= 0 or bottom - top <= 0:
        print("Warning: Invalid bounding box dimensions after padding.")
        return None  # Skip processing if the bounding box is invalid

    # Crop and resize the image
    cropped_img_np = img_np[top:bottom, left:right]
    cropped_img = Image.fromarray(cropped_img_np)
    aligned_img = cropped_img.resize((output_size, output_size), Image.Resampling.LANCZOS)

    return aligned_img

def cropping_and_resizing_face_images(img):  
    landmarks = detect_face_landmarks(img)
    if len(landmarks) == 0:
        raise ValueError("No faces detected in the image.")
        
    aligned_face = align_and_crop_face(img, landmarks[0])
    
    if aligned_face is None:
        raise ValueError("Failed to process image due to invalid bounding box.")

    return aligned_face

dlib_face_detector, shape_predictor = initializing_face_detector_lib()

