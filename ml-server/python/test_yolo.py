# Test script
from PIL import Image
from FaceImageProcessor import FaceImageProcessor
from ultralytics import YOLO

# Initialize components
yolo_model = YOLO('./Resize_Model_Weights/yolov8l-face.pt')
face_processor = FaceImageProcessor(512, 512)
face_processor.model = yolo_model

# Load image
image = Image.open('Test_Image_WrongSizes/43001_2016110165902_jSsT.jpg').convert('RGB')

# Process image
processed_tensor = face_processor.prepare_image_rgb_normalized(image)
print(f"Processed tensor shape: {processed_tensor.shape}")
