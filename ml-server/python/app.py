from flask import Flask, request, jsonify
import torch
import cv2
import numpy as np
from DiffI2I_Inference import DiffI2IManager
from S2ModelConfigurations import S2ModelConfigurations
import reuseablecustompythonfunctions as rcpf
from InferenceImageProcessor import InferenceImageProcessor

app = Flask(__name__)

# Initialize the model
manager = DiffI2IManager(S2ModelConfigurations.FaceParsing_T2_Parameters)

@app.route('/generate-face-parsing', methods=['POST'])
def generate_face_parsing():
    img_file = request.files['image']
    img = cv2.imdecode(np.frombuffer(img_file.read(), np.uint8), cv2.IMREAD_COLOR)
    processor_images = InferenceImageProcessor(512, 512)
    processed_image = processor_images.process_image(img)
    result = manager.run_Diffi2i_S2(processed_image)
    output_image = rcpf.tensor2im(result, normalize=False)
    _, buffer = cv2.imencode('.jpg', output_image)
    response_image = buffer.tobytes()
    return response_image

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000)
